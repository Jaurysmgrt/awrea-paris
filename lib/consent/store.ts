/**
 * Preuves de consentement aux cookies.
 * Chaque choix (bandeau ou « Gérer mes cookies ») est enregistré avec son identifiant, la date,
 * les catégories acceptées ou refusées, la version de la politique affichée et la page d'origine.
 * Aucune adresse IP n'est conservée. Base Supabase (table consent_records) si configurée,
 * stockage clé-valeur sinon.
 */
import "server-only";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import type { ConsentChoices } from "./index";

export interface ConsentRecord {
  consentId: string;
  choices: ConsentChoices;
  policy: string;
  source: "banner" | "settings";
  path: string;
  userAgent: string;
  customerId?: string | null;
  at: string;
}

const KEY = "consent:records";

export async function recordConsent(rec: ConsentRecord): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabaseAdmin()
      .from("consent_records")
      .insert({
        consent_id: rec.consentId,
        customer_id: rec.customerId ?? null,
        analytics: rec.choices.analytics,
        personalization: rec.choices.personalization,
        advertising: rec.choices.advertising,
        policy_version: rec.policy,
        source: rec.source,
        path: rec.path,
        user_agent: rec.userAgent,
        created_at: rec.at,
      });
    if (error) throw new Error(`consent_records : ${error.message}`);
    return;
  }
  await kv.push(KEY, rec, 5000);
}

export async function listConsents(limit = 200): Promise<ConsentRecord[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin().from("consent_records").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      consentId: r.consent_id,
      customerId: r.customer_id,
      choices: { analytics: r.analytics, personalization: r.personalization, advertising: r.advertising },
      policy: r.policy_version,
      source: r.source,
      path: r.path,
      userAgent: r.user_agent,
      at: r.created_at,
    }));
  }
  return kv.list<ConsentRecord>(KEY, limit);
}

/** Taux d'acceptation par catégorie (tableau de bord, sans donnée personnelle). */
export async function consentStats(limit = 2000) {
  const recs = await listConsents(limit);
  const latest = new Map<string, ConsentRecord>();
  for (const r of recs) if (!latest.has(r.consentId)) latest.set(r.consentId, r);
  const all = [...latest.values()];
  const rate = (k: keyof ConsentChoices) => (all.length ? Math.round((all.filter((r) => r.choices[k]).length / all.length) * 100) : 0);
  return { total: all.length, analytics: rate("analytics"), personalization: rate("personalization"), advertising: rate("advertising") };
}
