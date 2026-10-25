/**
 * Textes des pages — français. Textes de démonstration à remplacer.
 * Prévu pour l'anglais : dupliquer ce fichier dans content/en/ avec les mêmes clés.
 */

export const nav = {
  primary: [
    { href: "/boutique", label: "Boutique" },
    { href: "/collections", label: "Collections" },
    { href: "/outfits", label: "Outfits" },
    { href: "/la-maison", label: "La Maison" },
    { href: "/atelier", label: "L’Atelier" },
  ],
  secondary: [
    { href: "/journal", label: "Journal" },
    { href: "/bientot", label: "Bientôt" },
    { href: "/presse", label: "Presse" },
    { href: "/contact", label: "Contact & rendez-vous" },
    { href: "/faq", label: "Questions fréquentes" },
    { href: "/livraison-retours", label: "Livraison & retours" },
    { href: "/suivi", label: "Suivre une commande" },
  ],
  legal: [
    { href: "/cgv", label: "Conditions générales de vente" },
    { href: "/cgu", label: "Conditions d’utilisation" },
    { href: "/retractation", label: "Rétractation en ligne" },
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/propriete-intellectuelle", label: "Propriété intellectuelle" },
    { href: "/confidentialite", label: "Confidentialité" },
    { href: "/cookies", label: "Politique cookies" },
    { href: "/assistant-ia", label: "Assistante IA" },
  ],
};

/**
 * Pages de la Maison (accueil, La Maison, L’Atelier, contact) : leurs textes vivent dans les
 * documents de contenu (content/site/fr/accueil.json, la-maison.json, atelier.json, contact.json),
 * modifiables dans l’éditeur « Édition ». Restent ici leurs descriptions, lues par l’index de
 * recherche (lib/search/index.ts) : à garder identiques au « seo » de ces documents.
 */
export const maison = {
  seo: {
    title: "La Maison, l’histoire d’Awrea Paris | Awrea Paris",
    description:
      "L’histoire d’Awrea Paris : une fascination pour les contrastes, la dentelle et les drapés, puis la force de la dorure. La délicatesse rencontre la force.",
  },
};

export const atelier = {
  seo: {
    title: "L’Atelier, des pièces créées sur demande | Awrea Paris",
    description:
      "Les pièces Awrea Paris naissent sur demande, entre les mains d’artisans français, avec attention pour leurs conditions de travail et pour l’environnement. Il n’y a pas de stock.",
  },
};

export const contact = {
  seo: {
    title: "Contact | Awrea Paris",
    description: "Écrire à Awrea Paris : une question sur une pièce, une taille ou une commande. La Maison vous répond par e-mail.",
  },
};

/** Rubrique « Outfits » du compte Instagram de la Maison (ancienne page « Silhouettes », redirigée). */
export const outfits = {
  seo: {
    title: "Outfits, des tenues complètes | Awrea Paris",
    description:
      "Les outfits Awrea Paris : des tenues complètes composées par la créatrice, en dentelle, drapés et satin. Chaque pièce est créée sur demande par des artisans français.",
  },
  h1: "Outfits",
  lead: "Chaque tenue est composée par la créatrice. Elle se commande entière, en un seul geste, ou pièce par pièce, dans votre taille.",
};

export const boutique = {
  seo: {
    title: "Boutique de robes, bodys et tops en dentelle | Awrea Paris",
    description:
      "La boutique Awrea Paris : robes, bodys et tops en dentelle, drapés et dorure. Chaque pièce est créée sur demande, sans stock, par des artisans français.",
  },
  h1: "Boutique",
  lead: "Chaque pièce est créée sur demande, dans votre taille, par des artisans français. Sa fiche indique son délai de fabrication.",
  categories: [
    { value: "robe", label: "Robes" },
    { value: "body", label: "Bodys" },
    { value: "top", label: "Tops" },
    { value: "jupe", label: "Jupes" },
    { value: "accessoire", label: "Accessoires" },
  ],
};

export const collectionsPage = {
  seo: {
    title: "Les collections, Hypnotic Lace | Awrea Paris",
    description:
      "Les collections Awrea Paris : Hypnotic Lace, la dentelle, les drapés et l’éclat de la dorure. Des pièces créées sur demande par des artisans français.",
  },
  h1: "Collections",
  lead: "Chaque collection part d’une intention de la créatrice. Ses pièces sont créées sur demande, par des artisans français.",
};

export const journalPage = {
  seo: {
    title: "Journal, moodboards et coulisses | Awrea Paris",
    description:
      "Le Journal d’Awrea Paris : moodboards, coulisses des shootings, savoir-faire de la dentelle et lettres de l’atelier.",
  },
  h1: "Journal",
  lead: "Moodboards, coulisses des shootings, histoires de matières : les carnets de l’atelier, ouverts.",
};

export const pressePage = {
  seo: {
    title: "Presse, parutions et contact | Awrea Paris",
    description:
      "Awrea Paris dans la presse : parutions, kit presse et contact pour les journalistes, stylistes et collaborations.",
  },
  h1: "Presse",
  lead: "Parutions, prêts de pièces pour shootings, collaborations : l’atelier répond à toutes les demandes presse.",
};

export const account = {
  seo: {
    title: "Mon compte | Awrea Paris",
    description: "Votre compte Awrea Paris : commandes, retours, adresses et liste d’envies.",
  },
  h1: "Mon compte",
};

