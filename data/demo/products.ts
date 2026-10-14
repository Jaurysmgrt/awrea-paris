/**
 * Catalogue de DÉMONSTRATION — textes et prix provisoires, visuels provisoires.
 * En production, ces données viennent de Shopify (Storefront API) ; ce fichier sert
 * au développement sans compte Shopify et de modèle pour la saisie des fiches.
 */
import type { Image, Product } from "@/lib/commerce/types";

const portrait = (name: string, alt: string): Image => ({ src: `/media/img/${name}`, alt, width: 1200, height: 1800 });

const care = {
  lace: [
    "Lavage à la main à l’eau froide, savon doux.",
    "Ne pas essorer : presser délicatement dans une serviette, sécher à plat.",
    "Repassage doux sur l’envers, sous une pattemouille, en évitant la dentelle.",
    "Ranger à plat ou sur un cintre rembourré, à l’abri de la lumière.",
  ],
  satin: [
    "Nettoyage à sec recommandé.",
    "Repassage doux sur l’envers.",
    "Conserver dans la housse en coton fournie.",
  ],
  jersey: [
    "Lavage à la main ou programme délicat à 30 °C, dans un filet.",
    "Séchage à plat, sans sèche-linge.",
    "Ne pas repasser les plis du drapé : un défroissage vapeur suffit.",
  ],
};

