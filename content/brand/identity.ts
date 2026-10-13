/**
 * Identité de la marque — SOURCE UNIQUE.
 * Nom, description, liens et coordonnées sont repris à l'identique partout :
 * pages, données structurées Schema.org, llms.txt, e-mails, agents IA, assistant.
 * Les valeurs marquées « À COMPLÉTER » sont à remplacer par les informations réelles.
 */
export const identity = {
  name: "Awrea Paris",
  legalName: "AWREA PARIS", // À COMPLÉTER : raison sociale exacte
  shortName: "Awrea",
  alternateNames: ["AWREA", "Awrea", "AWREA PARIS", "Awrea Paris"],
  tagline: "Consommer plus juste.",
  founderTitle: "La Créatrice",
  founderQuote:
    "La couleur n’est pas au rendez-vous mais la lumière de la dorure suffit à révéler l’essentiel.",
  description:
    "Awrea Paris est une marque de prêt-à-porter féminin fondée par une jeune créatrice parisienne. Chaque pièce est fabriquée à la main à Paris, en pièce unique ou en très petite série numérotée, autour d’une signature : la dentelle noire associée à des matières fluides — jersey, satin — et la dorure mêlée aux couleurs neutres.",
  shortDescription:
    "Prêt-à-porter féminin fait main à Paris. Dentelle noire, jersey, satin et dorure, en pièces uniques et séries numérotées.",
  manifesto: "Consommer plus juste. Une création exclusive n’a pas besoin d’être réservée à l’ultra luxe.",
  foundingLocation: "Paris, France",
  /** À COMPLÉTER : année de création (non publiée tant qu’elle vaut null) */
  foundingYear: null as number | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.awreaparis.com",
  email: "contact@awreaparis.com", // À COMPLÉTER
  phone: "", // À COMPLÉTER (facultatif)
  /** À COMPLÉTER : adresse de l'atelier (rue et code postal publiés seulement s'ils sont renseignés) */
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
    "robe dentelle noire fait main Paris",
    "body dentelle créatrice française",
    "pièce unique mode femme Paris",
    "prêt-à-porter féminin fait main",
    "mode éthique Paris",
    "dentelle et dorure",
  ],
  currency: "EUR",
  locale: "fr-FR",
} as const;

export type Identity = typeof identity;
