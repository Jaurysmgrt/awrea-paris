/** Articles du Journal — démonstration. L'agent SEO peut en proposer et publier de nouveaux (stockés en base). */

export type JournalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "image"; src: string; alt: string; width: number; height: number; caption?: string }
  | { type: "moodboard"; images: { src: string; alt: string; width: number; height: number }[] };

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: "Moodboard" | "Coulisses" | "Savoir-faire" | "Lettre";
  date: string;
  readingMinutes: number;
  cover: { src: string; alt: string; width: number; height: number };
  body: JournalBlock[];
  seo: { title: string; description: string };
}

const i = (name: string, alt: string, width = 1200, height = 1800) => ({ src: `/media/img/${name}`, alt, width, height });

export const articles: Article[] = [
  {
    slug: "moodboard-lace-is-more",
    title: "Moodboard : la dentelle comme une ombre",
    excerpt: "Avant la première coupe, un mur d’images. Retour sur les inspirations de la collection Lace is more.",
    category: "Moodboard",
    date: "2026-09-02",
    readingMinutes: 4,
    cover: i("editorial-2", "Silhouette en dentelle noire vue de dos, lumière douce de studio", 1200, 675),
    body: [
      { type: "p", text: "Tout a commencé par une ombre. Celle d’un rideau de dentelle sur un mur blanc, un matin d’hiver, dans l’atelier. Les motifs se déplaçaient avec la lumière, se superposaient, disparaissaient. La collection est née de cette image." },
      { type: "h2", text: "Le noir qui laisse passer le jour" },
      { type: "p", text: "La dentelle noire est souvent associée à la nuit. Nous avons voulu la regarder en plein jour, sur fond blanc, posée sur la peau : un noir qui ne masque pas, mais qui filtre. Sur le mur de l’atelier, les photographies de statues drapées voisinaient avec des radiographies de dentelles anciennes." },
      { type: "moodboard", images: [i("odessa-detail", "Détail de dentelle florale sur un dos lacé"), i("atelier-5", "Motifs de dentelle ivoire découpés sur une table", 1200, 1500), i("kira-detail", "Drapé de jersey noir à l’épaule")] },
      { type: "quote", text: "Une seule matière, bien travaillée, suffit à composer une garde-robe entière.", cite: "La Créatrice" },
      { type: "p", text: "De ce moodboard sont sorties quatre pièces. Une robe longue, lacée dans le dos ; deux bodys, l’un noir, l’autre ivoire ; un top coupé en biais. Moins de pièces, mais des pièces qui restent." },
    ],
    seo: {
      title: "Moodboard Lace is more — la dentelle comme une ombre | Awrea Paris",
      description: "Les inspirations de la collection Lace is more d’Awrea Paris : la dentelle noire en plein jour, les drapés antiques, la lumière qui filtre.",
    },
  },
  {
    slug: "coulisses-shooting-studio-blanc",
    title: "Coulisses : une journée en studio blanc",
    excerpt: "Fonds blancs et gris, une seule source de lumière, quatre pièces. Récit du shooting de la collection.",
    category: "Coulisses",
    date: "2026-09-18",
    readingMinutes: 3,
    cover: i("editorial-1", "Robe ivoire et longs gants noirs sur fond de studio blanc", 1200, 675),
    body: [
      { type: "p", text: "Nous avons choisi le studio le plus simple possible : un fond blanc, un fond gris perle, une seule grande source de lumière. Rien qui ne vole la vedette à la matière." },
      { type: "image", ...i("look-3", "Silhouette en jersey noir asymétrique sur fond blanc", 1200, 1500), caption: "Le top Kira, sous une lumière unique." },
      { type: "h2", text: "Photographier le mouvement" },
      { type: "p", text: "Une pièce Awrea se comprend en mouvement. Nous avons donc demandé au mannequin de marcher, de se retourner, de s’arrêter à mi-pas. Les meilleures images sont presque toujours celles où le tissu n’a pas encore fini de retomber." },
      { type: "p", text: "Les vidéos qui accompagnent chaque fiche produit ont été tournées ce jour-là : quelques secondes de tissu qui bouge, en très gros plan, pour que vous puissiez voir la dentelle respirer." },
    ],
    seo: {
      title: "Coulisses du shooting en studio blanc | Awrea Paris",
      description: "Récit du shooting de la collection Lace is more d’Awrea Paris : studio blanc, lumière unique, photographier le mouvement de la dentelle et du jersey.",
    },
  },
  {
    slug: "comment-entretenir-la-dentelle",
    title: "Comment entretenir une pièce en dentelle",
    excerpt: "Lavage, séchage, rangement : les gestes de l’atelier pour que votre dentelle traverse les années.",
    category: "Savoir-faire",
    date: "2026-10-01",
    readingMinutes: 5,
    cover: i("atelier-2", "Dentelle ivoire et ciseaux à broder sur une table en bois", 1200, 800),
    body: [
      { type: "p", text: "Une dentelle bien entretenue vieillit magnifiquement. Voici les gestes que nous appliquons à l’atelier, et que nous vous recommandons pour toutes les pièces Awrea en dentelle." },
      { type: "h2", text: "Laver à la main, à l’eau froide" },
      { type: "p", text: "Remplissez une bassine d’eau froide et ajoutez quelques gouttes de savon doux. Plongez la pièce, pressez-la doucement sans la frotter ni la tordre, puis rincez à l’eau claire. Ne laissez jamais tremper plus de dix minutes." },
      { type: "h2", text: "Sécher à plat" },
      { type: "p", text: "Pressez la pièce dans une serviette éponge pour absorber l’eau, puis laissez-la sécher à plat, à l’abri du soleil direct. Le sèche-linge et le cintre, quand la dentelle est mouillée, la déforment." },
      { type: "h2", text: "Ranger à l’abri de la lumière" },
      { type: "p", text: "Pliez la dentelle dans du papier de soie ou suspendez-la sur un cintre rembourré, dans la housse en coton fournie avec votre pièce. Et si un fil se défait, apportez-la à l’atelier : nous réparons toutes nos pièces." },
    ],
    seo: {
      title: "Comment entretenir une pièce en dentelle — conseils d’atelier | Awrea Paris",
      description: "Laver, sécher et ranger une robe ou un body en dentelle : les conseils de l’atelier Awrea Paris pour faire durer vos pièces faites main.",
    },
  },
];
