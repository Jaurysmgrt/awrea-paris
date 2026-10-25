/**
 * Articles du Journal écrits dans le dépôt. L'agent SEO peut en proposer et publier d'autres
 * (stockés en base, lib/content/journal.ts).
 *
 * Ces textes ne disent que ce que la Maison affirme dans ses ressources officielles : la collection
 * Hypnotic Lace et ses sept pièces, la création sur demande, sans stock, par des artisans français,
 * le numéro de création inscrit sur le certificat (TEASING MARQUE, TEXTE DE COLLECTION). Les
 * citations marquées officiel: true sont recopiées mot pour mot (affichées avec data-officiel).
 * Les photographies sont les visuels provisoires des pièces (provisoire: true) : la page les
 * accompagne de la mention « visuel provisoire ».
 */
import type { Image } from "@/lib/commerce/types";

export type JournalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  /** officiel : phrase de la créatrice recopiée mot pour mot (contrôle d'écriture limité à la typographie) */
  | { type: "quote"; text: string; cite?: string; officiel?: boolean }
  | ({ type: "image"; caption?: string } & Image)
  | { type: "moodboard"; images: Image[] };

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: "Moodboard" | "Coulisses" | "Savoir-faire" | "Lettre";
  date: string;
  readingMinutes: number;
  cover: Image;
  body: JournalBlock[];
  seo: { title: string; description: string };
}

/** Visuel provisoire d'une pièce (image générée en attendant les photographies de la Maison). */
const visuel = (name: string, alt: string, width: number, height: number, focal?: Image["focal"]): Image => ({
  src: `/media/img/${name}`,
  alt,
  width,
  height,
  provisoire: true,
  ...(focal ? { focal } : {}),
});

export const articles: Article[] = [
  {
    slug: "dentelle-drapes-et-dorure",
    title: "Dentelle, drapés et dorure",
    excerpt: "La collection Hypnotic Lace tient en trois mots. Voici où les trouver, pièce par pièce.",
    category: "Savoir-faire",
    date: "2026-10-24",
    readingMinutes: 2,
    cover: visuel("aura-detail", "Détail du body Aura : la dentelle noire pailletée d’or et le nœud du drapé", 990, 1486, { x: 50, y: 42 }),
    body: [
      { type: "quote", text: "La délicatesse, le pouvoir de l’or.", cite: "Hypnotic Lace", officiel: true },
      { type: "p", text: "Trois choses passent d’une pièce à l’autre dans la collection Hypnotic Lace : la dentelle noire, le drapé, et l’éclat de l’or. Jamais au même endroit." },
      { type: "h2", text: "La dentelle" },
      { type: "p", text: "Elle se pose là où le regard s’arrête. À la taille de la robe Odessa, sous un bustier noir à bretelles. À la taille du top Kira, entre deux manches amples. En bandes posées en biais sur le jersey noir du body Gaïa." },
      { type: "image", ...visuel("odessa-detail", "Détail de la robe Odessa : la dentelle florale noire de la taille sous le bustier", 990, 1486), caption: "La robe Odessa, la dentelle de la taille." },
      { type: "h2", text: "Le drapé" },
      { type: "p", text: "Le drapé donne la forme. Sur le body Aura, il se noue sur le buste. Sur la robe Aria, il se fronce autour d’un anneau doré, au-dessus d’une jupe sirène en satin. Le top Evina, tout en blanc, le porte à la taille, sous un col en V profond." },
      {
        type: "moodboard",
        images: [
          visuel("aria-detail", "Détail de la robe Aria : le drapé froncé tenu par un anneau doré sur la dentelle noire", 950, 1425),
          visuel("evina-1", "Le top Evina porté, blanc, col en V profond, manches amples et taille froncée", 1024, 1536),
          visuel("gaia-detail", "Détail du body Gaïa : une bande de dentelle florale posée en biais", 1030, 1544),
        ],
      },
      { type: "h2", text: "La dorure" },
      { type: "p", text: "Puis l’or arrive, par touches. Des paillettes dans la dentelle du body Aura, la dentelle noire et or du buste de la robe Sienna, l’anneau qui tient le drapé de la robe Aria. Il accroche la lumière à chaque mouvement." },
      { type: "p", text: "Sept pièces en tout, chacune créée sur demande par des artisans français." },
    ],
    seo: {
      title: "Dentelle, drapés et dorure, la collection Hypnotic Lace | Awrea Paris",
      description: "La dentelle noire, le drapé et l’éclat de l’or dans les sept pièces de la collection Hypnotic Lace d’Awrea Paris, créées sur demande par des artisans français.",
    },
  },
  {
    slug: "une-piece-creee-sur-demande",
    title: "Une pièce qui n’existe pas encore",
    excerpt: "Chez Awrea Paris, rien n’attend en réserve. Chaque pièce est créée sur demande par des artisans français, pour la personne qui l’a choisie.",
    category: "Coulisses",
    date: "2026-10-24",
    readingMinutes: 2,
    cover: visuel("sienna-detail", "Détail de la robe Sienna : la dentelle noire et or du buste et les fronces de la taille", 990, 1487, { x: 50, y: 58 }),
    body: [
      { type: "p", text: "Quand vous commandez une pièce Awrea Paris, elle n’existe pas encore. Aucune robe ne dort dans un carton, aucun body n’attend sur un portant. Votre pièce commence avec votre commande, dans la taille que vous avez choisie." },
      { type: "h2", text: "Rien d’avance, rien en trop" },
      { type: "p", text: "La Maison a fait ce choix dès le départ : ne produire que ce qui est demandé. Aucune série fabriquée d’avance, aucune pièce en surplus à la fin d’une saison. C’est une façon de respecter l’environnement, et de respecter chaque pièce." },
      { type: "quote", text: "Il n’y a pas de stock, seulement des créations pensées pour la personne qui les porte.", cite: "Awrea Paris", officiel: true },
      { type: "h2", text: "Entre des mains françaises" },
      { type: "p", text: "Nos pièces sont confectionnées par des artisans français. La Maison veille à leurs conditions de travail et à la reconnaissance de leur métier. Une pièce n’est belle que si la manière de la faire l’est aussi." },
      { type: "h2", text: "Le temps de la confection" },
      { type: "p", text: "Une pièce créée pour vous demande quelques semaines. Son délai de fabrication est écrit sur sa fiche, avant même que vous la commandiez. Ensuite, votre commande avance sous vos yeux, étape par étape : commande reçue, en confection, prête, expédiée, livrée." },
      { type: "p", text: "Une fois terminée, la pièce reçoit son numéro de création. Il est inscrit sur son certificat d’authenticité, et n’appartient qu’à elle." },
    ],
    seo: {
      title: "Une pièce créée sur demande, sans stock | Awrea Paris",
      description: "Chez Awrea Paris, chaque pièce est créée sur demande, sans stock, par des artisans français. Le délai, les étapes de la confection et le numéro de création.",
    },
  },
];
