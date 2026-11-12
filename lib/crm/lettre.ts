/**
 * Inscription à la lettre en deux temps (double confirmation) et privilège de bienvenue.
 *
 * 1. La personne coche la case et envoie le formulaire (fenêtre « Profitez de votre privilège »,
 *    pied de page, accueil, page « Bientôt », case de la commande) : sa fiche note l'inscription
 *    demandée, avec le texte de la case, la date et les coordonnées données ; rien d'autre ne change
 *    (ni le statut, ni les coordonnées de la fiche).
 * 2. Elle reçoit l'e-mail « Confirmation de l'inscription à la lettre » (document
 *    email-confirmation-lettre, modifiable dans l'Atelier) : un lien chiffré, valable sept jours.
 * 3. Sur la page du lien, le bouton « Confirmer mon inscription » (jamais au simple chargement : les
 *    antivirus des messageries ouvrent les liens) confirme l'inscription (preuve complète : texte,
 *    date, source, date du clic), complète la fiche, ouvre le privilège pour 14 jours (une nouvelle
 *    inscription seulement, une fois par adresse, avant toute commande), le rattache à ce navigateur
 *    (lib/privilege/preuve.ts), puis la bienvenue de la lettre part.
 *
 * Réponses de la créatrice du 12/11 : une personne déjà inscrite avant le privilège ne le reçoit pas,
 * et aucun e-mail ne le lui propose ; une personne qui a déjà commandé ne le reçoit pas non plus.
 * Une personne déjà abonnée et confirmée qui remplit de nouveau un formulaire ne reçoit rien et sa
 * fiche ne change pas. Au plus trois e-mails de confirmation par heure pour une adresse.
 *
 * Privilège sur un autre appareil : depuis le récapitulatif de sa commande, la cliente demande un
 * lien (« Recevoir mon privilège sur cet appareil ») ; il ne part que si un privilège attend
 * l'adresse, la réponse est la même dans tous les cas.
 */
