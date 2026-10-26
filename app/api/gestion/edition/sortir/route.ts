import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/** Quitter le mode Édition : la page redevient celle que voit le public. */
export async function POST() {
  (await draftMode()).disable();
  return NextResponse.json({ ok: true });
}
