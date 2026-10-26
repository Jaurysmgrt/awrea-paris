import { buildLlms } from "@/lib/seo/llms";
import { sitePrive } from "@/lib/security/private-site";

export const revalidate = 3600;

export async function GET() {
  // site privé (SITE_PRIVE=1) : rien à lire pour les moteurs
  if (sitePrive()) return new Response("Introuvable", { status: 404 });
  return new Response(await buildLlms(false), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
