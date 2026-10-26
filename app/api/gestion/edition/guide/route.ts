import { NextResponse } from "next/server";
import { kv } from "@/lib/store";
import { editor } from "@/lib/edition/api";

/** Le guide d'accueil de l'éditeur n'est montré qu'une fois par compte (il reste dans l'aide). */
export async function POST() {
  const who = await editor();
  if ("response" in who) return who.response;
  await kv.set(`edition:guide:${who.email}`, new Date().toISOString());
  return NextResponse.json({ ok: true });
}
