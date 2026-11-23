/**
 * Réglages › Connexions, en mots simples pour la créatrice (retour du parcours UX du 23/11) : pour
 * chaque service, un état (« Branché », « Pas encore branché ») et une phrase sur ce qu'il apporte.
 * Les noms des variables et des fichiers ne vont que dans le détail technique replié, pour la
 * personne qui s'occupe du site. Seule la PRÉSENCE des clés est lue (lib/config/providers.ts).
 */
import type { ServiceId, ServiceState } from "@/lib/config/providers";

export interface Connexion {
  id: string;
  /** nom du service, sans nom de prestataire ni de variable */
  nom: string;
  branche: boolean;
  /** état en mots simples */
  etat: string;
  /** ce que le service apporte, en une phrase */
  apporte: string;
  /** précision utile à la créatrice (mode test, boutique fermée…) */
  precision?: string;
  /** pour la personne qui s'occupe du site : prestataire, variables, étape du guide */
  technique: string;
}

/** Ce qu'apporte chaque service, et l'étape du guide d'activation (ACTIVATION.md) qui le branche. */
const SERVICES_SIMPLES: Record<ServiceId, { nom: string; apporte: string; etape: string }> = {
  paiement: { nom: "Paiement en ligne", apporte: "Les clientes règlent leur commande sur le site, par carte bancaire.", etape: "étape 4 bis" },
  customers: { nom: "Comptes clientes", apporte: "Les comptes et les fiches des clientes sont gardés dans une base sûre et sauvegardée.", etape: "étape 5" },
  store: { nom: "Mémoire du site", apporte: "Le site garde paniers, commandes en cours et réglages en lieu sûr, même quand il change de serveur.", etape: "étape 3" },
  email: { nom: "E-mails de la Maison", apporte: "Les confirmations de commande, d’expédition et de rendez-vous partent vraiment.", etape: "étape 6" },
  marketing: { nom: "Lettre et e-mails automatiques", apporte: "La lettre et les e-mails des parcours partent par un outil fait pour les envois groupés.", etape: "étape 7" },
  ai: { nom: "Assistante et agents", apporte: "L’assistante du site répond aux clientes et les agents de l’Atelier préparent leur travail.", etape: "étape 8" },
  captcha: { nom: "Protection des formulaires", apporte: "Les formulaires du site écartent les robots : faux comptes et messages indésirables.", etape: "étape 9" },
  address: { nom: "Adresses de livraison", apporte: "Pendant la commande, l’adresse se complète toute seule à partir des premières lettres.", etape: "étape 10 bis" },
  labels: { nom: "Étiquettes de retour", apporte: "Une cliente qui retourne une pièce reçoit une étiquette Colissimo déjà payée.", etape: "étape 10 bis" },
  instagram: { nom: "Instagram", apporte: "Vos dernières publications s’affichent sur la page d’accueil.", etape: "étape 10" },
  calendar: { nom: "Agenda des rendez-vous", apporte: "Les moments déjà pris dans votre agenda ferment les créneaux de rendez-vous.", etape: "étape 16" },
  googleAgenda: { nom: "Google Agenda", apporte: "Chaque rendez-vous pris sur le site s’ajoute à votre Google Agenda.", etape: "étape 16" },
  errors: { nom: "Suivi des erreurs", apporte: "Une erreur du site est relevée et signalée dès qu’elle arrive.", etape: "étape 11" },
};

const BRANCHE = "Branché";
const PAS_BRANCHE = "Pas encore branché";

export interface EtatConnexions {
  services: Record<ServiceId, ServiceState>;
  paiement: { enLigne: boolean; enTest: boolean; boutiqueReelle: boolean; raison: string | null };
  notifications: boolean;
  tachesPlanifiees: boolean;
  motDePassePersonnel: boolean;
  /** modèle de l'assistante (détail technique) */
  modele?: string;
}

