/**
 * CRM de la Maison (cahier de l'Atelier du 10/11, § 1 et 5) : les fiches clientes et les inscrites à
 * la lettre réunies, une fiche par adresse e-mail normalisée. Règles : lib/crm/regles.ts.
 *
 * Données : rien n'est déplacé. Les comptes (Supabase ou démonstration), les commandes, les
 * rendez-vous et l'ancienne liste des inscrites (« newsletter:subscribers ») sont lus tels quels et
 * fusionnés à la lecture ; le CRM garde seulement ce qu'il ajoute (clé « crm:fiches » du stockage
 * technique, sauvegardé chaque nuit avec le reste) : statut de la lettre, preuve du consentement,
 * inscription en attente de confirmation, coordonnées corrigées par l'Atelier, historique. Chaque
 * écriture se fait sous verrou : deux inscriptions simultanées ne s'écrasent jamais.
 *
 * Pour les envois (lettre, avant-premières, e-mails automatiques, parcours de vente) :
 *  - `peutRecevoirMarketing(email)` : cette adresse peut-elle recevoir un e-mail marketing ?
 *  - `listerContacts()`, `contactsDuSegment(segment)` : les fiches et leurs segments ;
 *  - `destinatairesMarketing()` : les adresses des abonnées, et d'elles seules.
 */
import "server-only";
import { kv } from "@/lib/store";
import { avecVerrou } from "@/lib/store/verrou";
import { getOrders } from "@/lib/commerce/orders";
import { listAppointments } from "@/lib/appointments";
import { comptePourCRM, comptesPourCRM, demoCustomerId, retirerLettresDuCompte } from "@/lib/customers";
import type { Order } from "@/lib/commerce/types";
import {
  abonnerParCompte,
  avecEvenement,
  confirmer,
  demander,
  dernieresDesinscriptions,
  desinscrire,
  emailPlausible,
  etatLettre,
  fusionnerContacts,
  historique,
  modifier,
  normaliserEmail,
  nouvelleFiche,
  peutRecevoirMarketingSelon,
  purgerAttente,
  type AncienneInscrite,
  type CommandeSource,
  type Contact,
  type EtatLettre,
  type FicheCRM,
  type MomentFiche,
  type RendezVousSource,
  type SegmentCRM,
} from "./regles";

export * from "./regles";

const CLE = "crm:fiches";
const ANCIENNES = "newsletter:subscribers";
const DESINSCRIPTIONS = "newsletter:desinscriptions";
const VERROU = "crm:fiches";
/** une inscription jamais confirmée s'efface un jour après l'expiration de son lien (7 jours) */
export const JOURS_AVANT_PURGE = 8;

/** Une écriture du CRM qui ne peut pas se faire (adresse invalide). */
export class CrmError extends Error {}

// ------------------------------------------------------------------ lecture des sources

async function lireFiches(): Promise<Record<string, FicheCRM>> {
  return (await kv.get<Record<string, FicheCRM>>(CLE)) ?? {};
}

async function lireAnciennes(): Promise<AncienneInscrite[]> {
  return ((await kv.get<AncienneInscrite[]>(ANCIENNES)) ?? []).filter((a) => typeof a?.email === "string");
}

/**
 * Une commande vue par le CRM : prénom, nom et téléphone de son adresse ; sans adresse (anciennes
 * commandes, démonstration), le prénom du nom affiché (« Inès M. » : le nom n'y est qu'en initiale).
 */
const commandeSource = (o: Order): CommandeSource => {
  const prenomAffiche = o.name?.trim().split(/\s+/)[0];
  return {
    number: o.number,
    email: o.email,
    createdAt: o.createdAt,
    total: o.total,
    status: o.status,
    ...(o.address ? { prenom: o.address.firstName, nom: o.address.lastName, ...(o.address.phone ? { telephone: o.address.phone } : {}) } : prenomAffiche ? { prenom: prenomAffiche } : {}),
  };
};

/** Dernière désinscription de chaque adresse (liste tenue par lib/marketing/unsubscribe.ts). */
async function lireDesinscriptions(): Promise<Record<string, string>> {
  return dernieresDesinscriptions(await kv.list<{ email: string; date: string }>(DESINSCRIPTIONS, 2000));
}

async function lireRendezVous(): Promise<RendezVousSource[]> {
  // une liste illisible ne fait pas tomber les fiches : elles se lisent sans les rendez-vous
  const liste = await listAppointments().catch((e) => {
    console.error("[crm] rendez-vous", e);
    return [];
  });
  return liste.map((r) => ({ email: r.email, name: r.name, phone: r.phone, start: r.start, createdAt: r.createdAt, status: r.status, type: r.type }));
}

/** Identifiant d'une personne sans compte : celui de ses commandes dans l'Atelier. */
const idSansCompte = (email: string) => demoCustomerId(email);

// ------------------------------------------------------------------ lecture des fiches

