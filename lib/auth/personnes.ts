/**
 * Personnes ajoutées à l'Atelier depuis l'Atelier (règles : lib/auth/personnes-regles.ts). Stockage
 * seulement : les droits (session, code à six chiffres) se vérifient dans la route
 * app/api/gestion/personnes, et lib/auth/accounts.ts les ajoute aux adresses de Vercel.
 */
import "server-only";
import { kv } from "@/lib/store";
import { avecVerrou } from "@/lib/store/verrou";
import { INVITATION_DUREE_MS, empreinteInvitation, invitationAccepte, inviter, normaliserEmail, type Personne } from "./personnes-regles";

const CLE = "atelier:personnes";

export async function personnesAjoutees(): Promise<Personne[]> {
  return (await kv.get<Personne[]>(CLE)) ?? [];
}

export async function personneAjoutee(email: string): Promise<Personne | null> {
  const e = normaliserEmail(email);
  return (await personnesAjoutees()).find((p) => p.email === e) ?? null;
}

/**
 * Ajoute une personne ; renvoie le code d'invitation, montré une seule fois à qui l'ajoute, ou la
 * raison du refus. Les règles (doublon, plafond) sont revérifiées sous le verrou : deux ajouts
 * simultanés ne dépassent jamais le plafond.
 */
export async function ajouterPersonne(
  email: string,
  par: string,
  probleme: (ajoutees: Personne[]) => string | null,
): Promise<{ code: string; expire: string } | { probleme: string }> {
  return avecVerrou("atelier:personnes", async () => {
    const liste = await personnesAjoutees();
    const refus = probleme(liste);
    if (refus) return { probleme: refus };
    const { code, invitation } = inviter();
    const personne: Personne = { email: normaliserEmail(email), ajouteePar: par, ajouteeLe: new Date().toISOString(), invitation };
    await kv.set(CLE, [...liste.filter((p) => p.email !== personne.email), personne]);
    return { code, expire: invitation.expire };
  });
}

/** Nouveau code d'invitation (l'ancien ne sert plus) ; null si la personne n'existe pas. */
export async function renouvelerInvitation(email: string): Promise<{ code: string; expire: string } | null> {
  return avecVerrou("atelier:personnes", async () => {
    const liste = await personnesAjoutees();
    const e = normaliserEmail(email);
    if (!liste.some((p) => p.email === e)) return null;
    const { code, invitation } = inviter();
    await kv.set(CLE, liste.map((p) => (p.email === e ? { ...p, invitation } : p)));
    return { code, expire: invitation.expire };
  });
}

/**
 * Première connexion d'une personne ajoutée : le code d'invitation ne sert qu'une fois, même si deux
 * demandes arrivent en même temps (la première prend le jeton, la seconde est refusée).
 */
export async function utiliserInvitation(email: string, code: string): Promise<boolean> {
  const p = await personneAjoutee(email);
  if (!p || !invitationAccepte(p, code)) return false;
  if (!(await kv.prendre(`atelier:invitation-utilisee:${empreinteInvitation(code)}`, "1", INVITATION_DUREE_MS))) return false;
  await avecVerrou("atelier:personnes", async () => {
    const liste = await personnesAjoutees();
    await kv.set(CLE, liste.map((x) => (x.email === p.email ? { ...x, invitation: undefined } : x)));
  });
  return true;
}

/** Retire une personne ajoutée ; renvoie faux si elle n'en faisait pas partie. */
export async function retirerPersonne(email: string): Promise<boolean> {
  return avecVerrou("atelier:personnes", async () => {
    const liste = await personnesAjoutees();
    const e = normaliserEmail(email);
    if (!liste.some((p) => p.email === e)) return false;
    await kv.set(CLE, liste.filter((p) => p.email !== e));
    return true;
  });
}
