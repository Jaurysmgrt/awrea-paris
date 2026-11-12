/**
 * Moteur de la synchronisation avec Google Agenda : jeton d'accès, connexion, création, mise à
 * jour et retrait des événements, moments occupés. Stockage, rendez-vous et `fetch` lui sont
 * donnés (lib/google-agenda/index.ts en production, de faux en tests : tests/unit/google-agenda.test.ts).
 *
 * Jamais de doublon : l'identifiant de l'événement est choisi par le site et gardé sur le
 * rendez-vous avant le premier envoi ; un nouvel essai le retrouve (création refusée « déjà
 * existant » : mise à jour) au lieu d'en créer un second. Déplacement ou changement d'un rendez-vous :
 * mise à jour de l'événement (son empreinte a changé). Annulation : l'événement est supprimé.
 */
import {
  ErreurGoogle,
  GOOGLE,
  PORTEE,
  chiffrer,
  corpsEvenement,
  dechiffrer,
  echangerCode,
  empreinte,
  gesteGoogle,
  idEvenement,
  messageAgenda,
  plagesOccupees,
  rafraichir,
  revoquer,
  type ConfigGoogle,
  type LienGoogle,
  type RendezVousGoogle,
} from "./regles";

type Fetch = typeof fetch;

/** Connexion gardée côté serveur seulement (jamais envoyée au navigateur). */
export interface ConnexionGoogle {
  etat: "connecte" | "a-reconnecter";
  /** jeton de rafraîchissement, chiffré (AES-256-GCM) */
  jeton?: string;
  /** date de la connexion */
  le: string;
  /** compte de l'Atelier qui a connecté */
  par: string;
  /** nom de l'agenda principal (l'adresse du compte Google, d'ordinaire) */
  calendrier?: string;
  /** fuseau de l'agenda */
  fuseau?: string;
  /** pourquoi il faut reconnecter */
  erreur?: string;
}

export interface DepotRendezVous {
  lister(): Promise<RendezVousGoogle[]>;
  /** garde le lien Google d'un rendez-vous (relu et réécrit sous verrou) */
  noter(id: string, lien: LienGoogle): Promise<void>;
}

export interface CoffreGoogle {
  lire(): Promise<ConnexionGoogle | null>;
  ecrire(c: ConnexionGoogle | null): Promise<void>;
  /** verrou court par rendez-vous ; renvoie de quoi le rendre, ou null s'il est déjà pris */
  verrou?(cle: string): Promise<(() => Promise<void>) | null>;
}

export interface MoteurOptions {
  config: ConfigGoogle;
  /** secret du chiffrement du jeton (clé dédiée, ou secret des sessions) */
  secret: string;
  depot: DepotRendezVous;
  coffre: CoffreGoogle;
  /** intitulé du rendez-vous (« Appel vidéo avec la créatrice ») */
  libelle(a: RendezVousGoogle): string;
  fetch?: Fetch;
  maintenant?: () => Date;
}

export interface Bilan {
  connecte: boolean;
  aReconnecter: boolean;
  faits: number;
  echecs: number;
  erreur?: string;
}

/** au plus tant de rendez-vous par passage (temps d'exécution borné) */
const PAR_PASSAGE = 40;

