/**
 * Textes visibles de la proposition « atelier », réunis en un seul document (CLAUDE.md : aucun
 * texte en dur dans les composants). À l'intégration, ce module devient les documents de
 * contenu de l'éditeur Édition (content/site/fr/accueil.json, fiche.json, commun.json).
 *
 * Écriture de la créatrice : phrases courtes et concrètes, aucun tiret de ponctuation, boutons
 * aux verbes variés, apostrophe ’, guillemets « » et espaces insécables ( ) écrits ici même.
 * Les faits viennent des données de la Maison (catalogue, réglages, identité) : rien n'est inventé.
 */
import { enLettres } from "./typo";

const NB = " ";

export const commun = {
  entete: {
    allerAuContenu: "Aller au contenu",
    accueil: "Awrea Paris, accueil",
    navigation: "Navigation principale",
    menu: "Menu",
    fermer: "Fermer",
    panier: "Panier",
    panierVide: "Panier, vide",
    panierPieces: (n: number) => `Panier, ${n} pièce${n > 1 ? "s" : ""}`,
    rubriques: [
      { href: "/boutique", label: "Les pièces" },
      { href: "/collections/lace-is-more", label: "La collection" },
      { href: "/atelier", label: "L’atelier" },
      { href: "/la-maison", label: "La Maison" },
    ],
  },
  pied: {
    nom: "Awrea Paris",
    devise: "Pièces façonnées à la main à Paris, numérotées une à une.",
    liens: "Liens du pied de page",
    colonnes: [
      {
        titre: "La Maison",
        liens: [
          { href: "/la-maison", label: "La Maison" },
          { href: "/atelier", label: "L’atelier" },
          { href: "/journal", label: "Journal" },
          { href: "/presse", label: "Presse" },
        ],
      },
      {
        titre: "Vous accompagner",
        liens: [
          { href: "/contact", label: "Contact et rendez-vous" },
          { href: "/livraison-retours", label: "Livraison et retours" },
          { href: "/faq", label: "Questions fréquentes" },
          { href: "/compte", label: "Mon compte" },
          { href: "/recherche", label: "Rechercher" },
        ],
      },
      {
        titre: "Informations",
        liens: [
          { href: "/mentions-legales", label: "Mentions légales" },
          { href: "/cgv", label: "Conditions générales de vente" },
          { href: "/confidentialite", label: "Confidentialité" },
          { href: "/cookies", label: "Cookies" },
        ],
      },
    ],
    legendeTitre: "Légende du patron",
    /** les signes du patron, et ce qu'ils veulent dire sur ce site */
    signes: [
      { signe: "cote", titre: "Cote", texte: "Une mesure prise à l’atelier." },
      { signe: "couture", titre: "Ligne de couture", texte: "Le passage du fil." },
      { signe: "cran", titre: "Cran", texte: "Un repère d’assemblage. Ici, un exemplaire de la série." },
      { signe: "fil", titre: "Droit-fil", texte: "Le sens du tissu." },
      { signe: "feston", titre: "Feston", texte: "Le bord de la dentelle." },
      { signe: "epingle", titre: "Épingle", texte: "Une note de l’atelier." },
    ],
    chute: {
      alt: "Un reste de dentelle noire, découpé autour des fleurs",
      texte: "Un reste de la dentelle d’Odessa. À l’atelier, les chutes deviennent des accessoires.",
    },
  },
  signes: {
    droitFil: "Droit-fil",
    echantillon: "Échantillon",
    voirMatiere: "voir la matière de près",
    noteEpinglee: "Une note épinglée dans la dentelle",
    croquis: "Croquis de la créatrice",
    croquisPlace: (piece: string) => `Emplacement réservé au croquis de la créatrice pour la ${piece}`,
    fermer: "Fermer",
    chargement: "Chargement",
    centimetres: (mesure: string) => `${mesure}, en centimètres`,
    enTout: "En tout,",
    aLaMain: "de travail à la main",
  },
  serie: {
    unique: "Pièce unique",
    complete: (total: number) => `Série complète, ${total} exemplaires`,
    numero: (n: number, total: number) => `Numéro ${n} sur ${total}`,
    liste: (total: number) => `Série de ${total} exemplaires numérotés`,
    attribue: ", déjà attribué",
    prochain: ", le prochain exemplaire",
    libre: ", à venir",
    /** la phrase de la série, dans la voix de l'atelier */
    phrase: (total: number, produced: number) => {
      if (total === 1) return produced ? "Pièce unique. Elle a trouvé sa place." : "Pièce unique. Il n’en existera pas d’autre.";
      const debut = `${enLettres(total, true)} exemplaires.`;
      if (produced >= total) return `${debut} Tous ont trouvé leur place.`;
      if (produced === 0) return `${debut} Aucun n’est encore attribué.`;
      if (produced === 1) return `${debut} Le premier a trouvé sa place.`;
      return `${debut} ${enLettres(produced, true)} ont déjà trouvé leur place.`;
    },
  },
};

