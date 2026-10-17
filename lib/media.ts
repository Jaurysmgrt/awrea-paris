/**
 * Résolution unique des URL d'images :
 * - visuels locaux préparés par scripts/build-media.py : /media/img/<nom>(-480|-960).webp
 * - photos déposées par l'atelier : /api/media/<id> (une seule taille)
 * - photos de l'éditeur : /media/edition/<id> ou Supabase Storage (…/public/medias/edition/<id>),
 *   déclinées comme les visuels locaux
 * - CDN Shopify : paramètre ?width=
 */
export type ImageWidth = 480 | 960 | 1200;

/** Photo de l'éditeur rangée dans Supabase Storage : mêmes déclinaisons que les visuels locaux. */
export const isStoredEdition = (src: string) => /^https:\/\/[^/]+\/storage\/v1\/object\/public\/medias\/edition\/[a-z0-9-]+$/.test(src);

export function isSized(src: string): boolean {
  if (isStoredEdition(src)) return true;
  return !src.startsWith("http") && !src.startsWith("/api/") && !/\.(webp|jpe?g|png|svg|gif)$/i.test(src);
}

export function imageAt(src: string, width: ImageWidth = 960): string {
  if (!src) return "";
  if (src.startsWith("http") && !isStoredEdition(src)) return `${src}${src.includes("?") ? "&" : "?"}width=${width}`;
  if (!isSized(src)) return src;
  return width === 1200 ? `${src}.webp` : `${src}-${width}.webp`;
}
