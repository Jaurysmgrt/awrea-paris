/**
 * Coulisses de l'atelier, glissées au fil du parcours (fiche pièce, confirmation de commande,
 * page introuvable) : un geste filmé, une légende courte. Les textes ne disent que ce que la
 * maison affirme déjà ailleurs (fait main à Paris, pièces numérotées, certificat signé).
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
    caption: "Prise de mesures",
    title: "Avant la coupe, le mètre ruban",
    text: "Chaque pièce commence par des mesures prises à la main. C’est là qu’elle commence à vous ressembler.",
  },
  dentelle: {
    key: "dentelle",
    video: v(2),
    caption: "Découpe des motifs de dentelle",
    title: "La dentelle se découpe motif par motif",
    text: "Aux ciseaux à broder, en suivant le dessin des fleurs, pour qu’aucune ne soit coupée par une couture.",
  },
  point: {
    key: "point",
    video: v(3),
    caption: "Le point invisible",
    title: "Un point qui disparaît",
    text: "Les assemblages les plus délicats sont cousus à l’aiguille, d’un point qui se fond dans la matière.",
  },
  finitions: {
    key: "finitions",
    video: v(4),
    caption: "Finitions",
    title: "Le dernier regard",
    text: "Un dernier fil coupé, un dernier pli repassé ; puis la pièce reçoit son numéro et son certificat signé par la créatrice.",
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
