/**
 * Google Agenda, connexion directe (lib/google-agenda) : `state` signé et PKCE, échange du code,
 * rafraîchissement du jeton, jeton chiffré, création, mise à jour, suppression, jamais de doublon,
 * jeton retiré chez Google, déconnexion, moments occupés. Google est simulé par un faux `fetch`
 * qui garde ses événements comme le ferait l'agenda.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sign } from "@/lib/auth/session";
import {
  GOOGLE,
  PORTEE,
  challengeDe,
  chiffrer,
  configGoogle,
  corpsEvenement,
  dechiffrer,
  etatSynchro,
  gesteGoogle,
  idEvenement,
  lireEtat,
  minuitParis,
  nouveauFlux,
  plagesOccupees,
  urlAutorisation,
  verifierRetour,
  type LienGoogle,
  type RendezVousGoogle,
} from "@/lib/google-agenda/regles";
import { moteurGoogle, type ConnexionGoogle } from "@/lib/google-agenda/synchro";

const MAINTENANT = new Date("2026-11-12T08:00:00.000Z");
const ADMIN = "contact@awreaparis.com";
const LIBELLE = "Appel vidéo avec la créatrice";
const SECRET = "une-cle-de-chiffrement-pour-les-tests-0123456789";
const CONFIG = { clientId: "identifiant-essai.apps.googleusercontent.com", clientSecret: "secret-essai", cle: null };
const RETOUR = "https://www.awreaparis.com/prive-e2e0atelier0test/agenda-google";

const rdv = (o: Partial<RendezVousGoogle> = {}): RendezVousGoogle => ({
  id: "RDV-1A2B3C4D",
  type: "visio",
  start: "2026-11-20T10:00:00.000Z",
  end: "2026-11-20T10:30:00.000Z",
  name: "Camille Essai",
  email: "camille@exemple.fr",
  phone: "06 00 00 00 00",
  message: "Une robe pour un mariage",
  status: "confirme",
  videoUrl: "https://meet.jit.si/AwreaParis-essai",
  ...o,
});

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

type Ev = { id: string; status: string; body: Record<string, unknown> };

/** Faux Google : jetons, révocation et agenda (événements gardés par identifiant). */
function fauxGoogle(journal: string[] = []) {
  const evenements = new Map<string, Ev>();
  const etat = { revoque: false, perdreProchaineReponse: false, acces: 0, revocations: [] as string[], refreshRecus: [] as string[], codeRecu: null as URLSearchParams | null, rejeter401: 0, scope: PORTEE, sansRefresh: false };
  const f = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? init.body : "";
    if (url === GOOGLE.jeton) {
      const p = new URLSearchParams(body);
      if (p.get("grant_type") === "authorization_code") {
        etat.codeRecu = p;
        return json({ access_token: "acces-initial", expires_in: 3599, ...(etat.sansRefresh ? {} : { refresh_token: "rafraichissement-essai" }), scope: etat.scope, token_type: "Bearer" });
      }
      etat.refreshRecus.push(p.get("refresh_token") ?? "");
      if (etat.revoque) return json({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, 400);
      etat.acces++;
      return json({ access_token: `acces-${etat.acces}`, expires_in: 3599, scope: PORTEE, token_type: "Bearer" });
    }
    if (url === GOOGLE.revocation) {
      etat.revocations.push(new URLSearchParams(body).get("token") ?? "");
      return new Response(null, { status: 200 });
    }
    assert.ok(url.startsWith(GOOGLE.evenements), url);
    assert.match(String((init.headers as Record<string, string>).Authorization), /^Bearer acces-/);
    if (etat.rejeter401 > 0) {
      etat.rejeter401--;
      return json({ error: { code: 401 } }, 401);
    }
    const u = new URL(url);
    const id = u.pathname.split("/events/")[1];
    journal.push(`${method}${id ? ` ${id}` : ""}`);
    if (method === "GET") {
      if (u.searchParams.get("fields") === "summary,timeZone") return json({ summary: "awrea.contact@gmail.com", timeZone: "Europe/Paris" });
      return json({ items: [...evenements.values()].filter((e) => e.status !== "cancelled").map((e) => ({ id: e.id, status: e.status, start: e.body.start, end: e.body.end })) });
    }
    if (method === "POST") {
      const b = JSON.parse(body) as Record<string, unknown> & { id: string };
      if (evenements.has(b.id)) return json({ error: { code: 409, message: "The requested identifier already exists." } }, 409);
      evenements.set(b.id, { id: b.id, status: "confirmed", body: b });
      if (etat.perdreProchaineReponse) {
        etat.perdreProchaineReponse = false;
        throw new TypeError("fetch failed");
      }
      return json({ id: b.id, status: "confirmed" });
    }
    const ev = evenements.get(id);
    if (method === "PUT") {
      if (!ev) return json({ error: { code: 404 } }, 404);
      if (ev.status === "cancelled") return json({ error: { code: 410 } }, 410);
      ev.body = JSON.parse(body);
      return json({ id, status: "confirmed" });
    }
    if (method === "DELETE") {
      if (!ev) return json({ error: { code: 404 } }, 404);
      if (ev.status === "cancelled") return json({ error: { code: 410 } }, 410);
      ev.status = "cancelled";
      return new Response(null, { status: 204 });
    }
    return json({}, 400);
  }) as typeof fetch;
  return { f, evenements, etat, actifs: () => [...evenements.values()].filter((e) => e.status !== "cancelled") };
}

