/**
 * Informations légales de l'entreprise — REGISTRE UNIQUE.
 *
 * Les valeurs renseignées viennent des informations communiquées par la Maison dans le cahier du
 * site du 10/11/2026 (mentions légales réécrites), de ses premières mentions légales officielles
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
const CAHIER = "Informations communiquées par la Maison (cahier du site du 10/11/2026, mentions légales)";

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
    label: "forme juridique (la mention « entrepreneur individuel » ou « EI » accompagne le nom sur les documents de l’entreprise, article R526-26 du Code de commerce)",
    value: "entrepreneuse individuelle (EI, micro-entreprise)",
    source: CAHIER,
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
    short: "adresse de domiciliation",
    label: "adresse postale de l’entreprise : domiciliation professionnelle pas encore choisie au 12/11/2026 ; l’ancienne adresse n’est plus affichée nulle part sur le site. Rappelée dans l’Atelier, liste « À faire en priorité », tant que le champ est vide. Une fois le contrat de domiciliation signé : déclarer le transfert de l’adresse sur le guichet unique (formalites.entreprises.gouv.fr), puis renseigner ici l’adresse exacte",
    value: "",
    source: "Contrat de domiciliation, puis avis de situation au répertoire SIRENE (avis-situation-sirene.insee.fr) à la nouvelle adresse",
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
    label: "numéro SIRET (il change avec l’adresse de l’établissement : à mettre à jour après la domiciliation)",
    value: "100 222 926 00014",
    source: CAHIER,
    pages: ["mentions-legales", "cgv", "cgu", "confidentialite"],
  },
  activite: {
    short: "activité déclarée",
    label: "activité déclarée et code APE (code 7410Z confirmé par la créatrice le 12/11/2026 : il couvre son activité)",
    value: "Activités spécialisées de design (code APE 7410Z)",
    source: `${CAHIER}, code confirmé par la créatrice le 12/11/2026`,
    pages: ["mentions-legales"],
  },
  tva: {
    short: "n° de TVA intracommunautaire",
    label: "numéro de TVA intracommunautaire : sans objet tant que la Maison relève de la franchise en base, confirmée par la créatrice le 10/11 puis le 12/11/2026, sans chiffre d’affaires à ce jour (mention « TVA non applicable, article 293 B du Code général des impôts. » sur le site, à l’article 2 des CGV, au récapitulatif de commande, dans l’e-mail de confirmation et sur chaque facture). Seuil surveillé : 85 000 € de ventes par an (`shop.franchiseThreshold`, alerte de l’agent de comptabilité à 80 %). À renseigner seulement si la Maison sort un jour de la franchise : passer alors `shop.vatRegime` à « tva20 » dans content/settings.ts",
    value: "",
    source: "Espace professionnel impots.gouv.fr (seulement en cas de sortie de la franchise en base)",
    pages: [],
    sansObjet: true,
  },
  directricePublication: {
    short: "directrice de la publication",
    label: "nom et prénom de la directrice de la publication",
    value: "Léane Soubrier",
    source: CAHIER,
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
    source: CAHIER,
    pages: ["mentions-legales", "cgv"],
  },
  mediateur: {
    short: "médiateur de la consommation",
    label: "médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation ; pas encore choisi au 12/11/2026 : adhérer à un médiateur référencé par la CECMC avant la mise en ligne publique, LEGAL-A-COMPLETER.md). Rappelé dans l’Atelier, liste « À faire en priorité », tant que le champ est vide",
    value: "",
    source: "Convention signée avec un médiateur référencé par la CECMC (liste officielle sur economie.gouv.fr, lien dans l’Atelier)",
    pages: ["mentions-legales", "cgv"],
  },
  hebergeur: {
    short: "hébergeur du site",
    label: "hébergeur du site : dénomination et adresse (le site est déployé sur Vercel ; adresse donnée par la politique de confidentialité de Vercel). Aucun numéro de téléphone public trouvé : le site vercel.com est donné comme moyen de contact",
    value: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    source: "Configuration technique du site (vercel.json, déploiement Vercel) et politique de confidentialité de Vercel (vercel.com/legal/privacy-policy)",
    pages: ["mentions-legales"],
  },
  marque: {
    short: "n° de la marque à l’INPI",
    label: "numéro de la marque « Awrea Paris », déposée à l’INPI (communiqué par la créatrice le 12/11/2026 ; la date de dépôt n’a pas été communiquée et n’est pas publiée)",
    value: "5225836",
    source: "Informations communiquées par la créatrice le 12/11/2026 (dépôt à l’INPI, consultable sur data.inpi.fr)",
    pages: ["propriete-intellectuelle", "mentions-legales"],
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
    label: "prestataire du paiement en plusieurs fois (sans objet : le site ne le propose pas, l’article 4 des CGV prévoit un paiement comptant, en totalité, à la commande)",
    value: "",
    source: "Sans objet",
    pages: [],
    sansObjet: true,
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
 * Les CGV, corrigées le 12/11/2026, les reprennent (LEGAL-A-COMPLETER.md).
 */
export const commercialChecks = [
  "Zones, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold) : alignés sur l’article 5 des CGV, livraison en France métropolitaine seulement. L’Europe, l’international et le retrait sur rendez-vous ne sont plus proposés tant que les CGV ne les prévoient pas. Tarifs et seuil de la livraison offerte (250 €) à confirmer.",
  "Moyens de paiement (content/settings.ts → paymentMethods) : alignés sur l’article 4 des CGV (carte bancaire, Apple Pay, Google Pay, PayPal, par le prestataire Stripe) ; Shop Pay et le paiement en plusieurs fois ne sont plus proposés. Activer les mêmes moyens dans le compte Stripe de la Maison.",
  "Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) ; frais de retour à la charge de la cliente (article 7 des CGV).",
  "Délais de fabrication des pièces créées sur demande, indiqués sur chaque fiche, dans le panier et au paiement (provisoires : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines, liste dans `ACTIVATION.md`, étape 4.2 bis), puis 5 à 10 jours ouvrés de livraison (article 5 des CGV), et moment du débit (à la commande, article 4 des CGV).",
  "Durée de validité des cartes cadeaux et règles de cumul des codes de réduction (les CGV n’en parlent pas).",
  "Prix de l’emballage cadeau (content/settings.ts → giftWrapPrice).",
];