/**
 * Toutes les fiches : comptes, commandes payées, inscrites à la lettre, rendez-vous et données du
 * CRM réunis, une par adresse. Lève si une source indispensable ne répond pas (jamais une liste
 * incomplète présentée comme complète).
 */
export async function listerContacts(maintenant = new Date()): Promise<Contact[]> {
  const [fiches, anciennes, comptes, commandes, rendezVous, desinscriptions] = await Promise.all([lireFiches(), lireAnciennes(), comptesPourCRM(), getOrders(), lireRendezVous(), lireDesinscriptions()]);
  return fusionnerContacts({ fiches, anciennes, comptes, commandes: commandes.map(commandeSource), rendezVous, desinscriptions }, idSansCompte, maintenant);
}

/** Les fiches d'un segment (clientes, prospects, abonnées, nouvelles inscrites, désinscrites). */
export async function contactsDuSegment(segment: SegmentCRM, maintenant = new Date()): Promise<Contact[]> {
  return (await listerContacts(maintenant)).filter((c) => c.segments.includes(segment));
}

export async function contactParId(id: string): Promise<Contact | null> {
  return (await listerContacts()).find((c) => c.id === id) ?? null;
}

export async function contactParEmail(email: string): Promise<Contact | null> {
  const e = normaliserEmail(email);
  return (await listerContacts()).find((c) => normaliserEmail(c.email) === e) ?? null;
}

/** Une fiche, avec son histoire (inscription, confirmation, désinscription, commandes, rendez-vous). */
export async function ficheDetaillee(id: string): Promise<{ contact: Contact; historique: MomentFiche[] } | null> {
  const [contacts, fiches, anciennes, commandes, rendezVous] = await Promise.all([listerContacts(), lireFiches(), lireAnciennes(), getOrders(), lireRendezVous()]);
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return null;
  const e = normaliserEmail(contact.email);
  const de = (x: { email: string }) => normaliserEmail(x.email) === e;
  const compte = contact.compte ? { creeLe: (await comptePourCRM(contact.email).catch(() => null))?.creeLe ?? contact.createdAt } : null;
  return {
    contact,
    historique: historique({ fiche: fiches[e], ancienne: anciennes.find(de), compte, commandes: commandes.filter(de).map(commandeSource), rendezVous: rendezVous.filter(de) }),
  };
}

/** Ce que le CRM garde pour une adresse, tel quel (droit d'accès : export des données). */
export async function ficheBrute(email: string): Promise<FicheCRM | null> {
  return (await lireFiches())[normaliserEmail(email)] ?? null;
}

/** Statut de la lettre d'une adresse (fiche du CRM, ancienne liste, case de son compte). */
export async function etatLettreDe(email: string): Promise<EtatLettre> {
  const e = normaliserEmail(email);
  const [fiches, anciennes, compte, desinscriptions] = await Promise.all([lireFiches(), lireAnciennes(), comptePourCRM(e), lireDesinscriptions()]);
  return etatLettre({ fiche: fiches[e], ancienne: anciennes.find((a) => normaliserEmail(a.email) === e), compte, desinscriteLe: desinscriptions[e] ?? null });
}

/**
 * Cette adresse peut-elle recevoir un e-mail marketing (lettre, avant-première, e-mail automatique,
 * parcours de vente) ? Oui seulement si elle est abonnée : jamais une inscription en attente de
 * confirmation, jamais une désinscrite. En cas de doute (stockage ou base injoignable), la réponse
 * est non : un e-mail marketing qui ne part pas vaut mieux qu'un e-mail non consenti.
 * Les e-mails nécessaires au service (commande, rendez-vous, confirmation d'inscription) ne passent
 * pas par cette règle.
 */