/** Rendez-vous et connexion gardés en mémoire, comme le font le stockage et lib/appointments. */
function banc(liste: RendezVousGoogle[], journal: string[] = []) {
  const google = fauxGoogle(journal);
  let connexion: ConnexionGoogle | null = null;
  const depot = {
    lister: async () => JSON.parse(JSON.stringify(liste)) as RendezVousGoogle[],
    noter: async (id: string, lien: LienGoogle) => {
      journal.push(`noter ${lien.eventId}${lien.cree ? " cree" : ""}`);
      const a = liste.find((x) => x.id === id);
      if (a) a.google = JSON.parse(JSON.stringify(lien)) as LienGoogle;
    },
  };
  const coffre = {
    lire: async () => (connexion ? (JSON.parse(JSON.stringify(connexion)) as ConnexionGoogle) : null),
    ecrire: async (c: ConnexionGoogle | null) => {
      connexion = c ? (JSON.parse(JSON.stringify(c)) as ConnexionGoogle) : null;
    },
  };
  const nouveau = () => moteurGoogle({ config: CONFIG, secret: SECRET, depot, coffre, libelle: () => LIBELLE, fetch: google.f, maintenant: () => MAINTENANT });
  return { google, depot, coffre, liste, journal, connexion: () => connexion, moteur: nouveau(), nouveau };
}

const connecter = (b: ReturnType<typeof banc>) => b.moteur.connecter({ code: "4/code-essai", verifier: "verificateur-essai", redirectUri: RETOUR, par: ADMIN });

// ------------------------------------------------------------------ réglages
test("sans les deux clés Google, rien ne se connecte ; l'interrupteur « mock » coupe tout", () => {
  assert.equal(configGoogle({}), null);
  assert.equal(configGoogle({ GOOGLE_CALENDAR_CLIENT_ID: "id" }), null);
  const env = { GOOGLE_CALENDAR_CLIENT_ID: " id ", GOOGLE_CALENDAR_CLIENT_SECRET: "secret" };
  assert.deepEqual(configGoogle(env), { clientId: "id", clientSecret: "secret", cle: null });
  assert.equal(configGoogle({ ...env, GOOGLE_CALENDAR_PROVIDER: "mock" }), null);
  // clé de chiffrement dédiée : retenue seulement si elle est assez longue
  assert.equal(configGoogle({ ...env, GOOGLE_CALENDAR_TOKEN_KEY: "courte" })?.cle, null);
  assert.equal(configGoogle({ ...env, GOOGLE_CALENDAR_TOKEN_KEY: "x".repeat(40) })?.cle, "x".repeat(40));
});

