/**
 * Inscription à la lettre en deux temps (double confirmation) et privilège de bienvenue.
 *
 * 1. La personne coche la case et envoie le formulaire (fenêtre « Profitez de votre privilège »,
 *    pied de page, accueil, page « Bientôt », case de la commande) : sa fiche note l'inscription
 *    demandée, avec le texte de la case et la date ; rien d'autre ne change.
 * 2. Elle reçoit l'e-mail « Confirmation de l'inscription à la lettre » (document
 *    email-confirmation-lettre, modifiable dans l'Atelier) : un lien signé, valable sept jours.
 * 3. Le clic confirme l'inscription (preuve complète : texte, date, source, date du clic), ouvre le
 *    privilège pour 14 jours (une seule fois par adresse, avant une première commande), puis la
 *    bienvenue de la lettre part.
 *
 * Une personne déjà abonnée et confirmée qui remplit de nouveau un formulaire ne reçoit rien de plus
 * (ses coordonnées se complètent). Au plus trois e-mails de confirmation par heure pour une adresse.
 */
import "server-only";
import { createHash } from "node:crypto";
import { kv } from "@/lib/store";
import { sign, verify } from "@/lib/auth/session";
import { getDoc } from "@/lib/edition/read";
import { sendDocEmail } from "@/lib/email/documents";
import { siteUrl } from "@/lib/seo/metadata";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/edition/config";
import { accountCopy } from "@/content/fr/account";
import { upsertContact } from "@/lib/marketing/provider";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { telephoneE164 } from "@/app/api/newsletter/regles";
import { dejaCliente, lirePrivilege, ouvrirPrivilege } from "@/lib/privilege";
import type { CommerceTexts } from "@/lib/commerce/texts";
import { completerCoordonnees, confirmerInscription, demanderInscription, etatLettreDe, ficheBrute, normaliserEmail } from "./index";

type SiteTexts = typeof import("@/content/site/fr/site.json");
export type PrivilegeTexts = typeof import("@/content/site/fr/privilege.json");

/** Durée de validité du lien de confirmation. */
export const JOURS_LIEN_CONFIRMATION = 7;
export const DOC_CONFIRMATION = "email-confirmation-lettre";

export const jetonConfirmation = (email: string) => sign({ e: normaliserEmail(email), k: "lettre-confirmation" }, JOURS_LIEN_CONFIRMATION * 24 * 3600);

/** Adresse portée par un lien de confirmation signé et encore valable, sinon null. */
export function emailDuJeton(jeton: string | null | undefined): string | null {
  if (!jeton || jeton.length > 2048) return null;
  const d = verify<{ e: string; k: string }>(jeton);
  return d?.k === "lettre-confirmation" && typeof d.e === "string" ? d.e : null;
}

export const lienConfirmation = (email: string, locale: Locale = "fr") => `${siteUrl}${localizePath("/lettres/confirmation", locale)}?jeton=${encodeURIComponent(jetonConfirmation(email))}`;

/** Texte de la case cochée, tel que la personne l'a lu, selon le formulaire (preuve du consentement). */
export async function texteConsentement(source: string, locale: Locale = "fr"): Promise<string> {
  if (source === "fenetre") return (await getDoc<PrivilegeTexts>("privilege", locale, { plain: true })).fenetre.consentement;
  if (source === "commande") return (await getDoc<CommerceTexts>("commerce", locale, { plain: true })).commande.champs.lettres;
  if (source === "compte") return accountCopy.login.marketing;
  return (await getDoc<SiteTexts>("site", locale, { plain: true })).lettre.consentement;
}

export type ResultatInscription = "confirmation-envoyee" | "deja-abonnee" | "limite";

/**
 * Inscription demandée : la fiche est créée ou complétée et l'e-mail de confirmation part (il annonce
 * le privilège quand le clic l'ouvrira). Le statut de la lettre ne change qu'au clic.
 */
export async function inscrireALaLettre(d: { email: string; prenom?: string; nom?: string; telephone?: string; source: string; locale?: Locale }): Promise<ResultatInscription> {
  const email = normaliserEmail(d.email);
  const locale = d.locale ?? "fr";
  const [avant, privilege, cliente] = await Promise.all([etatLettreDe(email), lirePrivilege(email), dejaCliente(email)]);
  const coordonnees = { prenom: d.prenom, nom: d.nom, telephone: d.telephone };
  // déjà abonnée et confirmée, sans privilège à ouvrir : ses coordonnées seulement
  if (avant.statut === "abonnee" && avant.confirmee && (privilege || cliente)) {
    await completerCoordonnees(email, coordonnees);
    return "deja-abonnee";
  }
  const cle = `lettre:confirmation:${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
  if ((await kv.incr(cle, 3600)) > 3) {
    await completerCoordonnees(email, coordonnees);
    return "limite";
  }
  await demanderInscription({ email, ...coordonnees, source: d.source, texte: await texteConsentement(d.source, locale) });
  await sendDocEmail(DOC_CONFIRMATION, email, { locale, vars: { lien: lienConfirmation(email, locale), privilege: !privilege && !cliente ? "oui" : "" }, tag: "lettre-confirmation" });
  return "confirmation-envoyee";
}

export type ResultatConfirmation = { etat: "confirmee"; privilege: { expireLe: string } | null } | { etat: "invalide" };

/**
 * Clic dans l'e-mail de confirmation : inscription confirmée, privilège ouvert (une fois, avant une
 * première commande), bienvenue de la lettre et outil d'e-mails mis à jour. Rouvrir le lien ne
 * change rien. Un lien expiré, faux, ou reçu avant une désinscription est « invalide ».
 */
export async function confirmerLettre(jeton: string): Promise<ResultatConfirmation> {
  const email = emailDuJeton(jeton);
  if (!email) return { etat: "invalide" };
  const r = await confirmerInscription(email);
  if (!r) return { etat: "invalide" };
  const p = await ouvrirPrivilege(email);
  const privilege = p && !p.utilise && Date.parse(p.expireLe) > Date.now() ? { expireLe: p.expireLe } : null;
  if (r.nouvelle) {
    const f = await ficheBrute(email).catch(() => null);
    await upsertContact({ email, firstName: f?.prenom, lastName: f?.nom, phone: telephoneE164(f?.telephone), marketing: true }).catch((e) => console.error("[lettre] outil d’e-mails", e));
    await onNewsletterSignup(email).catch((e) => console.error("[lettre] bienvenue", e));
  }
  return { etat: "confirmee", privilege };
}
