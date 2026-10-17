import { kv } from "@/lib/store";
import type { StoredMedia } from "@/lib/agents/team/catalogue";

/** Sert les photos déposées par l'atelier (fiches créées par l'agent Catalogue). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{6,40}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const m = await kv.get<StoredMedia>(`media:${id}`);
  if (!m) return new Response("Introuvable", { status: 404 });
  return new Response(Buffer.from(m.data, "base64"), {
    headers: { "Content-Type": m.mediaType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
