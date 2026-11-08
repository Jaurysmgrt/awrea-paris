/**
 * Service worker de l'application privée de l'Atelier, servi sous son adresse secrète : sa portée
 * s'arrête à l'Atelier. Il ne garde aucune donnée (lib/admin/application.ts) et se met à jour seul.
 */
import { pageHorsLigne, scriptServiceWorker } from "@/lib/admin/application";
import { atelierBase, ATELIER_INTERNAL } from "@/lib/admin/path";
import { palette } from "@/styles/tokens";

export const dynamic = "force-dynamic";

export function GET() {
  const base = atelierBase() ?? ATELIER_INTERNAL;
  const script = scriptServiceWorker(base, `${base}/api`, pageHorsLigne({ clair: palette.ivory, sombre: palette.ink, doux: palette.taupeDeep }));
  return new Response(script, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "private, no-cache, no-store" } });
}
