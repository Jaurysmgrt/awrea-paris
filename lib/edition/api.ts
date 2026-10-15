/** Outils communs des routes de l'éditeur (toutes sous l'adresse secrète de l'Atelier). */
import "server-only";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth/admin";
import { isLocale, type Locale } from "./config";
import { isDocId } from "./store";

/** Adresse du compte connecté, ou réponse 404 (l'éditeur n'existe pas pour le public). */
export async function editor(): Promise<{ email: string } | { response: NextResponse }> {
  const email = await currentAdmin();
  return email ? { email } : { response: NextResponse.json({ error: "Introuvable" }, { status: 404 }) };
}

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export const docAndLocale = (doc: unknown, locale: unknown): { doc: string; locale: Locale } | null =>
  typeof doc === "string" && isDocId(doc) && typeof locale === "string" && isLocale(locale) ? { doc, locale } : null;