// ------------------------------------------------------------------ state et PKCE
test("adresse d'autorisation : une seule autorisation, accès hors ligne, state signé et défi PKCE S256", () => {
  const { flux, state, challenge } = nouveauFlux(ADMIN);
  const url = new URL(urlAutorisation(CONFIG, { redirectUri: RETOUR, state, challenge }));
  assert.equal(`${url.origin}${url.pathname}`, "https://accounts.google.com/o/oauth2/v2/auth");
  const p = url.searchParams;
  assert.equal(p.get("scope"), "https://www.googleapis.com/auth/calendar.events.owned");
  assert.equal(p.get("response_type"), "code");
  assert.equal(p.get("access_type"), "offline");
  assert.equal(p.get("redirect_uri"), RETOUR);
  assert.equal(p.get("state"), state);
  assert.equal(p.get("code_challenge_method"), "S256");
  assert.equal(p.get("code_challenge"), challengeDe(flux.v));
  assert.equal(p.get("include_granted_scopes"), null);
  // aucun secret dans l'adresse : ni le secret du client, ni le vérificateur
  assert.ok(!url.toString().includes(CONFIG.clientSecret) && !url.toString().includes(flux.v));
  // vérificateur PKCE : 43 à 128 caractères permis ; défi = BASE64URL(SHA256)
  assert.match(flux.v, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(challengeDe("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("retour de Google : accepté seulement avec le bon state, encore valable, du même navigateur et du même compte", () => {
  const { flux, state } = nouveauFlux(ADMIN, MAINTENANT.getTime());
  const ok = verifierRetour({ state, flux, admin: "Contact@AwreaParis.com", maintenant: MAINTENANT.getTime() });
  assert.deepEqual(ok, { ok: true, verifier: flux.v });
  // state faux, altéré, vide, ou signé pour un autre usage
  for (const faux of ["faux", `${state}x`, `${state.split(".")[0]}.${"A".repeat(43)}`, "", null, sign({ role: "atelier", email: ADMIN, n: flux.n, e: ADMIN }, 600)]) {
    assert.equal(verifierRetour({ state: faux, flux, admin: ADMIN, maintenant: MAINTENANT.getTime() }).ok, false, String(faux));
  }
  // state expiré (signé il y a plus de dix minutes), même avec une connexion encore ouverte
  const vieux = sign({ u: "google-agenda", n: flux.n, e: ADMIN }, -1);
  assert.equal(lireEtat(vieux), null);
  assert.equal(verifierRetour({ state: vieux, flux, admin: ADMIN, maintenant: MAINTENANT.getTime() }).ok, false);
  // connexion du navigateur expirée, absente, ou commencée ailleurs (autre numéro)
  assert.equal(verifierRetour({ state, flux, admin: ADMIN, maintenant: flux.x + 1 }).ok, false);
  assert.equal(verifierRetour({ state, flux: null, admin: ADMIN }).ok, false);
  const autre = nouveauFlux(ADMIN, MAINTENANT.getTime());
  assert.equal(verifierRetour({ state, flux: autre.flux, admin: ADMIN, maintenant: MAINTENANT.getTime() }).ok, false);
  // un autre compte de l'Atelier ne termine pas la connexion d'une autre
  assert.equal(verifierRetour({ state, flux, admin: "autre@exemple.fr", maintenant: MAINTENANT.getTime() }).ok, false);
});

// ------------------------------------------------------------------ chiffrement
test("jeton de rafraîchissement chiffré : aller-retour, jamais en clair, illisible avec une autre clé ou altéré", () => {
  const a = chiffrer("rafraichissement-essai", SECRET);
  const b = chiffrer("rafraichissement-essai", SECRET);
  assert.notEqual(a, b, "vecteur aléatoire à chaque chiffrement");
  assert.ok(!a.includes("rafraichissement"));
  assert.equal(dechiffrer(a, SECRET), "rafraichissement-essai");
  assert.equal(dechiffrer(a, `${SECRET}-autre`), null);
  const [v, iv, tag, enc] = a.split(".");
  assert.equal(dechiffrer([v, iv, tag, `${enc.slice(0, -2)}AA`].join("."), SECRET), null);
  assert.equal(dechiffrer("", SECRET), null);
  assert.equal(dechiffrer(undefined, SECRET), null);
});

// ------------------------------------------------------------------ connexion
test("échange du code : vérificateur PKCE envoyé, jeton gardé chiffré, nom et fuseau de l'agenda lus", async () => {
  const b = banc([]);
  const c = await connecter(b);
  const p = b.google.etat.codeRecu!;
  assert.equal(p.get("grant_type"), "authorization_code");
  assert.equal(p.get("code"), "4/code-essai");
  assert.equal(p.get("code_verifier"), "verificateur-essai");
  assert.equal(p.get("redirect_uri"), RETOUR);
  assert.equal(p.get("client_secret"), CONFIG.clientSecret);
  assert.equal(c.etat, "connecte");
  assert.equal(c.calendrier, "awrea.contact@gmail.com");
  assert.equal(c.fuseau, "Europe/Paris");
  const gardee = JSON.stringify(b.connexion());
  assert.ok(!gardee.includes("rafraichissement-essai") && !gardee.includes("acces-initial"), "aucun jeton en clair");
  assert.equal(dechiffrer(b.connexion()!.jeton, SECRET), "rafraichissement-essai");
});

test("autorisation décochée chez Google, ou sans accès durable : rien n'est gardé", async () => {
  const sansPortee = banc([]);
  sansPortee.google.etat.scope = "openid";
  await assert.rejects(connecter(sansPortee), /autorisation/);
  assert.equal(sansPortee.connexion(), null);
  const sansRefresh = banc([]);
  sansRefresh.google.etat.sansRefresh = true;
  await assert.rejects(connecter(sansRefresh), /accès durable/);
  assert.equal(sansRefresh.connexion(), null);
});

test("rafraîchissement : le jeton gardé est déchiffré, renouvelé une fois, puis gardé en mémoire", async () => {
  const b = banc([]);
  await connecter(b);
  const m = b.nouveau();
  assert.equal(await m.jetonAcces(), "acces-1");
  assert.equal(await m.jetonAcces(), "acces-1");
  assert.deepEqual(b.google.etat.refreshRecus, ["rafraichissement-essai"]);
  // jeton d'accès refusé (401) par l'agenda : renouvelé une fois, puis l'envoi reprend
  b.liste.push(rdv());
  b.google.etat.rejeter401 = 1;
  const bilan = await m.synchroniser();
  assert.equal(bilan.faits, 1);
  assert.equal(b.google.etat.refreshRecus.length, 2);
});

// ------------------------------------------------------------------ événements
test("création : l'identifiant est gardé avant l'envoi, l'événement porte l'heure de Paris, la cliente, les notes et l'appel", async () => {
  const journal: string[] = [];
  const b = banc([rdv()], journal);
  await connecter(b);
  journal.length = 0;
  const bilan = await b.moteur.synchroniser();
  assert.deepEqual(bilan, { connecte: true, aReconnecter: false, faits: 1, echecs: 0 });
  const id = idEvenement("RDV-1A2B3C4D");
  assert.match(id, /^[a-v0-9]{32}$/);
  assert.deepEqual(journal, [`noter ${id}`, "POST", `noter ${id} cree`]);
  const ev = b.google.evenements.get(id)!;
  assert.equal(ev.body.summary, `Camille Essai · ${LIBELLE}`);
  assert.deepEqual(ev.body.start, { dateTime: "2026-11-20T10:00:00.000Z", timeZone: "Europe/Paris" });
  assert.deepEqual(ev.body.end, { dateTime: "2026-11-20T10:30:00.000Z", timeZone: "Europe/Paris" });
  assert.equal(ev.body.location, "https://meet.jit.si/AwreaParis-essai");
  assert.equal(ev.body.visibility, "private");
  for (const morceau of ["camille@exemple.fr", "06 00 00 00 00", "Une robe pour un mariage", "https://meet.jit.si/AwreaParis-essai", "RDV-1A2B3C4D"]) assert.ok(String(ev.body.description).includes(morceau), morceau);
  assert.equal(b.liste[0].google?.eventId, id);
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "synchronise");
  // aucun invité : Google n'écrit jamais à la cliente (le site envoie ses propres e-mails)
  assert.equal(ev.body.attendees, undefined);
});

test("jamais de doublon : réponse perdue, nouvel essai, passages simultanés ou répétés", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  // Google crée l'événement mais la réponse se perd : le rendez-vous est « à refaire »
  b.google.etat.perdreProchaineReponse = true;
  const premier = await b.moteur.synchroniser();
  assert.equal(premier.echecs, 1);
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "a-refaire");
  // nouvel essai : « déjà existant », donc mise à jour du même événement
  const second = await b.moteur.synchroniser();
  assert.equal(second.faits, 1);
  assert.equal(b.google.actifs().length, 1);
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "synchronise");
  // passage suivant : rien à envoyer
  assert.equal((await b.moteur.synchroniser()).faits, 0);
  // deux moteurs (deux serveurs) qui partent du même rendez-vous neuf : un seul événement
  const c = banc([rdv({ id: "RDV-0000AAAA" })]);
  await connecter(c);
  await Promise.all([c.moteur.synchroniser(), c.nouveau().synchroniser()]);
  assert.equal(c.google.actifs().length, 1);
});