export function moteurGoogle(o: MoteurOptions) {
  const f: Fetch = o.fetch ?? ((...args) => fetch(...args));
  const now = () => o.maintenant?.() ?? new Date();
  let cache: { jeton: string; exp: number } | null = null;

  /** Jeton d'accès valable ; un accès retiré chez Google fait passer la connexion à « à reconnecter ». */
  async function jetonAcces(): Promise<string> {
    if (cache && cache.exp > now().getTime() + 60_000) return cache.jeton;
    const c = await o.coffre.lire();
    if (!c?.jeton || c.etat !== "connecte") throw new ErreurGoogle("Google Agenda n’est pas connecté.", { code: "deconnecte", revoque: c?.etat === "a-reconnecter" });
    const refresh = dechiffrer(c.jeton, o.secret);
    if (!refresh) {
      const erreur = "La clé de chiffrement a changé : reconnectez Google Agenda.";
      await o.coffre.ecrire({ ...c, etat: "a-reconnecter", jeton: undefined, erreur });
      throw new ErreurGoogle(erreur, { code: "cle", revoque: true });
    }
    try {
      const t = await rafraichir(o.config, refresh, f);
      cache = { jeton: t.accessToken, exp: now().getTime() + t.expiresIn * 1000 };
      // Google peut donner un nouveau jeton de rafraîchissement : il remplace l'ancien
      if (t.refreshToken && t.refreshToken !== refresh) await o.coffre.ecrire({ ...c, jeton: chiffrer(t.refreshToken, o.secret) });
      return t.accessToken;
    } catch (e) {
      if (e instanceof ErreurGoogle && e.revoque) await o.coffre.ecrire({ ...c, etat: "a-reconnecter", jeton: undefined, erreur: e.message });
      throw e;
    }
  }

  /** Appel à l'API ; un jeton refusé (401) est renouvelé une fois. */
  async function api(method: string, chemin: string, corps?: unknown): Promise<Response> {
    for (let essai = 0; ; essai++) {
      const jeton = await jetonAcces();
      const r = await f(`${GOOGLE.evenements}${chemin}`, {
        method,
        headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { "Content-Type": "application/json" } : {}) },
        body: corps ? JSON.stringify(corps) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);
      if (!r) throw new ErreurGoogle("Google Agenda ne répond pas pour l’instant. Nouvel essai bientôt.", { code: "reseau" });
      if (r.status !== 401 || essai > 0) return r;
      cache = null;
    }
  }

  const refuse = (r: Response) => new ErreurGoogle(messageAgenda(r.status), { statut: r.status, code: "agenda" });
  const iso = () => now().toISOString();

  /** Envoie un rendez-vous chez Google (création, mise à jour ou retrait) ; garde le lien à chaque étape. */
  async function traiter(a: RendezVousGoogle): Promise<"fait" | "rien"> {
    const libelle = o.libelle(a);
    const geste = gesteGoogle(a, libelle, now());
    if (!geste) return "rien";
    let lien: LienGoogle = a.google ?? { eventId: idEvenement(a.id) };
    // l'identifiant est gardé avant tout envoi : un nouvel essai retrouve le même événement
    if (!a.google) await o.depot.noter(a.id, lien);
    try {
      if (geste === "retirer") {
        const r = await api("DELETE", `/${lien.eventId}?sendUpdates=none`);
        // déjà supprimé dans Google : rien de plus à faire
        if (!r.ok && r.status !== 404 && r.status !== 410) throw refuse(r);
        await o.depot.noter(a.id, { ...lien, retire: true, erreur: undefined, essai: undefined, le: iso() });
        return "fait";
      }
      const corps = corpsEvenement(a, libelle);
      const creer = async () => {
        const r = await api("POST", "?sendUpdates=none", { id: lien.eventId, ...corps });
        // 409 : l'événement existe déjà (essai précédent dont la réponse s'est perdue)
        if (!r.ok && r.status !== 409) throw refuse(r);
        return r.ok;
      };
      let fait = !lien.cree && (await creer());
      if (!fait) {
        const r = await api("PUT", `/${lien.eventId}?sendUpdates=none`, corps);
        if (r.ok) fait = true;
        else if (r.status === 404 || r.status === 410) {
          // supprimé à la main dans Google alors que le rendez-vous tient toujours : un nouvel
          // événement, sous un nouvel identifiant gardé avant l'envoi
          const n = (lien.n ?? 0) + 1;
          lien = { eventId: idEvenement(a.id, n), n };
          await o.depot.noter(a.id, lien);
          if (!(await creer())) {
            const r2 = await api("PUT", `/${lien.eventId}?sendUpdates=none`, corps);
            if (!r2.ok) throw refuse(r2);
          }
        } else throw refuse(r);
      }
      await o.depot.noter(a.id, { ...lien, cree: true, retire: undefined, empreinte: empreinte(a, libelle), le: iso(), erreur: undefined, essai: undefined });
      return "fait";
    } catch (e) {
      const erreur = e instanceof ErreurGoogle ? e.message : "Google Agenda n’a pas répondu comme prévu.";
      await o.depot.noter(a.id, { ...lien, erreur, essai: iso() }).catch(() => {});
      throw e;
    }
  }

  /** Un rendez-vous, sous verrou (deux envois simultanés ne créent jamais deux événements). */
  async function avecVerrou(a: RendezVousGoogle): Promise<"fait" | "rien" | "occupe"> {
    const rendre = o.coffre.verrou ? await o.coffre.verrou(`agenda-google:verrou:${a.id}`) : async () => {};
    if (!rendre) return "occupe";
    try {
      // relu sous verrou : un autre passage vient peut-être de le traiter
      const frais = (await o.depot.lister()).find((x) => x.id === a.id) ?? a;
      return await traiter(frais);
    } finally {
      await rendre();
    }
  }

  /** Synchronise un rendez-vous, ou tous ceux qui attendent (passage du matin, bouton Réessayer). */
  async function synchroniser(id?: string): Promise<Bilan> {
    const c = await o.coffre.lire();
    const bilan: Bilan = { connecte: c?.etat === "connecte", aReconnecter: c?.etat === "a-reconnecter", faits: 0, echecs: 0 };
    if (!bilan.connecte) return bilan;
    const tous = await o.depot.lister();
    const liste = tous.filter((a) => (!id || a.id === id) && gesteGoogle(a, o.libelle(a), now())).slice(0, PAR_PASSAGE);
    for (const a of liste) {
      try {
        if ((await avecVerrou(a)) === "fait") bilan.faits++;
      } catch (e) {
        bilan.echecs++;
        bilan.erreur = e instanceof ErreurGoogle ? e.message : "Google Agenda n’a pas répondu comme prévu.";
        if (e instanceof ErreurGoogle && (e.revoque || e.code === "deconnecte")) {
          bilan.connecte = false;
          bilan.aReconnecter = true;
          break;
        }
      }
    }
    return bilan;
  }

  /**
   * Retour de Google : échange du code (avec le vérificateur PKCE), contrôle de l'autorisation
   * donnée, lecture du nom et du fuseau de l'agenda, jeton de rafraîchissement gardé chiffré.
   * L'ancien jeton n'est pas révoqué : chez Google, révoquer retire tout l'accès du site, y compris
   * celui qui vient d'être donné.
   */
  async function connecter(opts: { code: string; verifier: string; redirectUri: string; par: string }): Promise<ConnexionGoogle> {
    const t = await echangerCode(o.config, { code: opts.code, verifier: opts.verifier, redirectUri: opts.redirectUri }, f);
    if (!t.scope.split(/\s+/).includes(PORTEE)) throw new ErreurGoogle("L’autorisation de gérer les événements n’a pas été donnée. Recommencez en la cochant chez Google.", { code: "portee" });
    if (!t.refreshToken) throw new ErreurGoogle("Google n’a pas donné d’accès durable. Recommencez la connexion.", { code: "sans-jeton" });
    cache = { jeton: t.accessToken, exp: now().getTime() + t.expiresIn * 1000 };
    let infos: { summary?: string; timeZone?: string } = {};
    const r = await f(`${GOOGLE.evenements}?maxResults=1&fields=summary,timeZone`, { headers: { Authorization: `Bearer ${t.accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (r?.ok) infos = (await r.json().catch(() => ({}))) as typeof infos;
    const connexion: ConnexionGoogle = { etat: "connecte", jeton: chiffrer(t.refreshToken, o.secret), le: iso(), par: opts.par, calendrier: infos.summary || undefined, fuseau: infos.timeZone || undefined };
    await o.coffre.ecrire(connexion);
    return connexion;
  }

  /** Déconnexion : l'accès est retiré chez Google, puis le jeton est effacé du site, dans tous les cas. */
  async function deconnecter(): Promise<{ revoque: boolean }> {
    const c = await o.coffre.lire();
    const refresh = c?.jeton ? dechiffrer(c.jeton, o.secret) : null;
    const revoque = refresh ? await revoquer(refresh, f) : true;
    await o.coffre.ecrire(null);
    cache = null;
    return { revoque };
  }

  /** Moments déjà pris dans l'agenda Google, de maintenant à `jours` jours (hors rendez-vous du site). */
  async function occupations(jours: number): Promise<{ start: number; end: number }[]> {
    const debut = now();
    const fin = new Date(debut.getTime() + jours * 86_400_000);
    const propres = new Set((await o.depot.lister()).map((a) => a.google?.eventId).filter((x): x is string => Boolean(x)));
    const out: { start: number; end: number }[] = [];
    let page: string | undefined;
    for (let i = 0; i < 5; i++) {
      const p = new URLSearchParams({
        timeMin: debut.toISOString(),
        timeMax: fin.toISOString(),
        singleEvents: "true",
        maxResults: "2500",
        // seulement les heures : ni titre, ni description, ni invités
        fields: "nextPageToken,items(id,status,transparency,start,end,attendees(self,responseStatus))",
      });
      if (page) p.set("pageToken", page);
      const r = await api("GET", `?${p.toString()}`);
      if (!r.ok) throw refuse(r);
      const json = (await r.json().catch(() => ({}))) as { items?: Parameters<typeof plagesOccupees>[0]; nextPageToken?: string };
      out.push(...plagesOccupees(json.items ?? [], propres));
      page = json.nextPageToken;
      if (!page) break;
    }
    return out;
  }

  return { jetonAcces, synchroniser, connecter, deconnecter, occupations, oublier: () => (cache = null) };
}

export type MoteurGoogle = ReturnType<typeof moteurGoogle>;
