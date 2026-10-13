/**
 * Accès à la base clientes Supabase (PostgreSQL + authentification).
 *
 * - `supabaseAdmin()` : client « service » réservé au serveur (synchronisation Shopify,
 *   preuves de consentement, tableau de bord). Il contourne la sécurité par ligne (RLS) :
 *   ne jamais l'exposer au navigateur ni l'utiliser pour servir les données d'une cliente.
 * - les données d'une cliente sont lues avec SA session (lib/db/auth.ts), RLS appliquée.
 *
 * Sans variables Supabase, le site fonctionne en mode démonstration (stockage clé-valeur local).
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && serviceKey);

const g = globalThis as unknown as { __awreaSupabaseAdmin?: SupabaseClient };

export function supabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).");
  return (g.__awreaSupabaseAdmin ??= createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application": "awrea-paris" } },
  }));
}