export async function peutRecevoirMarketing(email: string): Promise<boolean> {
  try {
    return peutRecevoirMarketingSelon(await etatLettreDe(email));
  } catch (e) {
    console.error("[crm] statut de la lettre illisible : aucun envoi marketing", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Adresses (normalisées) des abonnées, et d'elles seules. */
export async function destinatairesMarketing(): Promise<string[]> {
  return (await listerContacts()).filter((c) => peutRecevoirMarketingSelon(c.lettre)).map((c) => normaliserEmail(c.email));
}

// ------------------------------------------------------------------ écritures

/** Change la fiche d'une adresse sous verrou (créée au besoin) ; rien n'est écrit si rien ne change. */
async function changerFiche(email: string, change: (f: FicheCRM) => FicheCRM): Promise<FicheCRM> {
  const e = normaliserEmail(email);
  if (!emailPlausible(e)) throw new CrmError("Cette adresse e-mail n’est pas valable.");
  return avecVerrou(VERROU, async () => {
    const toutes = await lireFiches();
    const avant = toutes[e] ?? nouvelleFiche(e, new Date());
    const apres = change(avant);
    if (apres !== toutes[e]) await kv.set(CLE, { ...toutes, [e]: apres });
    return apres;
  });
}

/**
 * Inscription demandée (case cochée, puis bouton) : la demande est notée avec ses coordonnées, et
 * attend le clic dans l'e-mail de confirmation. Ni le statut ni les coordonnées de la fiche ne
 * changent avant ce clic (personne ne peut réécrire la fiche d'une autre adresse).
 */
export async function demanderInscription(d: { email: string; prenom?: string; nom?: string; telephone?: string; source: string; texte: string }): Promise<FicheCRM> {
  const maintenant = new Date();
  return changerFiche(d.email, (f) => demander(f, { source: d.source, texte: d.texte, coordonnees: { prenom: d.prenom, nom: d.nom, telephone: d.telephone } }, maintenant));
}

/**
 * Clic dans l'e-mail de confirmation : voir `confirmer` (lib/crm/regles.ts). Les coordonnées de la
 * demande complètent la fiche, sans jamais remplacer une valeur de la fiche ou de son compte.
 */
export async function confirmerInscription(email: string): Promise<{ nouvelle: boolean; deja: boolean } | null> {
  const [avant, compte] = await Promise.all([etatLettreDe(email), comptePourCRM(normaliserEmail(email))]);
  const duCompte = compte ? { prenom: compte.prenom, nom: compte.nom, telephone: compte.telephone } : null;
  let r: ReturnType<typeof confirmer> = null;
  await changerFiche(email, (f) => {
    r = confirmer(f, avant, new Date(), duCompte);
    return r?.fiche ?? f;
  });
  const fait = r as ReturnType<typeof confirmer>;
  return fait ? { nouvelle: fait.nouvelle, deja: fait.deja } : null;
}

/** Case « lettres » cochée dans son compte (création ou réglage) : consentement direct, adresse vérifiée. */
export async function abonnerDepuisCompte(email: string, texte: string): Promise<void> {
  const avant = await etatLettreDe(email);
  await changerFiche(email, (f) => abonnerParCompte(f, avant, texte, new Date()));
}

/**
 * Désinscription dans le CRM et dans le compte de la même adresse : elle vaut partout. Passer par
 * `unsubscribe` (lib/marketing/unsubscribe.ts), qui retire aussi l'adresse de l'ancienne liste et de
 * l'outil d'e-mails.
 */
export async function noterDesinscription(email: string, d: { source: string; par?: string }): Promise<void> {
  // chacune à part : un compte injoignable n'empêche pas la fiche (qui fait foi sur le compte)
  const [fiche, compte] = await Promise.allSettled([changerFiche(email, (f) => desinscrire(f, d, new Date())), retirerLettresDuCompte(normaliserEmail(email))]);
  if (compte.status === "rejected") console.error("[crm] désinscription du compte", compte.reason);
  if (fiche.status === "rejected") throw fiche.reason;
}

/** Coordonnées corrigées par l'Atelier (prénom, nom, téléphone). */
export async function corrigerFiche(email: string, patch: { prenom?: string | null; nom?: string | null; telephone?: string | null }, par: string): Promise<void> {
  await changerFiche(email, (f) => modifier(f, patch, par, new Date()));
}

/** Un moment de l'histoire d'une fiche (privilège ouvert, utilisé…). */
export async function noterEvenement(email: string, type: "privilege" | "compte", detail?: string): Promise<void> {
  await changerFiche(email, (f) => avecEvenement(f, { at: new Date().toISOString(), type, ...(detail ? { detail } : {}) }));
}

/**
 * Effacement (droit à l'effacement) : la fiche du CRM et l'inscription de l'ancienne liste
 * disparaissent. Les commandes restent pour la comptabilité ; le compte s'efface à part.
 */
export async function effacerFiche(email: string): Promise<boolean> {
  const e = normaliserEmail(email);
  let efface = false;
  await avecVerrou(VERROU, async () => {
    const toutes = await lireFiches();
    if (!toutes[e]) return;
    const { [e]: _retiree, ...reste } = toutes;
    void _retiree;
    await kv.set(CLE, reste);
    efface = true;
  });
  const anciennes = await lireAnciennes();
  const gardees = anciennes.filter((a) => normaliserEmail(a.email) !== e);
  if (gardees.length !== anciennes.length) {
    await kv.set(ANCIENNES, gardees);
    efface = true;
  }
  return efface;
}

/**
 * Purge quotidienne (lib/customers, purgeExpired) : les inscriptions jamais confirmées s'effacent un
 * jour après l'expiration de leur lien, avec leurs coordonnées ; une fiche qui ne gardait rien
 * d'autre disparaît. Renvoie le nombre d'inscriptions effacées.
 */
export async function purgerInscriptionsNonConfirmees(maintenant = new Date()): Promise<number> {
  return avecVerrou(VERROU, async () => {
    const toutes = await lireFiches();
    const gardees: Record<string, FicheCRM> = {};
    let n = 0;
    for (const [email, f] of Object.entries(toutes)) {
      const p = purgerAttente(f, maintenant, JOURS_AVANT_PURGE);
      if (p) n++;
      const fiche = p ? p.fiche : f;
      if (fiche) gardees[email] = fiche;
    }
    if (n) await kv.set(CLE, gardees);
    return n;
  });
}
