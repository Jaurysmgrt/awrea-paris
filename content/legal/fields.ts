/**
 * Informations légales de l'entreprise — REGISTRE UNIQUE.
 *
 * Les valeurs renseignées viennent des mentions légales officielles de la Maison
 * (ressources-awrea/MENTIONS LÉGALES) et de ses conditions générales de vente officielles.
 * Aucune autre information n'est inventée : tant qu'un champ est vide, il s'affiche sur le site sous
 * la forme d'un repère « [À COMPLÉTER : …] » bien visible, et il est listé dans LEGAL-A-COMPLETER.md
 * (régénéré par `npm run legal:todo`).
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
  /** information sans objet pour la Maison : rien à publier, rien à compléter */
  sansObjet?: boolean;
}

/** Source des informations déjà renseignées. */
const ML = "Mentions légales officielles de la Maison (ressources-awrea/MENTIONS LÉGALES)";

export const legalFields = {
  raisonSociale: {
    short: "nom de l’entrepreneuse",
    label: "nom de l’entrepreneuse (entreprise individuelle)",
    value: "Léane Soubrier",
    source: ML,
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite", "propriete-intellectuelle", "retractation"],
  },
  nomCommercial: {
    short: "nom commercial",
    label: "nom commercial sous lequel l’entreprise exerce",
    value: "Awrea Paris",
    source: ML,
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite", "retractation"],
  },
  formeJuridique: {
    short: "forme juridique",
    label: "forme juridique",
    value: "entrepreneur individuel (micro-entreprise)",
    source: ML,
    pages: ["mentions-legales", "cgu", "confidentialite"],
  },
  capital: {
    short: "capital social",
    label: "capital social (sans objet pour une entreprise individuelle : aucune mention à publier)",
    value: "",
    source: "Sans objet",
    pages: [],
    sansObjet: true,
  },
  siege: {
    short: "adresse de l’entreprise",
    label: "adresse postale de l’entreprise",
    value: "46 rue Paul Déroulède, 78290 Croissy-sur-Seine, France",
    source: ML,
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite", "retractation"],
  },
  immatriculation: {
    short: "registre d’immatriculation",
    label: "registre d’immatriculation (inscription au RNE le 05/02/2026, début d’activité le 01/04/2026)",
    value: "registre national des entreprises (RNE)",
    source: ML,
    pages: ["mentions-legales", "cgu", "confidentialite"],
  },
  siren: {
    short: "n° SIREN",
    label: "numéro SIREN",
    value: "100 222 926",
    source: ML,
    pages: ["mentions-legales", "cgu", "confidentialite"],
  },
  siret: {
    short: "n° SIRET",
    label: "numéro SIRET",
    value: "100 222 926 00014",
    source: ML,
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite"],
  },
  tva: {
    short: "n° de TVA",
    label: "numéro de TVA intracommunautaire, ou la mention « TVA non applicable, art. 293 B du CGI » si la micro-entreprise est en franchise de TVA (les CGV officielles annoncent des prix « HT et TTC »)",
    value: "",
    source: "Espace professionnel impots.gouv.fr",
    pages: ["mentions-legales"],
  },
  directricePublication: {
    short: "directrice de la publication",
    label: "nom et prénom de la directrice de la publication (les mentions officielles ne la nomment pas ; pour une entreprise individuelle, c’est en principe l’entrepreneuse elle-même, Léane Soubrier : à confirmer)",
    value: "",
    source: "Représentante légale de l’entreprise",
    pages: ["mentions-legales"],
  },
  email: {
    short: "e-mail de contact",
    label: "adresse e-mail de contact",
    value: "awrea.contact@gmail.com",
    source: ML,
    pages: ["mentions-legales", "cgv", "confidentialite", "retractation", "propriete-intellectuelle"],
  },
  telephone: {
    short: "téléphone",
    label: "numéro de téléphone",
    value: "06 99 55 74 43",
    source: ML,
    pages: ["mentions-legales", "cgv"],
  },
  mediateur: {
    short: "médiateur de la consommation",
    label: "médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation ; ni les CGV ni les mentions officielles n’en nomment)",
    value: "",
    source: "Convention signée avec un médiateur référencé par la CECMC (liste sur economie.gouv.fr)",
    pages: ["mentions-legales"],
  },
  hebergeur: {
    short: "hébergeur du site",
    label: "hébergeur du nouveau site : dénomination, adresse et téléphone (les mentions officielles nomment Wix Online Platform Limited, hébergeur du site Wix ; le nouveau site est prévu sur Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis)",
    value: "",
    source: "Contrat d’hébergement (vercel.com/legal), puis mise à jour des mentions légales officielles",
    pages: ["mentions-legales"],
  },
  marque: {
    short: "n° d’enregistrement de la marque",
    label: "numéro et date d’enregistrement de la marque « Awrea Paris » (les mentions officielles la disent déposée : INPI ou EUIPO)",
    value: "",
    source: "Certificat d’enregistrement INPI (data.inpi.fr) ou EUIPO",
    pages: ["propriete-intellectuelle"],
  },
  creditsPhotos: {
    short: "crédits photos",
    label: "crédits des photographes, vidéastes et mannequins (portrait de la créatrice, futures prises de vue) et étendue des droits cédés",
    value: "",
    source: "Contrats de cession de droits et autorisations de droit à l’image signés",
    pages: ["propriete-intellectuelle", "mentions-legales"],
  },
  regionBase: {
    short: "région d’hébergement de la base",
    label: "région d’hébergement du projet Supabase (base clientes), de préférence dans l’Union européenne (Francfort ou Paris)",
    value: "",
    source: "Réglages du projet Supabase (Project Settings → General)",
    pages: ["confidentialite"],
  },
  regionsPrestataires: {
    short: "régions d’hébergement",
    label: "régions d’hébergement retenues pour Upstash (stockage technique) et Sentry (suivi des erreurs), de préférence dans l’Union européenne",
    value: "",
    source: "Réglages des comptes Upstash et Sentry",
    pages: ["confidentialite"],
  },
  outilEmails: {
    short: "outil d’e-mails",
    label: "outil d’e-mails marketing retenu : Brevo (France) ou Klaviyo (États-Unis)",
    value: "",
    source: "Choix de la maison",
    pages: ["confidentialite"],
  },
  paiementFractionne: {
    short: "prestataire du paiement fractionné",
    label: "prestataire du paiement en plusieurs fois (par exemple Shop Pay Installments, Klarna ou Alma) s’il est activé dans Shopify ; les CGV officielles ne le prévoient pas",
    value: "",
    source: "Shopify → Paramètres → Paiements",
    pages: ["confidentialite"],
  },
  delaiConservationDevis: {
    short: "durée de conservation",
    label: "durée de conservation des demandes de rendez-vous et de sur-mesure sans suite (proposé : 3 ans après le dernier échange)",
    value: "",
    source: "Décision de la maison (à valider)",
    pages: ["confidentialite"],
  },
} satisfies Record<string, LegalField>;