test("déplacement ou changement : mise à jour du même événement ; annulation : suppression", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  await b.moteur.synchroniser();
  const id = b.liste[0].google!.eventId;
  // le rendez-vous change d'heure : l'empreinte change, l'événement est mis à jour
  b.liste[0].start = "2026-11-21T14:00:00.000Z";
  b.liste[0].end = "2026-11-21T14:30:00.000Z";
  assert.equal(gesteGoogle(b.liste[0], LIBELLE, MAINTENANT), "ecrire");
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "en-attente");
  await b.moteur.synchroniser();
  assert.equal(b.google.actifs().length, 1);
  assert.equal((b.google.evenements.get(id)!.body.start as { dateTime: string }).dateTime, "2026-11-21T14:00:00.000Z");
  // annulé : l'événement est supprimé, une seule fois
  b.liste[0].status = "annule";
  assert.equal(gesteGoogle(b.liste[0], LIBELLE, MAINTENANT), "retirer");
  await b.moteur.synchroniser();
  assert.equal(b.google.actifs().length, 0);
  assert.equal(b.liste[0].google?.retire, true);
  assert.equal(gesteGoogle(b.liste[0], LIBELLE, MAINTENANT), null);
  // annulé avant d'avoir jamais été envoyé : rien à faire chez Google
  assert.equal(gesteGoogle(rdv({ status: "annule" }), LIBELLE, MAINTENANT), null);
  // rendez-vous passé : plus rien à envoyer
  assert.equal(gesteGoogle(rdv({ end: "2026-11-01T10:00:00.000Z" }), LIBELLE, MAINTENANT), null);
});

