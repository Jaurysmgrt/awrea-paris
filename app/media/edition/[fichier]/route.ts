/**
 * Photos de l'éditeur rangées dans public/media/edition (mode `fichiers`). En développement, le
 * serveur les sert directement ; un serveur compilé avant leur dépôt les sert par cette route.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { MEDIA_DIR } from "@/lib/edition/medias";

export async function GET(_req: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  if (!/^[a-z0-9-]+\.webp$/.test(fichier)) return new Response("Introuvable", { status: 404 });
  try {
    const data = await fs.readFile(path.join(MEDIA_DIR(), fichier));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
