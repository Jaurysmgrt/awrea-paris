import type { Collection, Look } from "@/lib/commerce/types";

const img = (name: string, alt: string, width = 1200, height = 1800) => ({ src: `/media/img/${name}`, alt, width, height });

export const collections: Collection[] = [
  {
    handle: "lace-is-more",
    title: "Lace is more",
    season: "Automne-Hiver 2026",
    current: true,
    lead: "Quatre pièces, une seule matière fil conducteur : la dentelle noire, posée sur la peau comme une ombre qui laisse passer la lumière.",
    intention: [
      "J’ai voulu une collection qui se retire plutôt qu’elle ne s’impose. La dentelle dit tout en cachant presque tout : elle dessine, elle suggère, elle laisse la peau respirer entre ses fils.",
      "Autour d’elle, des matières qui coulent. Un jersey de viscose qui enveloppe, un satin qui accroche la lumière. Et partout, un fil d’or, discret, qui relie les pièces entre elles.",
      "Lace is more, c’est l’idée qu’une seule matière, bien travaillée, suffit à composer une garde-robe entière. Moins de pièces, mais des pièces qui restent.",
    ],
    cover: img("collection-lace", "Robe en dentelle noire portée de dos, silhouette élancée sur fond studio", 1200, 1600),
    moodboard: [
      { image: img("odessa-2", "Laçage de satin dans le dos d’une robe en dentelle noire"), caption: "Le laçage, œillet après œillet", span: "tall" },
      { image: img("atelier-2", "Dentelle ivoire et ciseaux à broder posés sur une table de l’atelier", 1200, 800), caption: "Motifs découpés à la main", span: "wide" },
      { image: img("kira-2", "Drapé d’un jersey noir sur l’épaule"), caption: "Le jersey en biais", span: "tall" },
      { image: img("gaia-detail", "Liseré lumineux sur un bustier noir"), caption: "Un fil d’or, une frontière", span: "square" },
      { image: img("editorial-3", "Satin ivoire et longs gants dans une lumière douce", 1200, 675), caption: "La lumière posée sur le satin", span: "wide" },
    ],
    products: ["robe-odessa", "body-gaia", "body-aura", "top-kira"],
    seo: {
      title: "Lace is more, collection en dentelle noire | Awrea Paris",
      description: "Lace is more, la collection automne-hiver d’Awrea Paris : robe, bodys et top en dentelle noire, jersey et satin, faits main à Paris en séries numérotées.",
    },
  },
  {
    handle: "lumiere-d-or",
    title: "Lumière d’or",
    season: "Printemps-Été 2026",
    current: false,
    lead: "La première collection de la maison : des drapés à la grecque, des satins clairs et une dorure qui ne se montre qu’au mouvement.",
    intention: [
      "La couleur n’est pas au rendez-vous mais la lumière de la dorure suffit à révéler l’essentiel. Cette phrase a ouvert le premier carnet de croquis de la maison.",
      "Lumière d’or explore le drapé : un pan de tissu, un nœud, et la silhouette se compose d’elle-même. Certaines pièces sont uniques ; d’autres sont désormais réalisées sur commande.",
    ],
    cover: img("collection-drape", "Robe ivoire drapée portée de dos avec de longs gants noirs", 1200, 1600),
    moodboard: [
      { image: img("thais-2", "Dos lacé d’une robe ivoire"), caption: "Thaïs, pièce unique", span: "tall" },
      { image: img("atelier-3", "Mains cousant un vêtement ivoire à l’aiguille", 1200, 800), caption: "Le point invisible", span: "wide" },
      { image: img("iris-2", "Plis d’un satin clair"), caption: "Le satin coupé en biais", span: "tall" },
    ],
    products: ["robe-thais", "jupe-iris", "corset-elia", "etole-nyx"],
    seo: {
      title: "Lumière d’or, collection de drapés et de satin | Awrea Paris",
      description: "Lumière d’or, première collection d’Awrea Paris : drapés à la grecque, satins clairs et dorure. Pièces uniques et sur commande, faites main à Paris.",
    },
  },
];

export const looks: Look[] = [
  {
    handle: "la-nuit-d-odessa",
    title: "La nuit d’Odessa",
    note: "La robe Odessa portée sur le body Gaïa : dentelle sur jersey, l’ombre sur l’ombre.",
    image: img("look-1", "Silhouette en robe longue de dentelle noire vue de dos", 1200, 1500),
    hotspots: [
      { product: "robe-odessa", x: 50, y: 66 },
      { product: "body-gaia", x: 52, y: 30 },
    ],
  },
  {
    handle: "satin-et-chandelles",
    title: "Satin et chandelles",
    note: "Le body Gaïa et la jupe Iris : une silhouette de dîner, fluide et nette.",
    image: img("look-2", "Silhouette en body noir et jupe ample devant une table aux chandelles", 1200, 1500),
    hotspots: [
      { product: "body-gaia", x: 47, y: 46 },
      { product: "jupe-iris", x: 62, y: 72 },
    ],
  },
  {
    handle: "ligne-d-ombre",
    title: "Ligne d’ombre",
    note: "Le top Kira, seul : une diagonale de jersey noir, des cuissardes, rien d’autre.",
    image: img("look-3", "Silhouette en jersey noir asymétrique et cuissardes sur fond blanc", 1200, 1500),
    hotspots: [
      { product: "top-kira", x: 50, y: 40 },
    ],
  },
];