export const products: Product[] = [
  {
    id: "demo-odessa",
    handle: "robe-odessa",
    title: "Robe Odessa",
    tagline: "Une colonne de dentelle noire, lacée dans le dos comme une confidence.",
    category: "robe",
    collection: "lace-is-more",
    price: 69000,
    edition: { total: 5, produced: 2 },
    leadTimeWeeks: 5,
    variants: [
      { id: "odessa-xs", sku: "AW-ODS-XS", size: "XS", quantity: 0, preorder: true },
      { id: "odessa-s", sku: "AW-ODS-S", size: "S", quantity: 1, preorder: true },
      { id: "odessa-m", sku: "AW-ODS-M", size: "M", quantity: 1, preorder: true },
      { id: "odessa-l", sku: "AW-ODS-L", size: "L", quantity: 0, preorder: true },
    ],
    images: [
      portrait("odessa-1", "Robe Odessa en dentelle noire portée de dos sur fond studio clair, longue traîne évasée"),
      portrait("odessa-2", "Dos lacé de la robe Odessa, corset en satin noir et manches en dentelle florale"),
    ],
    detailImage: portrait("odessa-detail", "Détail du laçage et de la dentelle florale de la robe Odessa"),
    video: {
      src: "/media/video/product-odessa.mp4",
      poster: "/media/video/product-odessa.webp",
      alt: "Mouvement lent sur la dentelle de la robe Odessa",
    },
    description: [
      "Odessa est née d’un geste simple : envelopper le corps de dentelle sans jamais l’enfermer. La dentelle florale noire épouse la silhouette jusqu’aux genoux puis s’ouvre en une traîne souple qui suit chacun de vos pas.",
      "Le dos se ferme par un laçage de satin, monté à la main œillet après œillet. On le serre à sa mesure : la robe s’ajuste à vous, et non l’inverse.",
      "Portée seule sur la peau ou sur un body en jersey, elle passe du dîner à la nuit sans rien perdre de sa retenue.",
    ],
    materials: [
      { name: "Dentelle de coton et polyamide", percent: 100 },
    ],
    lining: "Doublure du bustier en satin de soie, 100 % soie.",
    care: care.lace,
    fit: "Coupe ajustée jusqu’aux hanches, évasée en bas. Le laçage permet d’ajuster d’une taille. Si vous hésitez, choisissez la plus petite.",
    model: "Le mannequin mesure 1,74 m et porte une taille S.",
    details: ["Laçage dos en satin, œillets cousus main", "Manches longues en dentelle", "Traîne de 30 cm", "Certificat numéroté signé par la créatrice"],
    completeTheLook: ["body-gaia", "top-kira"],
    seo: {
      title: "Robe Odessa — dentelle noire faite main | Awrea Paris",
      description: "Robe longue en dentelle noire lacée dans le dos, façonnée à la main à Paris en série numérotée de cinq pièces. Une colonne de lumière et d’ombre.",
    },
    tags: ["dentelle", "soirée", "série limitée"],
    publishedAt: "2026-09-12",
  },
  {
    id: "demo-gaia",
    handle: "body-gaia",
    title: "Body Gaïa",
    tagline: "Le jersey qui enveloppe, la dentelle qui révèle, un fil d’or entre les deux.",
    category: "body",
    collection: "lace-is-more",
    price: 29000,
    edition: { total: 8, produced: 5 },
    leadTimeWeeks: 3,
    variants: [
      { id: "gaia-xs", sku: "AW-GAI-XS", size: "XS", quantity: 1, preorder: true },
      { id: "gaia-s", sku: "AW-GAI-S", size: "S", quantity: 0, preorder: true },
      { id: "gaia-m", sku: "AW-GAI-M", size: "M", quantity: 1, preorder: true },
      { id: "gaia-l", sku: "AW-GAI-L", size: "L", quantity: 1, preorder: true },
    ],
    images: [
      portrait("gaia-1", "Body Gaïa noir porté avec une jupe ample, de trois quarts sur fond sombre, épaules dénudées"),
      portrait("gaia-2", "Body Gaïa vu de près, encolure bustier soulignée d’un liseré lumineux"),
    ],
    detailImage: portrait("gaia-detail", "Détail de la matière du body Gaïa et de son liseré doré"),
    video: {
      src: "/media/video/product-gaia.mp4",
      poster: "/media/video/product-gaia.webp",
      alt: "Mouvement lent sur le jersey et la dentelle du body Gaïa",
    },
    description: [
      "Gaïa associe un jersey de viscose dense, qui sculpte sans contraindre, à un empiècement de dentelle noire posé sur la poitrine. Un fil doré, cousu à la main, dessine la frontière entre les deux matières.",
      "L’encolure bustier dégage les épaules. Il se porte avec un pantalon large, une jupe en satin ou sous la robe Odessa.",
    ],
    materials: [
      { name: "Viscose", percent: 92 },
      { name: "Élasthanne", percent: 8 },
    ],
    lining: "Empiècement en dentelle de coton doublé de tulle.",
    care: care.jersey,
    fit: "Coupe près du corps, jersey extensible. Prenez votre taille habituelle.",
    model: "Le mannequin mesure 1,70 m et porte une taille XS.",
    details: ["Fil doré cousu main", "Fermeture pressions à l’entrejambe", "Bonnets amovibles", "Série numérotée de huit pièces"],
    completeTheLook: ["robe-odessa", "jupe-iris"],
    seo: {
      title: "Body Gaïa — jersey et dentelle noire | Awrea Paris",
      description: "Body en jersey fluide et dentelle noire souligné d’un fil d’or cousu main. Créatrice française, série numérotée de huit pièces, fait main à Paris.",
    },
    tags: ["body", "dentelle", "dorure"],
    publishedAt: "2026-09-12",
  },
  {
    id: "demo-aura",
    handle: "body-aura",
    title: "Body Aura",
    tagline: "Un satin ivoire, des bretelles fines, la lumière posée sur la peau.",
    category: "body",
    collection: "lace-is-more",
    price: 26000,
    edition: { total: 6, produced: 1 },
    leadTimeWeeks: 3,
    variants: [
      { id: "aura-xs", sku: "AW-AUR-XS", size: "XS", quantity: 1, preorder: true },
      { id: "aura-s", sku: "AW-AUR-S", size: "S", quantity: 2, preorder: true },
      { id: "aura-m", sku: "AW-AUR-M", size: "M", quantity: 1, preorder: true },
      { id: "aura-l", sku: "AW-AUR-L", size: "L", quantity: 1, preorder: true },
    ],
    images: [
      portrait("aura-1", "Body Aura en satin ivoire à fines bretelles, porté avec de longs gants et un collier de perles"),
      portrait("aura-2", "Détail du bustier brodé du body Aura en satin ivoire"),
    ],
    detailImage: portrait("aura-detail", "Gros plan sur la broderie de dentelle du body Aura"),
    video: {
      src: "/media/video/product-aura.mp4",
      poster: "/media/video/product-aura.webp",
      alt: "Mouvement lent sur le satin du body Aura",
    },
    description: [
      "Aura est la pièce claire de la collection : un satin ivoire qui accroche la lumière à chaque mouvement, brodé sur le bustier de motifs de dentelle ton sur ton.",
      "Ses bretelles fines se règlent à la main. Sous une veste d’homme ou avec la jupe Iris, il apporte la douceur que la dentelle noire appelle.",
    ],
    materials: [
      { name: "Satin de polyester recyclé", percent: 95 },
      { name: "Élasthanne", percent: 5 },
    ],
    care: care.satin,
    fit: "Coupe ajustée au buste, légèrement fluide à la taille. Prenez votre taille habituelle.",
    model: "Le mannequin mesure 1,68 m et porte une taille S.",
    details: ["Broderie ton sur ton", "Bretelles réglables", "Fermeture pressions", "Série numérotée de six pièces"],
    completeTheLook: ["jupe-iris", "robe-odessa"],
    seo: {
      title: "Body Aura — satin ivoire brodé | Awrea Paris",
      description: "Body en satin ivoire brodé de dentelle ton sur ton, à bretelles fines. Créatrice française, série numérotée de six pièces, façonnée à la main à Paris.",
    },
    tags: ["body", "satin"],
    publishedAt: "2026-09-12",
  },
  {
    id: "demo-kira",
    handle: "top-kira",
    title: "Top Kira",
    tagline: "Une ligne asymétrique, un jersey noir qui tombe comme une ombre.",
    category: "top",
    collection: "lace-is-more",
    price: 22000,
    edition: { total: 10, produced: 7 },
    leadTimeWeeks: 2,
    variants: [
      { id: "kira-xs", sku: "AW-KIR-XS", size: "XS", quantity: 0, preorder: true },
      { id: "kira-s", sku: "AW-KIR-S", size: "S", quantity: 1, preorder: true },
      { id: "kira-m", sku: "AW-KIR-M", size: "M", quantity: 0, preorder: true },
      { id: "kira-l", sku: "AW-KIR-L", size: "L", quantity: 0, preorder: true },
    ],
    images: [
      portrait("kira-1", "Top Kira noir à manches longues et ourlet asymétrique, porté avec des cuissardes sur fond studio blanc"),
      portrait("kira-2", "Le top Kira de près, épaule structurée et drapé du jersey noir"),
    ],
    detailImage: portrait("kira-detail", "Détail du drapé à l’épaule du top Kira"),
    video: {
      src: "/media/video/product-kira.mp4",
      poster: "/media/video/product-kira.webp",
      alt: "Mouvement lent sur le drapé du top Kira",
    },
    description: [
      "Kira se coupe en biais dans un jersey noir mat. L’ourlet descend en pointe sur une hanche et laisse l’autre libre : une ligne qui ne se fige jamais.",
      "Les épaules sont légèrement marquées, les manches longues. Sur un pantalon droit ou sur la jupe Iris, il dessine une silhouette nette et sensuelle.",
    ],
    materials: [
      { name: "Viscose", percent: 95 },
      { name: "Élasthanne", percent: 5 },
    ],
    care: care.jersey,
    fit: "Coupe près du corps aux épaules, fluide sur les hanches. Prenez votre taille habituelle.",
    model: "Le mannequin mesure 1,77 m et porte une taille S.",
    details: ["Ourlet asymétrique", "Coupe en biais", "Épaules structurées", "Série numérotée de dix pièces"],
    completeTheLook: ["jupe-iris", "body-gaia"],
    seo: {
      title: "Top Kira — jersey noir asymétrique | Awrea Paris",
      description: "Top en jersey noir à ourlet asymétrique, coupé en biais et cousu main à Paris. Pièce de créatrice en série numérotée de dix exemplaires.",
    },
    tags: ["top", "jersey", "drapé"],
    publishedAt: "2026-09-12",
  },
  {
    id: "demo-thais",
    handle: "robe-thais",
    title: "Robe Thaïs",
    tagline: "Un drapé à la grecque, noué à l’épaule, qui laisse le dos à la lumière.",
    category: "robe",
    collection: "lumiere-d-or",
    price: 54000,
    edition: { total: 1, produced: 0 },
    variants: [{ id: "thais-tu", sku: "AW-THA-U", size: "S", quantity: 1, preorder: false }],
    images: [
      portrait("thais-1", "Robe Thaïs ivoire portée de dos avec de longs gants noirs, bustier lacé et jupe ample"),
      portrait("thais-2", "Le dos de la robe Thaïs et son laçage, vue rapprochée"),
    ],
    detailImage: portrait("thais-detail", "Détail des lettres peintes à la main sur la jupe de la robe Thaïs"),
    video: {
      src: "/media/video/product-thais.mp4",
      poster: "/media/video/product-thais.webp",
      alt: "Mouvement lent sur la jupe de la robe Thaïs",
    },
    description: [
      "Pièce unique. Thaïs reprend le drapé des statues grecques : un seul pan de jersey ivoire, noué sur l’épaule, qui tombe en plis libres jusqu’au sol.",
      "La jupe est peinte à la main de lettres noires, fragments d’une lettre de la créatrice. Il n’en existera jamais d’autre.",
    ],
    materials: [{ name: "Jersey de coton", percent: 100 }],
    care: care.jersey,
    fit: "Pièce unique en taille S, ajustable par le laçage du dos (convient du 36 au 38).",
    model: "Le mannequin mesure 1,72 m.",
    details: ["Pièce unique", "Lettres peintes à la main", "Laçage dos", "Certificat signé"],
    completeTheLook: ["etole-nyx"],
    seo: {
      title: "Robe Thaïs — pièce unique drapée | Awrea Paris",
      description: "Robe drapée à la grecque en jersey ivoire, peinte à la main de lettres noires. Pièce unique de créatrice, faite main à Paris.",
    },
    tags: ["pièce unique", "drapé", "jersey"],
    publishedAt: "2026-03-02",
  },
  {
    id: "demo-iris",
    handle: "jupe-iris",
    title: "Jupe Iris",
    tagline: "Un satin qui coule jusqu’aux chevilles et capte chaque reflet.",
    category: "jupe",
    collection: "lumiere-d-or",
    price: 24000,
    edition: { total: 10, produced: 4 },
    leadTimeWeeks: 3,
    variants: [
      { id: "iris-xs", sku: "AW-IRI-XS", size: "XS", quantity: 2, preorder: true },
      { id: "iris-s", sku: "AW-IRI-S", size: "S", quantity: 2, preorder: true },
      { id: "iris-m", sku: "AW-IRI-M", size: "M", quantity: 1, preorder: true },
      { id: "iris-l", sku: "AW-IRI-L", size: "L", quantity: 1, preorder: true },
    ],
    images: [
      portrait("iris-1", "Jupe Iris en satin ivoire, plis souples dans la lumière"),
      portrait("iris-2", "Détail du tombé du satin de la jupe Iris"),
    ],
    detailImage: portrait("iris-2", "Gros plan sur le satin de la jupe Iris"),
    video: {
      src: "/media/video/product-iris.mp4",
      poster: "/media/video/product-iris.webp",
      alt: "Mouvement lent sur le satin de la jupe Iris",
    },
    description: [
      "Iris est coupée en biais dans un satin lourd qui glisse sur les hanches et tombe jusqu’aux chevilles. Sa taille haute est soulignée d’une ceinture fine, fermée par un bouton doré.",
      "Avec le top Kira ou le body Gaïa, elle forme les silhouettes les plus fluides de la maison.",
    ],
    materials: [{ name: "Satin de polyester recyclé", percent: 100 }],
    care: care.satin,
    fit: "Taille haute, coupe fluide. Prenez votre taille habituelle.",
    model: "Le mannequin mesure 1,68 m et porte une taille S.",
    details: ["Coupe en biais", "Bouton doré", "Longueur cheville", "Série numérotée de dix pièces"],
    completeTheLook: ["top-kira", "body-aura"],
    seo: {
      title: "Jupe Iris — satin coupé en biais | Awrea Paris",
      description: "Jupe longue en satin coupé en biais, taille haute et bouton doré. Créatrice française, faite main à Paris en série numérotée de dix pièces.",
    },
    tags: ["jupe", "satin"],
    publishedAt: "2026-03-02",
  },
  {
    id: "demo-elia",
    handle: "corset-elia",
    title: "Corset Elia",
    tagline: "Un corset de satin noir, des baleines souples, un liseré d’or.",
    category: "top",
    collection: "lumiere-d-or",
    price: 32000,
    edition: { total: 5, produced: 5 },
    leadTimeWeeks: 6,
    variants: [
      { id: "elia-xs", sku: "AW-ELI-XS", size: "XS", quantity: 0, preorder: true },
      { id: "elia-s", sku: "AW-ELI-S", size: "S", quantity: 0, preorder: true },
      { id: "elia-m", sku: "AW-ELI-M", size: "M", quantity: 0, preorder: true },
      { id: "elia-l", sku: "AW-ELI-L", size: "L", quantity: 0, preorder: true },
    ],
    images: [
      portrait("elia-1", "Corset Elia en satin noir pailleté porté avec une jupe ample sur fond sombre"),
      portrait("elia-2", "Détail du bustier du corset Elia"),
    ],
    detailImage: portrait("elia-2", "Gros plan sur la matière du corset Elia"),
    video: {
      src: "/media/video/product-elia.mp4",
      poster: "/media/video/product-elia.webp",
      alt: "Mouvement lent sur le satin du corset Elia",
    },
    description: [
      "Elia est façonné sur commande, à vos mesures. Un satin noir parsemé de reflets, des baleines souples qui tiennent sans comprimer, un liseré doré à l’encolure.",
      "La première série est épuisée : chaque nouvelle pièce est désormais réalisée à la demande, dans un délai de six semaines.",
    ],
    materials: [
      { name: "Satin de soie", percent: 80 },
      { name: "Fil métallisé doré", percent: 20 },
    ],
    care: care.satin,
    fit: "Réalisé à vos mesures après commande : l’atelier vous contacte pour les relever.",
    model: "Le mannequin mesure 1,65 m et porte une taille XS.",
    details: ["Fabrication à la commande", "Baleines souples", "Liseré doré", "Ajusté à vos mesures"],
    completeTheLook: ["jupe-iris"],
    seo: {
      title: "Corset Elia — satin noir sur commande | Awrea Paris",
      description: "Corset en satin noir et liseré doré, réalisé à vos mesures dans l’atelier parisien de la créatrice. Précommande, délai de fabrication de six semaines.",
    },
    tags: ["corset", "précommande", "sur mesure"],
    publishedAt: "2026-03-02",
  },
  {
    id: "demo-nyx",
    handle: "etole-nyx",
    title: "Étole Nyx",
    tagline: "Un voile de dentelle noire à jeter sur les épaules.",
    category: "accessoire",
    collection: "lumiere-d-or",
    price: 16000,
    edition: { total: 6, produced: 6 },
    variants: [{ id: "nyx-tu", sku: "AW-NYX-U", size: "TU", quantity: 0, preorder: false }],
    images: [
      portrait("nyx-1", "Étole Nyx en dentelle noire portée sur une robe noire"),
      portrait("nyx-2", "Détail du bord festonné de l’étole Nyx"),
    ],
    detailImage: portrait("nyx-2", "Gros plan sur la dentelle de l’étole Nyx"),
    description: [
      "Nyx est un long rectangle de dentelle de Calais bordé d’un feston. Elle se noue, se drape, se porte en voile sur les cheveux ou en écharpe.",
      "Les six pièces de la série ont trouvé leur place. Inscrivez-vous pour être prévenue si l’atelier en façonne de nouvelles.",
    ],
    materials: [
      { name: "Coton", percent: 70 },
      { name: "Polyamide", percent: 30 },
    ],
    care: care.lace,
    fit: "Taille unique, 180 × 60 cm.",
    model: "",
    details: ["Dentelle de Calais", "Bord festonné", "180 × 60 cm"],
    completeTheLook: ["robe-thais"],
    seo: {
      title: "Étole Nyx — dentelle de Calais | Awrea Paris",
      description: "Étole en dentelle de Calais noire bordée d’un feston, faite main à Paris. Série de six pièces, aujourd’hui épuisée : liste d’attente ouverte.",
    },
    tags: ["accessoire", "dentelle"],
    publishedAt: "2026-03-02",
  },
];