test("événement supprimé à la main dans Google alors que le rendez-vous tient : recréé sous un nouvel identifiant", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  await b.moteur.synchroniser();
  const premier = b.liste[0].google!.eventId;
  b.google.evenements.get(premier)!.status = "cancelled";
  b.liste[0].message = "Une robe pour un mariage, en noir";
  await b.moteur.synchroniser();
  assert.equal(b.google.actifs().length, 1);
  assert.equal(b.liste[0].google?.eventId, idEvenement("RDV-1A2B3C4D", 1));
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "synchronise");
});

test("accès retiré chez Google : connexion « à reconnecter », jeton effacé, rendez-vous gardés en attente", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  b.google.etat.revoque = true;
  const bilan = await b.nouveau().synchroniser();
  assert.equal(bilan.aReconnecter, true);
  assert.equal(bilan.faits, 0);
  assert.equal(b.connexion()?.etat, "a-reconnecter");
  assert.equal(b.connexion()?.jeton, undefined);
  assert.match(b.connexion()?.erreur ?? "", /Reconnectez Google Agenda/);
  assert.equal(etatSynchro(b.liste[0], LIBELLE, MAINTENANT), "a-refaire");
  // tant que la connexion n'est pas refaite, plus aucun appel à Google
  const avant = b.google.etat.refreshRecus.length;
  assert.equal((await b.nouveau().synchroniser()).aReconnecter, true);
  assert.equal(b.google.etat.refreshRecus.length, avant);
  // reconnexion : le rendez-vous part
  b.google.etat.revoque = false;
  await connecter(b);
  assert.equal((await b.moteur.synchroniser()).faits, 1);
  assert.equal(b.google.actifs().length, 1);
});

