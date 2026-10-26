/**
 * Identité de la marque — SOURCE UNIQUE.
 * Nom, description, liens et coordonnées sont repris à l'identique partout :
 * pages, données structurées Schema.org, llms.txt, e-mails, agents IA, assistant.
 * Les faits de l'entreprise viennent des mentions légales officielles de la Maison
 * (ressources-awrea/MENTIONS LÉGALES, registre légal content/legal/fields.ts). Les valeurs
 * marquées « À COMPLÉTER » sont à remplacer par les informations réelles.
 */
export const identity = {
  name: "Awrea Paris",
  /** nom de l'entrepreneuse : entreprise individuelle exerçant sous le nom commercial Awrea Paris */
  legalName: "Léane Soubrier",
  shortName: "Awrea",
  alternateNames: ["AWREA", "Awrea", "AWREA PARIS", "Awrea Paris"],
  tagline: "Consommer plus juste.",
  founderTitle: "La Créatrice",
  founder: "Léane Soubrier",
  founderQuote:
    "La couleur n’est pas au rendez-vous mais la lumière de la dorure suffit à révéler l’essentiel.",
  description:
    "Awrea Paris est une maison de prêt-à-porter féminin fondée par une jeune créatrice. Chaque pièce est créée sur demande, sans stock, par des artisans français. Sa signature, c’est la dentelle noire posée sur des matières fluides, le jersey et le satin. Certaines pièces portent une touche de dorure.",
  shortDescription:
    "Prêt-à-porter féminin créé sur demande par des artisans français. Dentelle noire, jersey, satin et dorure, sans stock.",
  manifesto: "Consommer plus juste. Une création exclusive n’a pas besoin d’être réservée à l’ultra luxe.",
  /** commune d'immatriculation de l'entreprise (mentions légales officielles) */
  foundingLocation: "Croissy-sur-Seine, France",
  /**
   * À COMPLÉTER : année de création de la Maison (non publiée tant qu'elle vaut null). L'entreprise
   * est inscrite au RNE depuis le 05/02/2026 (début d'activité le 01/04/2026) : confirmer l'année à publier.
   */
  foundingYear: null as number | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.awreaparis.com",
  email: "awrea.contact@gmail.com",
  phone: "06 99 55 74 43",
  /** forme juridique et immatriculation (mentions légales officielles) */
  legalForm: "Entrepreneur individuel (micro-entreprise)",
  siren: "100 222 926",
  siret: "100 222 926 00014",
  /** inscription au registre national des entreprises et début d'activité */
  registeredOn: "2026-02-05",
  activityStart: "2026-04-01",
  /** adresse de l'entreprise (mentions légales officielles) */
  legalAddress: {
    streetAddress: "46 rue Paul Déroulède",
    postalCode: "78290",
    addressLocality: "Croissy-sur-Seine",
    addressCountry: "FR",
  },
  /**
   * À COMPLÉTER : adresse de l'atelier où la créatrice reçoit sur rendez-vous (rue et code postal
   * publiés seulement s'ils sont renseignés). Elle peut différer de l'adresse de l'entreprise.
   */
  address: {
    streetAddress: "",
    postalCode: "",
    addressLocality: "Paris",
    addressCountry: "FR",
  },
  social: {
    instagram: "https://www.instagram.com/awrea.paris",
    instagramHandle: "@awrea.paris",
    linktree: "https://linktr.ee/awrea.paris",
  },
  keywords: [
    "Awrea Paris",
    "Awrea",
    "créatrice française",
    "robe dentelle noire créatrice française",
    "body dentelle créatrice française",
    "prêt-à-porter féminin sur demande",
    "vêtements créés sur demande par des artisans français",
    "mode éthique sans stock",
    "dentelle et dorure",
  ],
  currency: "EUR",
  locale: "fr-FR",
} as const;

export type Identity = typeof identity;
