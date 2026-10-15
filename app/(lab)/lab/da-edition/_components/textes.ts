/**
 * Direction « édition » (laboratoire de design) : TOUS les textes du prototype, en un seul module.
 * Ils deviendront des documents de l'éditeur visuel (content/site/fr/). Les données des pièces
 * (noms, accroches, matières, prix, numéros d'édition, temps de fabrication) viennent du catalogue,
 * jamais d'ici. Écriture : MARQUE.md § 2 (aucun tiret de ponctuation, guillemets « » et espaces
 * insécables, apostrophe ’, aucune formule interdite, boutons concrets et variés).
 */
import type { Category } from "@/lib/commerce/types";

/** espace insécable (avant ; : ! ? », après «, entre un nombre et son unité) */
const nb = " ";

/** Le numéro en cours : la collection, lue comme le numéro d'une revue. */
export const numero = {
  marque: "Awrea Paris",
  titre: "Lace is more",
  saison: "Automne-Hiver 2026",
  ligne: "Lace is more, automne-hiver 2026",
};

/** Le numéro d'édition, quand il est composé en grand. */
export const edition = {
  unique: "Pièce unique",
  lecteur: (n: number, total: number) => `Exemplaire numéro ${n} sur ${total}`,
  folio: (n: number, total: number) => `N°${nb}${n}${nb}/${nb}${total}`,
};

export const manchette = {
  accueil: "Awrea Paris, retour à la une",
  navigation: "Rubriques",
  rubriques: [
    { href: "/boutique", label: "Les pièces" },
    { href: "/collections", label: "Collections" },
    { href: "/outfits", label: "Outfits" },
    { href: "/la-maison", label: "La Maison" },
    { href: "/atelier", label: "L’Atelier" },
  ],
  courrier: "Courrier",
  rechercher: { href: "/recherche", label: "Rechercher" },
  compte: { href: "/compte", label: "Compte" },
  panier: "Panier",
  piecesAuPanier: (n: number) => `${n} pièce${n > 1 ? "s" : ""} dans le panier`,
  ouvrir: "Sommaire",
  fermer: "Fermer",
  panneau: "Sommaire du site",
};

export const une = {
  h1: "Awrea Paris, prêt-à-porter féminin fait main à Paris",
  etiquette: "Le numéro en cours",
  chapeau: "Quatre pièces en dentelle noire, en jersey et en satin. Chacune est coupée, cousue et numérotée à la main, à Paris.",
  cta: "Voir la robe Odessa",
  enCouverture: "En couverture",
};

export const sommaire = {
  rubrique: "Sommaire",
  titre: "Dans ce numéro",
  aria: "Sommaire du numéro",
  atelier: { titre: "L’atelier", genre: "Reportage" },
  lettre: { titre: "La lettre et le courrier", genre: "Correspondance" },
};

export const edito = {
  rubrique: "Édito",
  titre: "Consommer plus juste",
  texte: [
    "Une création exclusive n’a pas besoin d’être réservée à l’ultra luxe.",
    "Nous faisons peu de pièces, à la main, à Paris. Nous les numérotons pour qu’elles restent rares, et nous les vendons au prix juste pour qu’elles restent portées.",
  ],
  cta: { href: "/la-maison", label: "Lire la lettre de la créatrice" },
};

export const portfolio = {
  rubrique: { robe: "La robe", body: "Le body", top: "Le top", jupe: "La jupe", accessoire: "L’accessoire" } satisfies Record<Category, string>,
  voir: { robe: "Voir la robe", body: "Voir le body", top: "Voir le top", jupe: "Voir la jupe", accessoire: "Voir l’étole" } satisfies Record<Category, string>,
  /** la légende de mode, comme dans un magazine : la photographie est sur la page d'en face */
  /** article indéfini et démonstratif de chaque catégorie (« une Robe Odessa », « cette robe ») */
  un: { robe: "une", body: "un", top: "un", jupe: "une", accessoire: "une" } satisfies Record<Category, string>,
  ce: { robe: "cette robe", body: "ce body", top: "ce top", jupe: "cette jupe", accessoire: "cette étole" } satisfies Record<Category, string>,
  ciContre: "Ci-contre",
  ciDessus: "Ci-dessus",
  maison: "Awrea Paris",
};

export const atelier = {
  rubrique: "Reportage",
  titre: "Le temps qu’il faut",
  mesure: (heures: number) => `${heures}${nb}h`,
  mesureLabel: (article: string, piece: string) => `de travail à la main pour ${article} ${piece}, du patron au dernier point.`,
  texte: [
    "Du croquis au dernier point, chaque pièce passe entre les mains de la créatrice. Le patron est épinglé sur le mannequin, repris, épinglé encore, jusqu’à ce que le tombé soit juste.",
    "La dentelle se coupe motif par motif, aux ciseaux à broder, pour qu’aucune fleur ne soit tranchée par une couture. Les assemblages les plus fins sont cousus à l’aiguille. Puis la pièce reçoit son numéro et un certificat signé.",
  ],
  legende: "Dans l’atelier, à Paris. Une couture épinglée, le mètre ruban posé contre la toile.",
  alt: "Mains qui épinglent une couture sur une toile noire, un mètre ruban posé à côté",
  cta: { href: "/atelier", label: "Entrer dans l’atelier" },
};

export const lettre = {
  rubrique: "La lettre",
  titre: "Une lettre par saison",
  texte: "Les nouvelles pièces avant leur mise en ligne, les dates d’essayage à l’atelier, les coulisses des prises de vue. Rien de plus.",
};

