/**
 * Catalogue de DÉMONSTRATION : les sept pièces de la collection Hypnotic Lace (ressources
 * officielles de la Maison, RESSOURCES.md). En production, ces données viennent de Shopify
 * (Storefront API) ; ce fichier sert au développement sans compte Shopify et de modèle pour la
 * saisie des fiches.
 *
 * Modèle de la Maison : chaque pièce est créée SUR DEMANDE, sans stock, par des artisans français.
 * Toutes les tailles se commandent ; chaque pièce annonce son délai de fabrication.
 *
 * PROVISOIRE, à confirmer par la Maison (ACTIVATION.md, « Prix et délais à confirmer ») :
 *  - les prix de la robe Sienna, du body Gaïa, du top Evina et du top Kira ;
 *  - tous les délais de fabrication (bodys et tops 2 à 3 semaines, robes 3 à 4 semaines) ;
 *  - les tailles proposées (XS à XL) ;
 *  - toutes les photos : images générées en attendant les shootings (`provisoire: true`).
 * Inconnus, jamais inventés : compositions, doublures, entretien, taille du mannequin
 * (« [À COMPLÉTER : …] » ou champ vide masqué, liste dans LEGAL-A-COMPLETER.md).
 * Les descriptions s'en tiennent à ce que montrent les photos.
 */
import type { Image, Product, Size, Variant } from "@/lib/commerce/types";

/** Visuel provisoire (image générée), au format 2:3 : chemin sans extension, dimensions réelles. */
const visuel = (name: string, alt: string, width: number, height: number): Image => ({ src: `/media/img/${name}`, alt, width, height, provisoire: true });

const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
const sizes = (handle: string, code: string): Variant[] => SIZES.map((size) => ({ id: `${handle}-${size.toLowerCase()}`, sku: `AW-${code}-${size}`, size }));

/** Repères visibles tant que la Maison n'a pas donné l'information (jamais inventée). */
const careToComplete = (piece: string) => [`[À COMPLÉTER : conseils d’entretien ${piece}]`];
const fitAdvice = "Pour choisir votre taille, appuyez-vous sur le guide des tailles. La Maison vous conseille volontiers avant la commande.";

const BODY_TOP = { min: 2, max: 3 };
const ROBE = { min: 3, max: 4 };
// publiées avant la plus ancienne commande de démonstration (data/demo/orders.ts, 6 septembre),
// après le début d’activité de la Maison (1er avril 2026)
const PUBLISHED = "2026-09-01";

