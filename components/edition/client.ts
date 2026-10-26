/** Appels de l'éditeur vers l'API de l'Atelier (adresse secrète transmise par la page). */
export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  data: T & { error?: string };
}

export async function call<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, { cache: "no-store", ...init }).catch(() => null);
  const data = (res ? await res.json().catch(() => ({})) : { error: "Le réseau ne répond pas. Vos modifications ne sont pas perdues : réessayez." }) as T & { error?: string };
  return { ok: Boolean(res?.ok), data };
}

export const postJson = <T = Record<string, unknown>>(url: string, body: unknown) =>
  call<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Allège une photo dans le navigateur avant l'envoi (2560 px au plus, WebP), pour rester sous 4 Mo. */
export async function shrink(file: File): Promise<Blob> {
  if (file.size < 1_500_000 || !("createImageBitmap" in window)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.9, 0.82, 0.72]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
      if (blob && blob.size < 3_800_000) return blob;
    }
  } catch {
    /* format que le navigateur ne sait pas lire : envoi tel quel */
  }
  return file;
}

/** Vignette d'une photo : la déclinaison de 480 px (photos de la Maison et photos déposées), l'image elle-même pour un fichier nommé (Shopify). */
export const thumb = (src: string) => (!src ? "" : src.startsWith("/api/") || /\.(webp|jpe?g|png|avif)(\?|$)/i.test(src) ? src : `${src}-480.webp`);