test("clé de chiffrement changée : le jeton ne se relit plus, il faut reconnecter (jamais d'erreur muette)", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  const autre = moteurGoogle({ config: CONFIG, secret: `${SECRET}-nouvelle`, depot: b.depot, coffre: b.coffre, libelle: () => LIBELLE, fetch: b.google.f, maintenant: () => MAINTENANT });
  const bilan = await autre.synchroniser();
  assert.equal(bilan.aReconnecter, true);
  assert.equal(b.connexion()?.etat, "a-reconnecter");
});

test("déconnexion : l'accès est retiré chez Google avec le jeton de rafraîchissement, puis effacé du site", async () => {
  const b = banc([]);
  await connecter(b);
  assert.deepEqual(await b.moteur.deconnecter(), { revoque: true });
  assert.deepEqual(b.google.etat.revocations, ["rafraichissement-essai"]);
  assert.equal(b.connexion(), null);
  assert.equal((await b.moteur.synchroniser()).connecte, false);
});

// ------------------------------------------------------------------ moments occupés
test("moments occupés : heures seulement, sans les événements libres, annulés, déclinés ni les rendez-vous du site", () => {
  const propres = new Set(["rdvdusite"]);
  const plages = plagesOccupees(
    [
      { id: "a", start: { dateTime: "2026-11-20T09:00:00+01:00" }, end: { dateTime: "2026-11-20T10:00:00+01:00" } },
      { id: "b", transparency: "transparent", start: { dateTime: "2026-11-20T11:00:00Z" }, end: { dateTime: "2026-11-20T12:00:00Z" } },
      { id: "c", status: "cancelled", start: { dateTime: "2026-11-20T11:00:00Z" }, end: { dateTime: "2026-11-20T12:00:00Z" } },
      { id: "d", attendees: [{ self: true, responseStatus: "declined" }], start: { dateTime: "2026-11-20T13:00:00Z" }, end: { dateTime: "2026-11-20T14:00:00Z" } },
      { id: "rdvdusite", start: { dateTime: "2026-11-20T15:00:00Z" }, end: { dateTime: "2026-11-20T15:30:00Z" } },
      // journée entière, de minuit à minuit à Paris
      { id: "e", start: { date: "2026-11-24" }, end: { date: "2026-11-25" } },
    ],
    propres,
  );
  assert.deepEqual(plages, [
    { start: Date.parse("2026-11-20T08:00:00Z"), end: Date.parse("2026-11-20T09:00:00Z") },
    { start: Date.parse("2026-11-23T23:00:00Z"), end: Date.parse("2026-11-24T23:00:00Z") },
  ]);
  // été : minuit à Paris = 22 h UTC la veille
  assert.equal(minuitParis("2026-07-14"), Date.parse("2026-07-13T22:00:00Z"));
});

test("moments occupés lus dans l'agenda connecté, hors événements des rendez-vous du site", async () => {
  const b = banc([rdv()]);
  await connecter(b);
  await b.moteur.synchroniser();
  b.google.evenements.set("rendezvousperso", { id: "rendezvousperso", status: "confirmed", body: { start: { dateTime: "2026-11-20T12:00:00Z" }, end: { dateTime: "2026-11-20T13:00:00Z" } } });
  const plages = await b.moteur.occupations(45);
  assert.deepEqual(plages, [{ start: Date.parse("2026-11-20T12:00:00Z"), end: Date.parse("2026-11-20T13:00:00Z") }]);
});

test("corps de l'événement : pas de lieu sans appel vidéo, intitulé lisible", () => {
  const corps = corpsEvenement(rdv({ videoUrl: undefined, phone: undefined, message: undefined }), LIBELLE);
  assert.equal("location" in corps, false);
  assert.ok(!corps.description.includes("Téléphone") && !corps.description.includes("Notes"));
  assert.equal(corps.status, "confirmed");
});
