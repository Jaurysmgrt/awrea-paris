/**
 * Ce que les agents font seuls (règles pures, sans stockage : lisibles par l'Atelier et testées dans
 * tests/unit/agents-autonomie.test.ts ; réglages et envois dans lib/agents/autonomie.ts), et dans quelles limites (réponses de la créatrice du 02/11 : « les
 * agents font juste un retour, ils ne travaillent pas vraiment ; j'aimerais qu'ils règlent eux-mêmes
 * les problèmes, avec bien sûr des règles »). Elle a choisi quatre autonomies, chacune coupée ou
 * rallumée d'un geste dans l'Atelier › Réglages › Ce que les agents font seuls.
 *
 * Ce qui ne change jamais (lib/agents/policy.ts) : l'argent (remboursement, annulation, prix) et la
 * lettre à toute la liste restent ses décisions ; aucun agent n'a accès aux données bancaires ni aux
 * mots de passe ; un texte qui contient une formulation interdite repasse par elle avant de partir.
 */
export type Autonomie = "retards" | "corrections" | "avis" | "relances";

export interface AutonomieInfo {
  titre: string;
  /** qui agit */
  agents: string;
  /** la règle, en une phrase, telle qu'elle s'affiche dans les Réglages */
  regle: string;
}

export const AUTONOMIES: Record<Autonomie, AutonomieInfo> = {
  retards: {
    titre: "Prévenir une cliente d’un retard",
    agents: "Commandes et confection",
    regle: "Un seul message par commande et par retard, poli et signé de la Maison. Il ne promet ni geste ni remboursement, et rappelle que la cliente peut répondre.",
  },
  corrections: {
    titre: "Corriger le site",
    agents: "Gardien de l’éditeur",
    regle: "Seulement ce qui ne change pas le sens : espaces, apostrophes et guillemets, et la description d’une photo de pièce reprise du catalogue. Jamais sur une page que vous êtes en train de modifier. Chaque correction est une version de la page, que vous annulez en un clic.",
  },
  avis: {
    titre: "Publier les avis vérifiés",
    agents: "Avis clientes",
    regle: "Un avis d’achat vérifié, sans photo, sans lien ni coordonnées, qui ne signale aucun souci (taille, qualité, retard, colis) est publié seul. Tous les autres vous restent.",
  },
  relances: {
    titre: "Relances et mots d’accueil",
    agents: "Retours, Sur mesure, Cercle",
    regle: "Au plus un e-mail par cliente et par semaine, jamais au sujet d’un remboursement : le rappel d’un retour à déposer, l’accusé d’une demande de sur mesure, le mot de bienvenue du Cercle.",
  },
};

export const LISTE_AUTONOMIES = Object.keys(AUTONOMIES) as Autonomie[];

const SEMAINE = 7 * 86_400_000;

/**
 * Limite des e-mails partis seuls : une même cliente ne reçoit pas plus d'un e-mail d'agent par
 * semaine (relances et mots d'accueil), et un même sujet (une commande en retard, un retour, une
 * demande) n'est écrit qu'une fois. Renvoie vrai si l'envoi est permis.
 */
export function envoiPermis(envois: Record<string, string>, cliente: string, sujet: string, now: Date): boolean {
  if (envois[`sujet:${sujet}`]) return false;
  const dernier = envois[`cliente:${cliente.toLowerCase()}`];
  return !dernier || now.getTime() - new Date(dernier).getTime() >= SEMAINE;
}

/** Mots qui signalent un souci dans un avis : il revient à la créatrice. */
const SOUCI = /(?<!\p{L})(d[ée]çue?s?|d[ée]cevante?s?|retard|ab[iî]m[ée]e?s?|cass[ée]e?s?|d[ée]fauts?|d[ée]chir\p{L}*|rembours\p{L}*|arnaque|nulle?|horrible|pas re[çc]ue?|jamais re[çc]ue?|probl[èe]mes?|mauvaise?s?|m[ée]diocre|trop (petite?|grande?|serr[ée]e?|large)|ne (taille|tombe) pas|colis|livraison)(?!\p{L})/iu; // ecriture-ok : expression régulière
const CONTACT = /(https?:\/\/|www\.|@|\+?\d[\d .-]{7,})/i;

/** L'avis peut-il être publié sans la créatrice ? */
export function avisPublicable(r: { body: string; photos?: string[]; fit?: string | null }): boolean {
  if (r.photos?.length) return false;
  if (r.fit && r.fit !== "juste") return false;
  const texte = r.body.trim();
  if (texte.length < 12) return false;
  return !SOUCI.test(texte) && !CONTACT.test(texte);
}
