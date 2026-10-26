-- Test de restauration (.github/workflows/backup.yml) dans un PostgreSQL vierge :
-- objets propres à Supabase simulés (rôles, schéma auth, stockage), comme pour npm run test:db.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
