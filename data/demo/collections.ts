/**
 * Collections de DÉMONSTRATION : la collection actuelle de la Maison, Hypnotic Lace.
 * Accroche et intention : texte officiel de la créatrice (ressources-awrea/TEXTES/TEXTE DE
 * COLLECTION.pdf), repris mot pour mot ; seules la typographie française et la majuscule du nom de
 * la collection (« Hypnotic Lace ») sont harmonisées. Saison : inconnue, laissée vide.
 */
import type { Collection, Look } from "@/lib/commerce/types";

export const collections: Collection[] = [
  {
    handle: "hypnotic-lace",
    title: "Hypnotic Lace",
    season: "",
    current: true,
    officiel: true,
    lead: "La délicatesse, le pouvoir de l’or.",
    intention: [
      "La délicatesse rencontre la force. L’élégance devient une signature. Une rencontre entre la finesse de la dentelle, la sensualité des drapés et l’éclat audacieux de la dorure.",
      "À travers des silhouettes sculpturales et des détails précieux, la collection « Hypnotic Lace » célèbre une féminité contrastée : délicate, sensuelle et affirmée.",
    ],
    cover: {
      src: "/media/img/aria-1",
      alt: "La robe Aria portée, dentelle noire, drapé froncé à l’anneau doré et jupe sirène en satin noir",
      width: 1330,
      height: 1995,
      provisoire: true,
    },
    // aucun moodboard tant que la Maison n'a pas fourni ses images de recherche
    moodboard: [],
    products: ["body-aura", "robe-odessa", "robe-aria", "robe-sienna", "body-gaia", "top-evina", "top-kira"],
    seo: {
      title: "Hypnotic Lace, dentelle noire et dorure | Awrea Paris",
      description: "Hypnotic Lace, la collection d’Awrea Paris : la dentelle, les drapés et l’éclat de la dorure. Sept pièces créées sur demande par des artisans français.",
    },
  },
];

/**
 * Silhouettes (« Outfits ») : aucune pour le moment. Une silhouette demande une vraie photographie
 * de plusieurs pièces portées ensemble ; elle sera ajoutée après les shootings de la Maison.
 */
export const looks: Look[] = [];
