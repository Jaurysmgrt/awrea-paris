import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { kv } from "@/lib/store";
import { commerceMode } from "@/lib/commerce";

/** Réinitialise les données de démonstration (indisponible quand Shopify est branché). */
const KEYS = [
  "demo:stock", "demo:produced", "demo:price", "demo:products:extra", "demo:products:removed", "demo:products:patch", "demo:products:drafts",
  "orders", "orders:status", "waitlist", "inbox", "agents:log", "agents:proposals", "agents:runs", "agents:commandes-stock:memory",
  "content:drafts", "reports", "seo:audits", "seo:ideas", "journal:articles", "ai:llms-notes", "email:outbox", "assistant:log",
];

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (commerceMode !== "demo") return NextResponse.json({ error: "Réinitialisation impossible avec une vraie boutique." }, { status: 400 });
  for (const k of KEYS) await kv.del(k);
  return NextResponse.json({ ok: true });
}