export const accueil = {
  ouverture: {
    kicker: "Awrea Paris, prêt-à-porter féminin",
    titre: "Du premier trait au dernier point, fait main à Paris.",
    texte:
      "Chaque pièce commence au crayon, dans un carnet. Elle devient patron, puis toile, épinglée sur le mannequin. La dentelle se coupe motif par motif, s’assemble et se finit à la main, dans notre atelier parisien. Puis la pièce reçoit son numéro.",
    cta: "Voir la robe Odessa",
    vue: "vue de dos",
  },
  registre: {
    eyebrow: "La collection en cours",
    texte:
      "Une robe, deux bodys, un top. Chaque pièce de Lace is more est coupée, assemblée et finie à la main dans notre atelier parisien, puis numérotée. Lorsque la série est complète, elle ne revient pas.",
    compte: (pieces: number, exemplaires: number) => `${enLettres(pieces, true)} pièces, ${enLettres(exemplaires)} exemplaires numérotés`,
    cta: "Parcourir la collection",
  },
  atelier: {
    eyebrow: "L’atelier",
    titre: "Le temps qu’il faut",
    alt: "Deux mains épinglent une toile noire, un mètre ruban le long du tissu",
    legende: "La toile est épinglée, ajustée, reprise.",
    heures: (total: number) => `${total} heures de travail à la main`,
    cote: "pour une robe Odessa, du croquis aux finitions",
    texte: (dessin: number, coupe: number, montage: number) =>
      `${enLettres(dessin, true, true)} heures pour le dessin et le patronage. ${enLettres(coupe, true, true)} pour la coupe. ${enLettres(montage, true, true)} pour l’assemblage et les finitions, à la main. C’est le temps d’une seule robe.`,
    cta: "Entrer dans l’atelier",
  },
  manifeste: {
    eyebrow: "Manifeste",
    titre: "Consommer plus juste",
    texte:
      "Une création exclusive n’a pas besoin d’être réservée à l’ultra luxe. Nous faisons peu de pièces, à la main, à Paris. Nous les numérotons pour qu’elles restent rares, et nous les vendons au prix juste pour qu’elles restent portées.",
    cta: "Lire le manifeste",
  },
  lettres: {
    eyebrow: "Lettres de l’atelier",
    titre: "Une lettre par saison",
    texte: "Les nouvelles pièces, avant leur mise en ligne. Les dates d’essayage à l’atelier. Et les coulisses des prises de vue. Une lettre par saison, jamais plus.",
  },
};

export const fiche = {
  dos: {
    eyebrow: "Le dos",
    titre: "Lacée œillet après œillet",
    legende: "le dos",
    croquisNote: "Cette feuille attend le croquis original d’Odessa, dessiné au crayon par la créatrice.",
    signature: "La Créatrice, carnet de Lace is more",
  },
  conseil: {
    question: "Une question sur la taille ou le tombé\u00a0?",
    cta: "Demander à l’atelier",
  },
  notice: (delai: string, semaines: number, retours: number) =>
    `Expédiée sous ${delai} lorsqu’elle est prête. Sur commande, l’atelier la façonne pour vous en ${enLettres(semaines, false, true)} semaines. Retours sous ${retours} jours, pièce non portée.`,
  noticeLien: "Livraison et retours",
  mention: (ref?: string) => (ref ? `Fait main à Paris, réf.${NB}${ref}` : "Fait main à Paris"),
  matiere: {
    eyebrow: "La matière",
    titre: "La peau respire entre les fils",
    cta: "Voir la dentelle de près",
    grand: (piece: string) => `La dentelle de la ${piece}, en grand`,
    tombe: "Le tombé, en mouvement lent",
    composition: "Composition",
    doublure: "Doublure",
    entretien: "Entretien",
  },
  mesure: {
    eyebrow: "La mesure",
    titre: "Votre taille, au centimètre",
    cta: "Prendre rendez-vous pour un essayage",
  },
  facon: {
    eyebrow: "La façon",
    titre: "Façonnée à la main, à Paris",
    texte: "Chaque pièce est coupée, assemblée et finie à la main dans l’atelier parisien de la Maison. Chaque exemplaire reçoit son numéro et un certificat signé par la créatrice.",
    origine: (matiere: string, origine: string | null) => (origine ? `${matiere}, ${origine}.` : `${matiere}. Son origine sera précisée par l’atelier à la mise en vente.`),
    alt: "Ciseaux à broder posés sur une dentelle claire, motifs découpés un à un",
    legende: "La dentelle se découpe motif par motif.",
    cta: "Entrer dans l’atelier",
  },
  suite: {
    eyebrow: (piece: string) => `Avec ${piece}`,
    cta: (piece: string) => `Voir le ${piece}`,
  },
};
