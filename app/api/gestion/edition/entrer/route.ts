import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { editor } from "@/lib/edition/api";

/**
 * Entrer en mode Édition sur une page du site : la page affiche alors les brouillons, et chaque
 * texte devient cliquable. Seulement pour un compte de l'Atelier connecté.
 */
export async function GET(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const url = new URL(req.url);
  const chemin = url.searchParams.get("chemin") ?? "/";
  // une page du site seulement : jamais une autre adresse (redirection ouverte)
  const safe = /^\/(?!\/)[a-z0-9/_\-.?=&%]*$/i.test(chemin) ? chemin : "/";
  (await draftMode()).enable();
  return NextResponse.redirect(new URL(safe, url.origin), { status: 303 });
}