/** Une ligne par service, sans doublon (le paiement en ligne n'apparaît qu'une fois). */
export function connexionsAtelier(e: EtatConnexions): Connexion[] {
  const lignes: Connexion[] = (Object.keys(SERVICES_SIMPLES) as ServiceId[]).map((id) => {
    const s = e.services[id];
    const simple = SERVICES_SIMPLES[id];
    const cles = Object.entries(s.keys)
      .map(([p, k]) => (k.length ? `${p} : ${k.join(", ")}` : p))
      .join(" ; ");
    const technique = [
      `${s.env}${s.requested ? ` = ${s.requested}` : ""}`,
      s.provider === "mock" ? `simulation (${s.providerLabel})` : `${s.providerLabel}${id === "ai" && e.modele ? `, ${e.modele}` : ""}`,
      s.missing.length ? `manque ${s.missing.join(", ")}` : cles,
      `ACTIVATION.md, ${simple.etape}`,
    ].join(" · ");
    if (id === "paiement") {
      const p = e.paiement;
      return {
        id,
        nom: simple.nom,
        branche: p.enLigne,
        etat: p.enLigne ? BRANCHE : PAS_BRANCHE,
        apporte: simple.apporte,
        precision: p.enLigne
          ? p.enTest
            ? "Branché en mode test : aucun argent réel ne bouge."
            : undefined
          : p.boutiqueReelle
            ? "Tant qu’il n’est pas branché, la boutique ne prend aucune commande payée."
            : "En attendant, la démonstration utilise un paiement d’essai, sans argent réel.",
        technique: `${technique}${p.raison ? ` · ${p.raison}` : ""} · webhook vers /api/webhooks/stripe`,
      };
    }
    const branche = s.provider !== "mock";
    return { id, nom: simple.nom, branche, etat: branche ? BRANCHE : PAS_BRANCHE, apporte: simple.apporte, technique };
  });
  lignes.push(
    {
      id: "notifications",
      nom: "Notifications de l’application",
      branche: e.notifications,
      etat: e.notifications ? BRANCHE : PAS_BRANCHE,
      apporte: "L’application de l’Atelier vous prévient d’une commande ou d’un message sur votre téléphone.",
      technique: "VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY · ACTIVATION.md, étape 15",
    },
    {
      id: "taches",
      nom: "Tâches de chaque jour",
      branche: e.tachesPlanifiees,
      etat: e.tachesPlanifiees ? "Réglé" : "Pas encore réglé",
      apporte: "Les rappels, les agents du matin et les sauvegardes se lancent tout seuls, à l’abri des curieux.",
      technique: "CRON_SECRET · ACTIVATION.md, étape 2",
    },
    {
      id: "mot-de-passe",
      nom: "Mot de passe d’installation de l’Atelier",
      branche: e.motDePassePersonnel,
      etat: e.motDePassePersonnel ? "Réglé" : "Pas encore réglé",
      apporte: "Il ne sert qu’à la première connexion d’un compte ; celui de la démonstration doit être remplacé.",
      technique: "ATELIER_PASSWORD · ACTIVATION.md, étape 2",
    },
  );
  return lignes;
}

/**
 * Lien vers le guide d'activation dans le dépôt du site, quand son adresse est connue (Vercel la
 * donne à chaque déploiement, l'éditeur visuel peut la recevoir) ; sinon, le guide est nommé.
 */
export function lienGuideActivation(env: Record<string, string | undefined> = process.env): string | null {
  const depot =
    env.EDITION_GITHUB_REPO?.trim() || (env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}` : "");
  if (!depot || !/^[\w.-]+\/[\w.-]+$/.test(depot)) return null;
  const branche = env.EDITION_GITHUB_BRANCH?.trim() || "main";
  if (!/^[\w./-]+$/.test(branche)) return null;
  return `https://github.com/${depot}/blob/${branche}/ACTIVATION.md`;
}