export const courrier = {
  rubrique: "Le courrier",
  titre: "La Maison vous répond",
  texte: "Pour une taille, une matière ou un délai de fabrication, posez votre question ici. L’assistante de la Maison répond aussitôt, et passe la main à l’atelier quand il le faut.",
  cta: "Écrire au courrier",
};

export const ours = {
  titre: "Ce numéro",
  aria: "Ours du numéro",
  description: "Prêt-à-porter féminin fait main à Paris, en pièces uniques et en très petites séries numérotées.",
  couture: "Couture et patronage par la créatrice, dans son atelier parisien.",
  /** le détail inattendu de l'accueil : le tirage du numéro, c'est le nombre de pièces cousues */
  tirage: (total: number, reste: number) =>
    `Tirage de ce numéro${nb}: ${total} pièces, numérotées à la main. Il en reste ${reste} à l’atelier.`,
  instagram: "Instagram",
  liens: [
    { href: "/contact", label: "Contact et rendez-vous" },
    { href: "/faq", label: "Questions fréquentes" },
    { href: "/livraison-retours", label: "Livraison et retours" },
    { href: "/compte", label: "Compte" },
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/cgv", label: "Conditions de vente" },
    { href: "/confidentialite", label: "Confidentialité" },
    { href: "/cookies", label: "Cookies" },
  ],
  rubriqueLiens: "Pour vous",
  rubriqueAffichage: "Lecture",
};

export const fiche = {
  rubrique: "Le sujet",
  /** l'exergue de chaque pièce, tirée de sa description (un champ éditable par pièce) */
  exergue: {
    "robe-odessa": "On le serre à sa mesure. La robe s’ajuste à vous, et non l’inverse.",
  } as Record<string, string>,
  article: { rubrique: "L’article", titre: (piece: string) => `${piece}, de près` },
  legendes: {
    dos: "Le dos, lacé de satin, œillet après œillet.",
    atelier: "À l’atelier, une dentelle découpée motif par motif, aux ciseaux à broder.",
    atelierAlt: "Motifs de dentelle brodée posés sur une table en bois, une paire de ciseaux à broder dessus",
  },
  planche: {
    rubrique: "La planche d’atelier",
    titre: "Avant la matière, le trait",
    feuille: "Ici viendra le croquis de la créatrice, dessiné avant la première coupe.",
    feuilleNote: "Feuille réservée",
    notes: "Notes de patronage",
  },
  technique: {
    titre: "Fiche d’atelier",
    mesureLabel: "de travail à la main, à l’atelier",
    matiere: "Matière",
    doublure: "Doublure",
    coupe: "Coupe",
    mannequin: "Mannequin",
    etapes: "Les étapes",
    heures: (h: number) => `${h}${nb}h`,
  },
  pratique: {
    rubrique: "Le pratique",
    entretien: "Entretien",
    livraison: "Livraison et retours",
    livraisonTexte: (delai: string, seuil: string, jours: number) =>
      `Les pièces disponibles partent sous ${delai}, les pièces sur commande à la fin de leur délai de fabrication. La livraison est offerte en France dès ${seuil}. Vous disposez de ${jours} jours pour nous retourner une pièce non portée, avec son certificat.`,
    essayage: "Pour un doute sur la taille, l’atelier vous reçoit sur rendez-vous, essaie la pièce avec vous et l’ajuste si besoin.",
    cta: { href: "/contact#rendez-vous", label: "Prendre rendez-vous" },
  },
  suite: { rubrique: "Page suivante", titre: "Dans le même numéro" },
  /** le détail inattendu de la fiche : le temps de lecture face au temps de façon */
  lecture: (minutes: number, heures: number, cettePiece: string) =>
    `Lecture de cette page${nb}: ${minutes}${nb}minute${minutes > 1 ? "s" : ""}. Façon de ${cettePiece}${nb}: ${heures}${nb}heures, à la main.`,
};

export const bon = {
  titre: "Bon de commande",
  exemplaire: (n: number, total: number, reste: number) =>
    `Exemplaire N°${nb}${n} sur ${total}. ${reste === 1 ? "C’est le dernier de la série." : `Il en reste ${reste} à l’atelier.`}`,
  unique: "Pièce unique.",
  complete: "La série est complète. Une nouvelle pièce peut être façonnée sur commande.",
  faitMain: "Fait main à Paris, dans l’atelier de la créatrice.",
  taille: "Taille",
  trouver: "Trouver ma taille",
  choisir: "Choisissez votre taille.",
  erreur: "Choisissez d’abord une taille.",
  disponible: (taille: string, delai: string) => `Taille ${taille} disponible, expédiée sous ${delai}.`,
  derniere: (taille: string, delai: string) => `Taille ${taille}, la dernière pièce dans cette taille. Expédiée sous ${delai}.`,
  commande: (taille: string, semaines: number) => `Taille ${taille} sur commande${nb}: façonnée pour vous en ${semaines}${nb}semaines, puis expédiée.`,
  epuisee: (taille: string) => `La taille ${taille} est épuisée.`,
  ajouter: "Ajouter au panier",
  precommander: "Précommander",
  ajoutee: (piece: string, taille: string) => `${piece}, taille ${taille}, ajoutée au panier.`,
  prevenir: "Être prévenue",
  epuiseeTout: "Cette pièce est aujourd’hui épuisée. L’atelier peut vous écrire quand un nouvel exemplaire sortira.",
  barreChoisir: "Choisir ma taille",
  guide: { titre: "Votre taille", fermer: "Fermer le guide des tailles" },
};
