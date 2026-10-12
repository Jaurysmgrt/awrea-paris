/**
 * Résolution unique des URL d'images :
 * - visuels locaux préparés par scripts/build-media.py : /media/img/<nom>(-480|-960).webp
 * - photos déposées par l'atelier : /api/media/<id> (une seule taille)
 * - CDN Shopify : paramètre ?width=
 */
export type ImageWidth = 480 | 960 | 1200;

export function isSized(src: string): boolean {
  return !src.startsWith("http") && !src.startsWith("/api/") && !/\.(webp|jpe?g|png|svg|gif)$/i.test(src);
}

export function imageAt(src: string, width: ImageWidth = 960): string {
  if (!src) return "";
  if (src.startsWith("http")) return `${src}${src.includes("?") ? "&" : "?"}width=${width}`;
  if (!isSized(src)) return src;
  return width === 1200 ? `${src}.webp` : `${src}-${width}.webp`;
}
