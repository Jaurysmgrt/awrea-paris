/**
 * Informations légales de l'entreprise — REGISTRE UNIQUE.
 *
 * Aucune de ces informations n'est inventée : tant qu'un champ est vide, il s'affiche sur le
 * site sous la forme d'un repère « [À COMPLÉTER : …] » bien visible, et il est listé dans
 * LEGAL-A-COMPLETER.md (régénéré par `npm run legal:todo`).
 * Pour compléter : renseigner `value`, puis relancer `npm run legal:todo`.
 *
 * Ce fichier ne dépend d'aucun autre module (il est lu tel quel par le script de génération).
 */
export interface LegalField {
  /** libellé court, affiché dans le repère « [À COMPLÉTER : …] » sur le site */
  short: string;
  /** description complète (LEGAL-A-COMPLETER.md) */
  label: string;
  value: string;
  /** où trouver l'information */
  source: string;
  /** pages où elle apparaît */
  pages: string[];
}

export const legalFields = {
  raisonSociale: {
    short: "dénomination sociale",
    label: "dénomination sociale ou nom de l’entrepreneuse",
    value: "",
    source: "Extrait Kbis, avis de situation INSEE ou attestation d’immatriculation au registre national des entreprises (RNE)",
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite", "propriete-intellectuelle", "retractation"],
  },
  formeJuridique: {
    short: "forme juridique",
    label: "forme juridique (SAS, SASU, SARL, EURL, entreprise individuelle…)",
    value: "",
    source: "Statuts ou Kbis",
    pages: ["mentions-legales", "cgv"],
  },
  capital: {
    short: "capital social",
    label: "montant du capital social (sociétés uniquement ; supprimer la mention pour une entreprise individuelle)",
    value: "",
    source: "Statuts ou Kbis",
    pages: ["mentions-legales", "cgv"],
  },
  siege: {
    short: "adresse du siège",
    label: "adresse du siège social (ou du domicile professionnel)",
    value: "",
    source: "Kbis ou attestation RNE",
    pages: ["mentions-legales", "cgv", "confidentialite", "retractation"],
  },
  immatriculation: {
    short: "n° d’immatriculation",
    label: "numéro et ville d’immatriculation (RCS, ou RNE pour une entreprise artisanale ou individuelle)",
    value: "",
    source: "Kbis ou attestation d’immatriculation",
    pages: ["mentions-legales", "cgv"],
  },
  siret: {
    short: "n° SIRET",
    label: "numéro SIRET",
    value: "",
    source: "Avis de situation INSEE (sirene.fr)",
    pages: ["mentions-legales", "cgv"],
  },
  tva: {
    short: "n° de TVA",
    label: "numéro de TVA intracommunautaire, ou la mention « TVA non applicable, art. 293 B du CGI » en franchise de TVA",
    value: "",
    source: "Espace professionnel impots.gouv.fr",
    pages: ["mentions-legales", "cgv"],
  },
  directricePublication: {
    short: "directrice de la publication",
    label: "nom et prénom de la directrice de la publication",
    value: "",
    source: "Représentante légale de l’entreprise",
    pages: ["mentions-legales"],
  },
  email: {
    short: "e-mail de contact",
    label: "adresse e-mail de contact (à confirmer : contact@awreaparis.com est utilisée par défaut sur le site)",
    value: "",
    source: "Boîte de réception de la maison",
    pages: ["mentions-legales", "cgv", "confidentialite", "retractation"],
  },
  telephone: {
    short: "téléphone",
    label: "numéro de téléphone du service client (obligatoire dans les mentions légales et les CGV)",
    value: "",
    source: "Ligne professionnelle",
    pages: ["mentions-legales", "cgv"],
  },
  horaires: {
    short: "horaires du service client",
    label: "jours et horaires de disponibilité du service client",
    value: "",
    source: "Organisation de l’atelier",
    pages: ["cgv"],
  },
  mediateur: {
    short: "médiateur de la consommation",
    label: "médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation)",
    value: "",
    source: "Convention signée avec un médiateur référencé par la CECMC (liste sur economie.gouv.fr)",
    pages: ["cgv", "mentions-legales"],
  },
  hebergeurTelephone: {
    short: "téléphone de l’hébergeur",
    label: "numéro de téléphone de l’hébergeur Vercel Inc. (exigé par l’article 6 de la LCEN)",
    value: "",
    source: "Page légale de Vercel (vercel.com/legal) ou contrat d’hébergement",
    pages: ["mentions-legales"],
  },
  marque: {
    short: "n° d’enregistrement de la marque",
    label: "numéro et date d’enregistrement de la marque « Awrea Paris » (INPI ou EUIPO), si elle est déposée ; sinon supprimer la mention",
    value: "",
    source: "Certificat d’enregistrement INPI (data.inpi.fr) ou EUIPO",
    pages: ["propriete-intellectuelle"],
  },
  creditsPhotos: {
    short: "crédits photos et mannequins",
    label: "crédits des photographes, vidéastes et mannequins (noms ou agences) et étendue des droits cédés",
    value: "",
    source: "Contrats de cession de droits et autorisations de droit à l’image signés",
    pages: ["propriete-intellectuelle", "mentions-legales"],
  },
  regionBase: {
    short: "région d’hébergement de la base",
    label: "région d’hébergement du projet Supabase (base clientes) — recommandé : Union européenne (Francfort ou Paris)",
    value: "",
    source: "Réglages du projet Supabase (Project Settings → General)",
    pages: ["confidentialite"],
  },
  regionsPrestataires: {
    short: "régions d’hébergement",
    label: "régions d’hébergement retenues pour Upstash (stockage technique) et Sentry (suivi des erreurs) — recommandé : Union européenne",
    value: "",
    source: "Réglages des comptes Upstash et Sentry",
    pages: ["confidentialite"],
  },
  outilEmails: {
    short: "outil d’e-mails",
    label: "outil d’e-mails marketing retenu : Brevo (France) ou Klaviyo (États-Unis)",
    value: "",
    source: "Choix de la maison",
    pages: ["confidentialite"],
  },
  paiementFractionne: {
    short: "prestataire du paiement fractionné",
    label: "prestataire du paiement en plusieurs fois (par exemple Shop Pay Installments, Klarna ou Alma) tel qu’activé dans Shopify",
    value: "",
    source: "Shopify → Paramètres → Paiements",
    pages: ["cgv", "confidentialite"],
  },
  delaiConservationDevis: {
    short: "durée de conservation",
    label: "durée de conservation des demandes de rendez-vous et de sur-mesure sans suite (proposé : 3 ans après le dernier échange)",
    value: "",
    source: "Décision de la maison (à valider)",
    pages: ["confidentialite"],
  },
} satisfies Record<string, LegalField>;

export type LegalFieldKey = keyof typeof legalFields;

/**
 * Conditions commerciales reprises des réglages du site (content/settings.ts) : ce sont des
 * paramètres de démonstration à confirmer, non des informations inventées sur l'entreprise.
 */
export const commercialChecks = [
  "Seuil de livraison offerte, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold).",
  "Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) et prise en charge des frais de retour (offerts en France, à la charge de la cliente hors de France : à confirmer).",
  "Délais de fabrication des précommandes indiqués sur chaque fiche, et moment du débit pour une précommande (au moment de la commande par défaut avec Shopify).",
  "Durée de validité des cartes cadeaux (un an par défaut dans les CGV) et règles de cumul des codes de réduction.",
  "Prix de l’emballage cadeau (content/settings.ts → giftWrapPrice).",
  "Mode de gestion des droits et taxes à l’importation hors Union européenne (perçus à la commande avec Shopify Markets, ou dus à la réception).",
];
