import { buildFeed } from "@/lib/feeds";

/** Flux produits Meta (boutiques Instagram et Facebook) : à déclarer dans Commerce Manager → Catalogue → Sources de données. */
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildFeed("meta"), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}
