/**
 * Dépôt d'une photo depuis l'Atelier : réduite dans le navigateur (1 600 px au plus, JPEG), puis
 * envoyée à /api/media, qui la garde et renvoie son identifiant. Partagé par la nouvelle pièce et
 * les photos d'une pièce.
 */
async function reduire(file: File): Promise<{ data: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], width, height };
}

/** La photo déposée, ou null si elle n'a pas pu être lue ou envoyée. */
export async function deposerPhoto(urlMedia: string, file: File): Promise<{ id: string; url: string } | null> {
  try {
    const { data, width, height } = await reduire(file);
    const res = await fetch(urlMedia, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name.slice(0, 120), mediaType: "image/jpeg", data, width, height }) });
    const j = await res.json().catch(() => ({}));
    return res.ok && j.id ? { id: String(j.id), url: String(j.url) } : null;
  } catch {
    return null;
  }
}
