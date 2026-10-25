/**
 * Coulisses de l'atelier, glissées au fil du parcours (confirmation de commande) : un geste filmé,
 * une légende courte. Les textes ne disent que ce que la Maison affirme dans ses ressources
 * officielles : chaque pièce est créée sur demande, sans stock, par des artisans français, avec une
 * attention portée à leurs conditions de travail ; la dentelle, les drapés et la dorure d'Hypnotic
 * Lace ; le numéro de création inscrit sur le certificat d'authenticité.
 * Les vidéos sont provisoires (animées à partir des photographies de l'ancien site) : à remplacer
 * par des images des artisans de la Maison dès qu'elles existent. Les légendes décrivent ce qu'on y
 * voit, sans prêter aux artisans un geste qu'ils n'ont pas confirmé.
 */
import type { Product } from "@/lib/commerce/types";

export interface AtelierMoment {
  key: "mesures" | "dentelle" | "point" | "finitions";
  video: { src: string; poster: string };
  caption: string;
  title: string;
  text: string;
}

const v = (n: number) => ({ src: `/media/video/atelier-${n}.mp4`, poster: `/media/video/atelier-${n}.webp` });

export const atelierMoments: Record<AtelierMoment["key"], AtelierMoment> = {
  mesures: {
    key: "mesures",
    video: v(1),
    caption: "Épingles et mètre ruban",
    title: "Rien n’est cousu d’avance",
    text: "Votre pièce n’existe pas avant votre commande. Elle est créée sur demande, dans la taille que vous avez choisie, et rien ne dort en stock.",
  },
  dentelle: {
    key: "dentelle",
    video: v(2),
    caption: "Un motif de dentelle",
    title: "La dentelle d’abord",
    text: "Dans Hypnotic Lace, la dentelle noire prend la taille, le buste ou l’épaule. Sur certaines pièces, l’or s’y mêle.",
  },
  point: {
    key: "point",
    video: v(3),
    caption: "Couture à l’aiguille",
    title: "Des mains françaises",
    text: "Nos pièces sont confectionnées par des artisans français. La Maison veille à leurs conditions de travail et à la reconnaissance de leur métier.",
  },
  finitions: {
    key: "finitions",
    video: v(4),
    caption: "Finitions",
    title: "Le dernier regard",
    text: "Une fois terminée, la pièce reçoit son numéro de création, inscrit sur son certificat d’authenticité. Puis elle part vers vous.",
  },
};

/** Le geste qui raconte le mieux une pièce, selon sa matière principale. */
export function momentFor(product: Pick<Product, "materials" | "category">): AtelierMoment {
  const main = [...product.materials].sort((a, b) => b.percent - a.percent)[0]?.name.toLowerCase() ?? "";
  const all = product.materials.map((m) => m.name.toLowerCase()).join(" ");
  if (all.includes("dentelle")) return atelierMoments.dentelle;
  if (main.includes("satin") || main.includes("soie")) return atelierMoments.point;
  if (product.category === "body" || product.category === "top") return atelierMoments.mesures;
  return atelierMoments.finitions;
}
