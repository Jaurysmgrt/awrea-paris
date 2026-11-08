/**
 * Manifeste de l'application privée de l'Atelier (installation sur l'écran d'accueil). Servi sous
 * l'adresse secrète, sans session (le navigateur le lit sans cookie) : il ne contient que le nom,
 * les icônes et l'adresse de l'Atelier, déjà connue de qui la demande.
 */
import { manifesteAtelier } from "@/lib/admin/application";
import { atelierBase, ATELIER_INTERNAL } from "@/lib/admin/path";
import { palette } from "@/styles/tokens";

export const dynamic = "force-dynamic";

export function GET() {
  const corps = JSON.stringify(manifesteAtelier(atelierBase() ?? ATELIER_INTERNAL, { fond: palette.ivory, theme: palette.ivory }));
  return new Response(corps, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "private, no-store" } });
}