import "server-only";
import { createHash } from "node:crypto";
import { kv } from "@/lib/store";
import { getDoc } from "@/lib/edition/read";
import { sendDocEmail } from "@/lib/email/documents";
import { siteUrl } from "@/lib/seo/metadata";
import { localizePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/edition/config";
import { accountCopy } from "@/content/fr/account";
import { upsertContact } from "@/lib/marketing/provider";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { telephoneE164 } from "@/app/api/newsletter/regles";
import { dejaCliente, lirePrivilege, ouvrirPrivilege, privilegeOuvert } from "@/lib/privilege";
import { noterPreuve } from "@/lib/privilege/preuve";
import type { CommerceTexts } from "@/lib/commerce/texts";
import { fabriquerJeton, lireJeton, type TypeJeton } from "./jetons";
import { confirmerInscription, demanderInscription, etatLettreDe, ficheBrute, normaliserEmail } from "./index";

type SiteTexts = typeof import("@/content/site/fr/site.json");
export type PrivilegeTexts = typeof import("@/content/site/fr/privilege.json");

/** Durée de validité du lien de confirmation. */
export const JOURS_LIEN_CONFIRMATION = 7;
/** Durée de validité du lien « privilège sur cet appareil ». */
export const HEURES_LIEN_APPAREIL = 24;
export const DOC_CONFIRMATION = "email-confirmation-lettre";
export const DOC_APPAREIL = "email-privilege-appareil";

const TYPES_PAGE: readonly TypeJeton[] = ["lettre-confirmation", "privilege-appareil"];

export const jetonConfirmation = (email: string) => fabriquerJeton("lettre-confirmation", email, JOURS_LIEN_CONFIRMATION * 24 * 3600);

/** Type et adresse d'un lien de la page /lettres/confirmation (confirmation ou appareil), sinon null. */
export const lienDeLaPage = (jeton: string | null | undefined) => lireJeton(jeton, TYPES_PAGE);

/** Adresse portée par un lien de confirmation chiffré et encore valable, sinon null. */
export function emailDuJeton(jeton: string | null | undefined): string | null {
  return lireJeton(jeton, ["lettre-confirmation"])?.e ?? null;
}

const lienPage = (jeton: string, locale: Locale) => `${siteUrl}${localizePath("/lettres/confirmation", locale)}?jeton=${encodeURIComponent(jeton)}`;
export const lienConfirmation = (email: string, locale: Locale = "fr") => lienPage(jetonConfirmation(email), locale);

/** Texte de la case cochée, tel que la personne l'a lu, selon le formulaire (preuve du consentement). */
export async function texteConsentement(source: string, locale: Locale = "fr"): Promise<string> {
  if (source === "fenetre") return (await getDoc<PrivilegeTexts>("privilege", locale, { plain: true })).fenetre.consentement;
  if (source === "commande") return (await getDoc<CommerceTexts>("commerce", locale, { plain: true })).commande.champs.lettres;
  if (source === "compte") return accountCopy.login.marketing;
  return (await getDoc<SiteTexts>("site", locale, { plain: true })).lettre.consentement;
}

export type ResultatInscription = "confirmation-envoyee" | "deja-abonnee" | "limite";

/** Au plus `max` envois par heure pour une adresse et un usage (aucune adresse en clair dans la clé). */
async function sousLaLimite(usage: string, email: string, max: number): Promise<boolean> {
  const cle = `lettre:${usage}:${createHash("sha256").update(normaliserEmail(email)).digest("hex").slice(0, 32)}`;
  return (await kv.incr(cle, 3600)) <= max;
}

/**
 * Inscription demandée : la demande est notée dans la fiche (avec ses coordonnées, appliquées au
 * clic) et l'e-mail de confirmation part ; il annonce le privilège seulement à une nouvelle inscrite
 * qui n'a jamais commandé et n'en a jamais eu. Le statut de la lettre ne change qu'au clic.
 */
export async function inscrireALaLettre(d: { email: string; prenom?: string; nom?: string; telephone?: string; source: string; locale?: Locale }): Promise<ResultatInscription> {
  const email = normaliserEmail(d.email);
  const locale = d.locale ?? "fr";
  const avant = await etatLettreDe(email);
  // déjà abonnée et confirmée : rien ne part, rien ne change (personne ne réécrit sa fiche)
  if (avant.statut === "abonnee" && avant.confirmee) return "deja-abonnee";
  if (!(await sousLaLimite("confirmation", email, 3))) return "limite";
  const [privilege, cliente] = await Promise.all([lirePrivilege(email), dejaCliente(email)]);
  await demanderInscription({ email, prenom: d.prenom, nom: d.nom, telephone: d.telephone, source: d.source, texte: await texteConsentement(d.source, locale) });
  // déjà inscrite avant (ancienne liste) : elle confirme son inscription, sans privilège à la clé
  const offre = avant.statut !== "abonnee" && !privilege && !cliente;
  await sendDocEmail(DOC_CONFIRMATION, email, { locale, vars: { lien: lienConfirmation(email, locale), privilege: offre ? "oui" : "" }, tag: "lettre-confirmation" });
  return "confirmation-envoyee";
}

export type ResultatConfirmation = { etat: "confirmee"; privilege: { expireLe: string } | null } | { etat: "appareil"; privilege: { expireLe: string } } | { etat: "invalide" };

const encoreValable = (p: { utilise?: unknown; expireLe: string } | null) => (p && !p.utilise && Date.parse(p.expireLe) > Date.now() ? { expireLe: p.expireLe } : null);

/**
 * Bouton de la page d'un lien de la Maison (/lettres/confirmation) :
 *  - lien de confirmation : inscription confirmée ; privilège ouvert pour une nouvelle inscription
 *    (une fois, avant toute commande) ; bienvenue de la lettre et outil d'e-mails mis à jour.
 *    Rouvrir le lien ne change rien de plus. Un lien expiré, faux, ou reçu avant une désinscription
 *    est « invalide » ;
 *  - lien « privilège sur cet appareil » : rien ne change dans la fiche.
 * Dans les deux cas, un privilège encore valable est rattaché à ce navigateur (cookie de preuve).
 */
export async function confirmerLettre(jeton: string): Promise<ResultatConfirmation> {
  const lien = lienDeLaPage(jeton);
  if (!lien) return { etat: "invalide" };
  const email = lien.e;
  if (lien.k === "privilege-appareil") {
    const p = encoreValable(await privilegeOuvert(email));
    if (!p) return { etat: "invalide" };
    await noterPreuve(email);
    return { etat: "appareil", privilege: p };
  }
  const r = await confirmerInscription(email);
  if (!r) return { etat: "invalide" };
  // le privilège s'ouvre pour une nouvelle inscription seulement (jamais pour une inscrite d'avant)
  const p = encoreValable(r.nouvelle ? await ouvrirPrivilege(email) : await privilegeOuvert(email));
  if (p) await noterPreuve(email).catch((e) => console.error("[lettre] preuve", e));
  if (r.nouvelle) {
    const f = await ficheBrute(email).catch(() => null);
    await upsertContact({ email, firstName: f?.prenom, lastName: f?.nom, phone: telephoneE164(f?.telephone), marketing: true }).catch((e) => console.error("[lettre] outil d’e-mails", e));
    await onNewsletterSignup(email).catch((e) => console.error("[lettre] bienvenue", e));
  }
  return { etat: "confirmee", privilege: p };
}

/**
 * « Recevoir mon privilège sur cet appareil » : si un privilège valable attend cette adresse, un
 * lien part, qui le rattache au navigateur où il est ouvert. Trois envois par heure au plus pour une
 * adresse. Ne dit jamais à l'appelant si l'adresse a un privilège.
 */
export async function envoyerLienAppareil(email: string, locale: Locale = "fr"): Promise<void> {
  const p = encoreValable(await privilegeOuvert(email));
  if (!p) return;
  if (!(await sousLaLimite("appareil", email, 3))) return;
  const jeton = fabriquerJeton("privilege-appareil", email, HEURES_LIEN_APPAREIL * 3600);
  await sendDocEmail(DOC_APPAREIL, normaliserEmail(email), { locale, vars: { lien: lienPage(jeton, locale) }, tag: "privilege-appareil" });
}
