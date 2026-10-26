import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/require-customer";
import { signOut } from "@/lib/auth/customer";
import { deleteAccount } from "@/lib/customers";
import { kv } from "@/lib/store";

/** RGPD — droit à l'effacement. Confirmation explicite : la cliente saisit « SUPPRIMER ». */
export async function POST(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const parsed = z.object({ confirm: z.literal("SUPPRIMER") }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pour confirmer, saisissez SUPPRIMER." }, { status: 400 });
  await deleteAccount(session);
  await signOut();
  // trace minimale, sans donnée personnelle, pour le registre des demandes RGPD
  await kv.push("rgpd:requests", { kind: "effacement", at: new Date().toISOString() }, 1000);
  return NextResponse.json({ ok: true });
}
