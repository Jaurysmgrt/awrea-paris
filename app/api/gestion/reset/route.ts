import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { kv } from "@/lib/store";
import { boutiqueReelle } from "@/lib/config/boutique";
import { DEMO_KEYS } from "@/lib/commerce/catalog-demo";

/**
 * Réinitialise les données de démonstration (jamais sur la boutique réelle, lib/config/boutique.ts) : les surcouches
 * du catalogue (DEMO_KEYS), les commandes, la mémoire des agents. Les anciennes clés de stock
 * (« demo:stock », « demo:produced »), de liste d'attente (« waitlist ») et de l'ancien agent
 * (« agents:commandes-stock:memory ») sont encore effacées : elles ne servent plus (pièces créées
 * sur demande), et aucune donnée personnelle n'en reste. Le compteur des numéros de création (certificates:creation) n'est jamais remis à zéro :
 * un numéro n'est jamais attribué deux fois.
 */
const KEYS = [
  ...Object.values(DEMO_KEYS), "demo:products:drafts", "demo:stock", "demo:produced",
  "orders", "orders:status", "orders:stages", "waitlist", "inbox", "agents:log", "agents:proposals", "agents:runs",
  "agents:commandes-confection:memory", "agents:commandes-stock:memory",
  "content:drafts", "reports", "seo:audits", "seo:ideas", "journal:articles", "ai:llms-notes", "email:outbox", "assistant:log", "certificates",
  "invoices", "invoices:counters", "returns", "returns:counters", "orders:delivered", "orders:tracking",
];

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (boutiqueReelle()) return NextResponse.json({ error: "Réinitialisation impossible sur la boutique réelle." }, { status: 400 });
  for (const k of KEYS) await kv.del(k);
  return NextResponse.json({ ok: true });
}