export const products: Product[] = [
  {
    id: "demo-aura",
    handle: "body-aura",
    title: "Le body Aura",
    tagline: "Une dentelle noire pailletée d’or, un drapé noir noué sur le buste.",
    category: "body",
    collection: "hypnotic-lace",
    price: 7000,
    leadTime: BODY_TOP,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("aura", "AUR"),
    images: [visuel("aura-1", "Le body Aura porté, dentelle noire pailletée d’or, drapé noir noué sur le buste et manches longues", 1536, 2304)],
    detailImage: visuel("aura-detail", "Détail du body Aura : la dentelle noire pailletée d’or et le nœud du drapé", 990, 1486),
    description: [
      "Aura tient dans un contraste. La dentelle noire, semée de paillettes d’or, accroche la lumière au moindre geste ; un drapé noir, noué sur le buste, la retient.",
      "Les manches sont longues, le col est rond. Le corps est couvert de dentelle, et pourtant tout se devine.",
    ],
    materials: [],
    care: careToComplete("du body Aura"),
    fit: `Body près du corps, à manches longues. ${fitAdvice}`,
    model: "",
    details: ["Dentelle noire pailletée d’or", "Drapé noir noué sur le buste", "Manches longues", "Col rond"],
    completeTheLook: [],
    seo: {
      title: "Le body Aura, dentelle noire pailletée d’or | Awrea Paris",
      description: "Body en dentelle noire pailletée d’or, drapé noir noué sur le buste, manches longues. Créé sur demande par des artisans français pour Awrea Paris.",
    },
    tags: ["body", "dentelle", "dorure", "drapé"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
  {
    id: "demo-odessa",
    handle: "robe-odessa",
    title: "La robe Odessa",
    tagline: "Un bustier noir, une taille de dentelle florale, une ligne longue qui suit le corps.",
    category: "robe",
    collection: "hypnotic-lace",
    price: 10000,
    leadTime: ROBE,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("odessa", "ODS"),
    images: [visuel("odessa-1", "La robe Odessa portée, bustier noir à bretelles et taille en dentelle noire florale", 1536, 2304)],
    detailImage: visuel("odessa-detail", "Détail de la robe Odessa : la dentelle florale noire de la taille sous le bustier", 990, 1486),
    description: [
      "Odessa commence par un bustier noir, tenu par deux bretelles. À la taille, la dentelle florale prend le relais et laisse passer la peau entre ses motifs.",
      "La robe descend longue, près du corps. Le noir plein du bustier, la transparence de la dentelle : la force et la délicatesse dans la même ligne.",
    ],
    materials: [],
    care: careToComplete("de la robe Odessa"),
    fit: `Robe longue, près du corps. ${fitAdvice}`,
    model: "",
    details: ["Bustier noir à bretelles", "Taille en dentelle noire florale", "Robe longue, près du corps"],
    completeTheLook: [],
    seo: {
      title: "La robe Odessa, bustier noir et dentelle florale | Awrea Paris",
      description: "Robe longue près du corps, bustier noir à bretelles et taille en dentelle noire florale. Créée sur demande par des artisans français pour Awrea Paris.",
    },
    tags: ["robe", "dentelle", "soirée"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
  {
    id: "demo-aria",
    handle: "robe-aria",
    title: "La robe Aria",
    tagline: "La dentelle en haut, le satin en bas, un anneau doré pour les tenir ensemble.",
    category: "robe",
    collection: "hypnotic-lace",
    price: 20400,
    leadTime: ROBE,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("aria", "ARI"),
    images: [visuel("aria-1", "La robe Aria portée, haut sans manches en dentelle noire, drapé froncé à l’anneau doré et jupe sirène en satin noir", 1330, 1995)],
    detailImage: visuel("aria-detail", "Détail de la robe Aria : le drapé froncé tenu par un anneau doré sur la dentelle noire", 950, 1425),
    description: [
      "Aria se lit en deux temps. En haut, la dentelle noire, sans manches, traversée d’un drapé froncé qu’un anneau doré vient retenir.",
      "En bas, le satin noir, froncé, s’ouvre en jupe sirène. La robe est longue ; l’or ne tient qu’en un point, et c’est là que le regard s’arrête.",
    ],
    materials: [],
    care: careToComplete("de la robe Aria"),
    fit: `Robe longue, ajustée jusqu’à l’évasement de la jupe sirène. ${fitAdvice}`,
    model: "",
    details: ["Haut en dentelle noire, sans manches", "Drapé froncé tenu par un anneau doré", "Jupe sirène en satin noir froncé", "Robe longue"],
    completeTheLook: [],
    seo: {
      title: "La robe Aria, dentelle noire et satin sirène | Awrea Paris",
      description: "Robe longue sans manches : dentelle noire, drapé froncé à l’anneau doré, jupe sirène en satin noir. Créée sur demande par des artisans français.",
    },
    tags: ["robe", "dentelle", "satin", "drapé", "dorure"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
  {
    id: "demo-sienna",
    handle: "robe-sienna",
    title: "La robe Sienna",
    tagline: "Un col montant, un dos nu, un buste de dentelle noire et or.",
    category: "robe",
    collection: "hypnotic-lace",
    price: 18000,
    priceProvisional: true,
    leadTime: ROBE,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("sienna", "SIE"),
    images: [visuel("sienna-1", "La robe Sienna portée, col montant, buste en dentelle noire et or, taille froncée en pointe et jupe longue en jersey noir", 1536, 2304)],
    detailImage: visuel("sienna-detail", "Détail de la robe Sienna : la dentelle noire et or du buste et les fronces de la taille", 990, 1487),
    description: [
      "Sienna se ferme haut sur le cou et laisse le dos nu. Le buste est en dentelle noire et or ; à la taille, des fronces descendent en pointe.",
      "Puis le jersey noir prend le relais, jusqu’au bas de la robe. Une silhouette sculptée devant, libre dans le dos.",
    ],
    materials: [],
    care: careToComplete("de la robe Sienna"),
    fit: `Robe longue à col montant et dos nu, taille marquée. ${fitAdvice}`,
    model: "",
    details: ["Col montant", "Dos nu", "Buste en dentelle noire et or", "Taille froncée en pointe", "Jupe longue en jersey noir"],
    completeTheLook: [],
    seo: {
      title: "La robe Sienna, col montant et dos nu | Awrea Paris",
      description: "Robe longue à col montant et dos nu, buste en dentelle noire et or, taille froncée en pointe, jupe en jersey noir. Créée sur demande en France.",
    },
    tags: ["robe", "dentelle", "jersey", "dorure", "dos nu"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
  {
    id: "demo-gaia",
    handle: "body-gaia",
    title: "Le body Gaïa",
    tagline: "Un body noir, et la dentelle qui le traverse en biais.",
    category: "body",
    collection: "hypnotic-lace",
    price: 7500,
    priceProvisional: true,
    leadTime: BODY_TOP,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("gaia", "GAI"),
    images: [visuel("gaia-1", "Le body Gaïa porté, noir à manches longues, encolure bateau et bandes de dentelle florale en biais", 1494, 2240)],
    detailImage: visuel("gaia-detail", "Détail du body Gaïa : une bande de dentelle florale posée en biais", 1030, 1544),
    description: [
      "Gaïa est noir, à manches longues, avec une encolure bateau qui dégage la ligne des épaules.",
      "Deux bandes de dentelle florale le traversent en biais, l’une à l’épaule, l’autre à la taille. Elles dessinent la silhouette d’un seul trait.",
    ],
    materials: [],
    care: careToComplete("du body Gaïa"),
    fit: `Body près du corps, à manches longues. ${fitAdvice}`,
    model: "",
    details: ["Encolure bateau", "Manches longues", "Bandes de dentelle florale en biais, à l’épaule et à la taille"],
    completeTheLook: [],
    seo: {
      title: "Le body Gaïa, noir et dentelle en biais | Awrea Paris",
      description: "Body noir à manches longues et encolure bateau, traversé en biais de bandes de dentelle florale. Créé sur demande par des artisans français.",
    },
    tags: ["body", "dentelle"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
  {
    id: "demo-evina",
    handle: "top-evina",
    title: "Le top Evina",
    tagline: "Un top blanc, un col en V profond, des manches amples.",
    category: "top",
    collection: "hypnotic-lace",
    price: 6500,
    priceProvisional: true,
    leadTime: BODY_TOP,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("evina", "EVI"),
    images: [visuel("evina-1", "Le top Evina porté, blanc, col en V profond, manches amples et taille froncée", 1024, 1536)],
    description: [
      "Evina est la pièce claire de la collection. Un top blanc, au col en V profond, aux manches amples.",
      "À la taille, des fronces resserrent la ligne ; plus haut, les manches gardent tout leur volume. La douceur, cette fois, est du côté du blanc.",
    ],
    materials: [],
    care: careToComplete("du top Evina"),
    fit: `Top à manches amples, taille froncée. ${fitAdvice}`,
    model: "",
    details: ["Col en V profond", "Manches amples", "Taille froncée"],
    completeTheLook: [],
    seo: {
      title: "Le top Evina, blanc à col en V profond | Awrea Paris",
      description: "Top blanc à col en V profond, manches amples et taille froncée, de la collection Hypnotic Lace. Créé sur demande par des artisans français.",
    },
    tags: ["top", "blanc"],
    publishedAt: PUBLISHED,
    color: "Blanc",
  },
  {
    id: "demo-kira",
    handle: "top-kira",
    title: "Le top Kira",
    tagline: "Un top noir, un col en V, une taille de dentelle.",
    category: "top",
    collection: "hypnotic-lace",
    price: 7000,
    priceProvisional: true,
    leadTime: BODY_TOP,
    leadTimeProvisional: true,
    isNew: true,
    variants: sizes("kira", "KIR"),
    images: [visuel("kira-1", "Le top Kira porté, noir, col en V, manches amples et taille en dentelle noire", 1024, 1536)],
    description: [
      "Kira répond à Evina, en noir. Un col en V, des manches amples, et la taille en dentelle noire.",
      "La dentelle se tient là où le corps se resserre, et laisse passer un peu de lumière.",
    ],
    materials: [],
    care: careToComplete("du top Kira"),
    fit: `Top à manches amples, taille en dentelle. ${fitAdvice}`,
    model: "",
    details: ["Col en V", "Manches amples", "Taille en dentelle noire"],
    completeTheLook: [],
    seo: {
      title: "Le top Kira, noir à taille en dentelle | Awrea Paris",
      description: "Top noir à col en V et manches amples, taille en dentelle noire, de la collection Hypnotic Lace. Créé sur demande par des artisans français.",
    },
    tags: ["top", "dentelle"],
    publishedAt: PUBLISHED,
    color: "Noir",
  },
];