export type LegalFieldKey = keyof typeof legalFields;

/**
 * Conditions commerciales reprises des réglages du site (content/settings.ts) : ce sont des
 * paramètres de démonstration à confirmer, non des informations inventées sur l'entreprise.
 * Leurs écarts avec les CGV officielles sont détaillés dans LEGAL-A-COMPLETER.md.
 */
export const commercialChecks = [
  "Zones, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold) : les CGV officielles (article 5) prévoient une livraison en France métropolitaine seulement, en 5 à 10 jours ouvrés.",
  "Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) ; frais de retour à la charge de la cliente (article 7 des CGV officielles).",
  "Délais de fabrication des pièces créées sur demande, indiqués sur chaque fiche, dans le panier et au paiement (provisoires : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines, liste dans `ACTIVATION.md`, étape 4.2 bis), et moment du débit (à la commande, comme le prévoit l’article 4 des CGV officielles).",
  "Durée de validité des cartes cadeaux et règles de cumul des codes de réduction (les CGV officielles n’en parlent pas).",
  "Prix de l’emballage cadeau (content/settings.ts → giftWrapPrice).",
  "Mode de gestion des droits et taxes à l’importation hors Union européenne, si la livraison hors de France est maintenue (perçus à la commande avec Shopify Markets, ou dus à la réception).",
];