/**
 * Traçabilité de démonstration : étapes et temps de fabrication PROVISOIRES (comme les prix),
 * origines des matières à préciser par l'atelier (jamais inventées). En production : métachamp
 * Shopify `awrea.traceability` (ACTIVATION.md, étape 4.2).
 */
const hours: Record<string, [number, number, number]> = {
  "robe-odessa": [6, 3, 22],
  "body-gaia": [4, 2, 10],
  "body-aura": [4, 2, 9],
  "top-kira": [3, 2, 7],
  "robe-thais": [5, 2, 12],
  "jupe-iris": [3, 2, 8],
  "corset-elia": [8, 3, 26],
  "etole-nyx": [2, 1, 6],
};
for (const p of products) {
  const [design, cut, sewing] = hours[p.handle] ?? [4, 2, 10];
  p.trace ??= {
    steps: [
      { label: "Dessin et patronage", place: "Atelier, Paris", hours: design },
      { label: "Coupe", place: "Atelier, Paris", hours: cut },
      { label: "Assemblage et finitions à la main", place: "Atelier, Paris", hours: sewing },
      { label: "Contrôle, numérotation et certificat", place: "Atelier, Paris" },
    ],
    origins: p.materials.map((m) => ({ material: m.name, origin: null })),
  };
}
