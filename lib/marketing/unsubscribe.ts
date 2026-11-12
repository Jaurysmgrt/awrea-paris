/**
 * Désinscription des lettres (obligation de la loi pour la confiance dans l'économie numérique) :
 * chaque lettre porte un lien chiffré (l'adresse n'y paraît jamais en clair, lib/crm/jetons.ts),
 * valable un an, et l'en-tête « List-Unsubscribe » qui permet aux messageries de proposer la
 * désinscription en un clic (RFC 8058). Le lien ouvre une page qui demande une confirmation : un
 * robot qui suit les liens d'un e-mail ne désinscrit personne.
 */
import "server-only";
import { kv } from "@/lib/store";
import { verify } from "@/lib/auth/session";
import { siteUrl } from "@/lib/seo/metadata";
import { unsubscribeContact } from "@/lib/marketing/provider";
import { noterDesinscription } from "@/lib/crm";
import { fabriquerJeton, lireJeton } from "@/lib/crm/jetons";

const YEAR = 60 * 60 * 24 * 365;

export const unsubscribeToken = (email: string) => fabriquerJeton("desinscription", email, YEAR);

/**
 * Adresse d'un lien de désinscription valable. Les lettres parties avant le chiffrement portent un
 * jeton signé (adresse lisible) : il reste accepté jusqu'à son échéance, pour que chaque lien envoyé
 * fonctionne toujours.
 */
export function emailOfToken(token: string | null | undefined): string | null {
  const chiffre = lireJeton(token, ["desinscription"]);
  if (chiffre) return chiffre.e;
  const ancien = verify<{ e: string; k: string }>(token);
  return ancien?.k === "desinscription" && typeof ancien.e === "string" ? ancien.e : null;
}

export const unsubscribePage = (email: string) => `${siteUrl}/lettres/desinscription?jeton=${encodeURIComponent(unsubscribeToken(email))}`;

/** En-têtes d'une lettre : désinscription en un clic depuis la messagerie. */
export const unsubscribeHeaders = (email: string): Record<string, string> => ({
  "List-Unsubscribe": `<${siteUrl}/api/newsletter/desinscription?jeton=${encodeURIComponent(unsubscribeToken(email))}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

/**
 * Désinscription, valable partout : l'outil d'e-mails d'abord (une campagne qui partirait de là ne
 * l'atteint plus), puis, chacune à part pour qu'une étape en panne n'empêche pas les autres : la
 * liste des désinscriptions (lue par le CRM comme filet de sécurité, lib/crm/regles.ts etatLettre),
 * l'ancienne liste des inscrites, la fiche du CRM (statut « désinscrite », inscription en attente
 * annulée) et la case « lettres » du compte de la même adresse. Plus aucun envoi marketing ne part
 * ensuite (lib/crm, peutRecevoirMarketing).
 * Lève seulement si rien n'a pu être noté du côté du site (ni la liste, ni la fiche) : la personne
 * doit alors pouvoir réessayer.
 * `source` : le lien de la lettre (par défaut), son compte, l'atelier ; `par` : qui, à l'atelier.
 */
export async function unsubscribe(email: string, d: { source: string; par?: string } = { source: "lien" }): Promise<void> {
  const e = email.trim().toLowerCase();
  const outil = await Promise.allSettled([unsubscribeContact(email)]);
  if (outil[0].status === "rejected") console.error("[désinscription] outil d’e-mails", outil[0].reason);
  const [liste, ancienne, fiche] = await Promise.allSettled([
    kv.push("newsletter:desinscriptions", { email, date: new Date().toISOString() }, 2000),
    (async () => {
      const list = (await kv.get<{ email: string }[]>("newsletter:subscribers")) ?? [];
      const gardees = list.filter((s) => s.email.trim().toLowerCase() !== e);
      if (gardees.length !== list.length) await kv.set("newsletter:subscribers", gardees);
    })(),
    noterDesinscription(email, d),
  ]);
  for (const [etape, r] of [["liste des désinscriptions", liste], ["ancienne liste", ancienne], ["fiche", fiche]] as const) if (r.status === "rejected") console.error(`[désinscription] ${etape}`, r.reason);
  if (liste.status === "rejected" && fiche.status === "rejected") throw new Error("La désinscription n’a pas pu être notée : réessayez dans un instant.");
}
