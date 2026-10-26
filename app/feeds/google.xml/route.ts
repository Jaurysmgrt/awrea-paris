import { buildFeed } from "@/lib/feeds";

/** Flux produits Google Merchant Center : à déclarer dans Merchant Center → Produits → Sources de données. */
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildFeed("google"), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}
