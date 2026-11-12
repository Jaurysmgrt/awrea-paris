/**
 * Preuve de possession de l'adresse e-mail pour le privilège de bienvenue : sans elle, le privilège
 * ne s'affiche pas et ne se retire pas (personne ne peut tester une adresse ni utiliser le privilège
 * d'une autre en tapant son adresse au paiement).
 *
 * Deux preuves :
 *  - le lien d'un e-mail de la Maison ouvert dans ce navigateur (confirmation de l'inscription, ou
 *    lien « Recevoir mon privilège sur cet appareil ») : un cookie technique HttpOnly, signé, garde
 *    l'empreinte de l'adresse (jamais l'adresse en clair), 15 jours (la durée du privilège) ;
 *  - une cliente connectée à son compte sous la même adresse (connexion par code envoyé à l'adresse,
 *    Google ou Apple).
 */
import "server-only";
import { cookies } from "next/headers";
import { sign, verify } from "@/lib/auth/session";
import { getCustomerSession } from "@/lib/auth/customer";
import { cleCanonique } from "@/lib/crm/regles";
import { empreinteAdresse } from "./index";

export const COOKIE_PREUVE = "awrea_privilege_appareil";
const DUREE = 15 * 24 * 3600;
/** quelques adresses au plus par navigateur (un ordinateur partagé, deux adresses) */
const MAX_ADRESSES = 4;
const marque = (email: string) => empreinteAdresse(email, "appareil").slice(0, 24);

async function marquesDuNavigateur(): Promise<string[]> {
  const v = verify<{ h?: unknown; k?: unknown }>((await cookies()).get(COOKIE_PREUVE)?.value);
  return v?.k === "privilege-appareil" && Array.isArray(v.h) ? v.h.filter((x): x is string => typeof x === "string") : [];
}

/** Le lien d'un e-mail de la Maison vient d'être ouvert ici : l'adresse est prouvée dans ce navigateur. */
export async function noterPreuve(email: string): Promise<void> {
  const m = marque(email);
  const h = [m, ...(await marquesDuNavigateur()).filter((x) => x !== m)].slice(0, MAX_ADRESSES);
  (await cookies()).set(COOKIE_PREUVE, sign({ h, k: "privilege-appareil" }, DUREE), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DUREE });
}

/** L'adresse est-elle prouvée ici : lien ouvert dans ce navigateur, ou cliente connectée sous cette adresse ? */
export async function adressePossedee(email: string): Promise<boolean> {
  try {
    if ((await marquesDuNavigateur()).includes(marque(email))) return true;
    const s = await getCustomerSession().catch(() => null);
    return Boolean(s?.email && cleCanonique(s.email) === cleCanonique(email));
  } catch (e) {
    // secret de session absent : aucune preuve (le privilège ne s'applique pas, rien n'est révélé)
    console.error("[privilège] preuve", e instanceof Error ? e.message : e);
    return false;
  }
}
