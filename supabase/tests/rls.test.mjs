/**
 * Vérifie le schéma Supabase et la sécurité par ligne (RLS) dans un PostgreSQL embarqué (PGlite),
 * sans compte Supabase : `npm run test:db`. Les objets propres à Supabase (rôles, auth.users,
 * auth.uid(), stockage) sont simulés.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
const db = new PGlite();
const assert = (ok, msg) => {
  if (!ok) {
    console.error("ÉCHEC :", msg);
    process.exit(1);
  }
  console.log("ok —", msg);
};
// stubs Supabase : rôles, schéma auth (users, uid()), stockage
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
`);
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(dir, f));
for (const f of files) {
  try {
    await db.exec(fs.readFileSync(f, "utf8"));
    console.log("migration appliquée :", path.basename(f));
  } catch (e) {
    console.error("ERREUR", path.basename(f), e.message);
    process.exit(1);
  }
}
// scénario RLS
await db.exec(`grant usage on schema public to authenticated, anon; grant select, insert, delete on all tables in schema public to authenticated; grant select on public.reviews to anon;`);
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111', 'a@ex.fr', '{"full_name":"Camille Martin","terms_version":"2026-10"}'), ('22222222-2222-2222-2222-222222222222', 'b@ex.fr', '{}');`);
const r = await db.query(`select id, first_name, last_name, terms_version, terms_accepted_at is not null as accepted from public.customers order by email`);
assert(r.rows.length === 2 && r.rows[0].first_name === "Camille" && r.rows[0].last_name === "Martin" && r.rows[0].accepted, "profil créé à l'inscription, nom et CGU repris");
await db.exec(`insert into public.orders (customer_id, email, number, status, total, items, placed_at) values ('11111111-1111-1111-1111-111111111111', 'a@ex.fr', 'AW-1', 'paid', 420, '[{"handle":"robe-odessa","title":"Robe Odessa","size":"S","quantity":1}]', now());`);
// en tant que cliente A
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);`);
assert((await db.query(`select email from public.customers`)).rows.length === 1, "une cliente ne voit que son profil");
assert((await db.query(`select number from public.orders`)).rows.length === 1, "une cliente voit ses commandes");
const oid = (await db.query(`select id from public.orders limit 1`)).rows[0].id;
await db.query(`insert into public.reviews (customer_id, order_id, product_handle, author_name, body) values ($1, $2, 'robe-odessa', 'Camille M.', 'Une robe magnifique, la dentelle est d''une finesse rare.')`, ['11111111-1111-1111-1111-111111111111', oid]);
assert(true, "avis accepté pour une pièce achetée");
const refused = async (sql, params) => db.query(sql, params).then(() => false, () => true);
assert(await refused(`insert into public.reviews (customer_id, order_id, product_handle, author_name, body) values ($1, $2, 'body-gaia', 'Camille M.', 'Je n''ai pas acheté cette pièce mais je donne mon avis.')`, ['11111111-1111-1111-1111-111111111111', oid]), "avis refusé pour une pièce non achetée");
assert(await refused(`update public.customers set shopify_customer_id = 'x'`), "colonnes protégées non modifiables par la cliente");
assert(await refused(`insert into public.browsing_events (customer_id, kind, product_handle) values ('11111111-1111-1111-1111-111111111111', 'view', 'robe-odessa')`), "navigation refusée sans consentement");
await db.exec(`update public.customers set personalization = true`);
await db.exec(`insert into public.browsing_events (customer_id, kind, product_handle) values ('11111111-1111-1111-1111-111111111111', 'view', 'robe-odessa')`);
assert(true, "navigation enregistrée avec consentement");
assert(await refused(`select * from public.consent_records`).then((r) => r) || (await db.query(`select * from public.consent_records`)).rows.length === 0, "preuves de consentement invisibles côté cliente");
// en tant que cliente B
await db.exec(`select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);`);
assert((await db.query(`select email from public.customers`)).rows.length === 1, "la cliente B ne voit pas le profil de A");
assert((await db.query(`select number from public.orders`)).rows.length === 0, "la cliente B ne voit pas les commandes de A");
assert((await db.query(`select * from public.browsing_events`)).rows.length === 0, "la cliente B ne voit pas la navigation de A");
assert((await db.query(`select * from public.reviews`)).rows.length === 0, "avis en attente invisibles pour les autres");
await db.exec(`reset role;`);
const purge = (await db.query(`select public.purge_expired() as r`)).rows[0].r;
assert(typeof purge === "object", "purge quotidienne disponible");
console.log("Base clientes : schéma et sécurité par ligne vérifiés.");
