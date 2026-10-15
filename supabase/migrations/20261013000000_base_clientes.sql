-- =====================================================================================
-- AWREA PARIS — base clientes (Supabase : PostgreSQL + authentification)
--
-- Principes
--  * données minimales : seulement ce qui sert la cliente (commandes, tailles, envies…) ;
--  * sécurité par ligne (RLS) activée sur TOUTES les tables : une cliente ne voit et ne
--    modifie que ses propres données ; le serveur du site utilise la clé « service » pour
--    la synchronisation Shopify, les preuves de consentement et le tableau de bord ;
--  * données de navigation enregistrées seulement avec le consentement « personnalisation »,
--    et purgées au bout de 13 mois (fonction purge_expired, appelée chaque jour).
-- =====================================================================================

-- gen_random_uuid() fait partie de PostgreSQL (13+) : aucune extension nécessaire

-- ------------------------------------------------------------------ profils clientes
create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  phone text check (char_length(phone) <= 30),
  birthday date,                                   -- facultatif (mot d'anniversaire)
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  currency text not null default 'EUR' check (currency in ('EUR', 'GBP', 'USD', 'CHF')),
  -- tailles habituelles et mesures (cm) : {"haut":"S","bas":"36","robe":"S","mesures":{"poitrine":86,"taille":66,"hanches":92,"stature":168}}
  sizes jsonb not null default '{}'::jsonb,
  marketing_email boolean not null default false,
  marketing_email_at timestamptz,
  personalization boolean not null default false,  -- reflète le consentement « personnalisation »
  cercle_member boolean not null default false,    -- club « Le Cercle Awrea »
  cercle_joined_at timestamptz,
  vip_since timestamptz,
  shopify_customer_id text unique,
  terms_version text,                              -- CGU acceptées à la création du compte
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists customers_email_idx on public.customers (lower(email));

-- ------------------------------------------------------------------ adresses
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text check (char_length(label) <= 40),
  first_name text not null check (char_length(first_name) <= 80),
  last_name text not null check (char_length(last_name) <= 80),
  line1 text not null check (char_length(line1) <= 160),
  line2 text check (char_length(line2) <= 160),
  postal_code text not null check (char_length(postal_code) <= 20),
  city text not null check (char_length(city) <= 80),
  country text not null default 'FR' check (char_length(country) = 2),
  phone text check (char_length(phone) <= 30),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses (customer_id);

-- ------------------------------------------------------------------ commandes (copie synchronisée de Shopify)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  email text not null,
  shopify_order_id text unique,
  number text not null,
  status text not null,
  currency text not null default 'EUR',
  subtotal integer not null default 0,              -- montants en centimes, comme dans le code du site
  total integer not null default 0,
  items jsonb not null default '[]'::jsonb,         -- [{"handle","title","size","quantity","unitPrice","editionLabel"}]
  shipping jsonb not null default '{}'::jsonb,      -- {"method","price","country","tracking","carrier"}
  customer_name text,
  payment_method text,
  source text,                                      -- canal d'origine (instagram, google, direct, newsletter…)
  utm jsonb,
  gift boolean not null default false,
  placed_at timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders (customer_id, placed_at desc);
create index if not exists orders_email_idx on public.orders (lower(email));

-- ------------------------------------------------------------------ liste d'envies
create table if not exists public.wishlist_items (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_handle text not null check (char_length(product_handle) <= 120),
  added_at timestamptz not null default now(),
  primary key (customer_id, product_handle)
);

-- liste d'envies partageable (lien secret, révocable)
create table if not exists public.shared_wishlists (
  token text primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ------------------------------------------------------------------ listes d'attente
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  email text not null,
  product_handle text not null,
  size text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (email, product_handle, size)
);

-- ------------------------------------------------------------------ navigation (consentement « personnalisation »)
create table if not exists public.browsing_events (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind text not null check (kind in ('view', 'collection', 'search')),
  product_handle text,
  collection_handle text,
  created_at timestamptz not null default now()
);
create index if not exists browsing_customer_idx on public.browsing_events (customer_id, created_at desc);

-- panier en cours (relance de panier abandonné, avec consentement)
create table if not exists public.carts (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,              -- centimes
  updated_at timestamptz not null default now(),
  reminded_at timestamptz
);

-- ------------------------------------------------------------------ preuves de consentement aux cookies
create table if not exists public.consent_records (
  id bigint generated always as identity primary key,
  consent_id text not null,
  customer_id uuid references public.customers (id) on delete set null,
  analytics boolean not null,
  personalization boolean not null,
  advertising boolean not null,
  policy_version text not null,
  source text not null check (source in ('banner', 'settings')),
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists consent_records_id_idx on public.consent_records (consent_id, created_at desc);

-- ------------------------------------------------------------------ avis vérifiés (après achat uniquement)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  product_handle text not null,
  author_name text not null check (char_length(author_name) <= 60),   -- prénom + initiale
  body text not null check (char_length(body) between 20 and 1500),
  fit text check (fit in ('petite', 'juste', 'grande')),
  size text,
  photos jsonb not null default '[]'::jsonb,                          -- trois photos au plus (identifiants)
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,                                               -- note interne de l'atelier
  reply text check (char_length(reply) <= 600),                       -- réponse publique de la créatrice
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  unique (order_id, product_handle)
);
create index if not exists reviews_product_idx on public.reviews (product_handle, status, created_at desc);

-- ------------------------------------------------------------------ certificats d'authenticité
create table if not exists public.certificates (
  serial text primary key,                     -- ex. AW-ODS-03-7K4Q (imprimé sous le QR code)
  product_handle text not null,
  product_title text not null,
  size text,
  image text,
  edition_number int,
  edition_total int,
  collection text,
  made_on date,
  creator_note text,
  materials text,
  order_id uuid references public.orders (id) on delete set null,
  order_number text,
  owner_email_hash text,                       -- empreinte SHA-256 de l'e-mail de l'acheteuse (rattachement)
  claim_code_hash text,                        -- code imprimé sur le certificat papier (pièce offerte)
  claim_code_sealed text,                      -- le même code, chiffré (AES-GCM) pour l'impression par l'atelier
  customer_id uuid references public.customers (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists certificates_owner_idx on public.certificates (owner_email_hash);
create index if not exists certificates_order_idx on public.certificates (order_number);

-- ------------------------------------------------------------------ rendez-vous privés
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  email text not null,
  name text not null,
  kind text not null check (kind in ('atelier', 'video')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  notes text check (char_length(notes) <= 1000),
  calendar_event_id text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ notifications (PWA)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  topics text[] not null default array['drops', 'restock'],
  locale text not null default 'fr',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ inscriptions aux drops (accès anticipé)
create table if not exists public.drop_signups (
  id uuid primary key default gen_random_uuid(),
  drop_slug text not null,
  email text not null,
  customer_id uuid references public.customers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (drop_slug, email)
);

-- =====================================================================================
-- Sécurité par ligne
-- =====================================================================================
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.shared_wishlists enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.browsing_events enable row level security;
alter table public.carts enable row level security;
alter table public.consent_records enable row level security;
alter table public.reviews enable row level security;
alter table public.certificates enable row level security;
alter table public.appointments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.drop_signups enable row level security;

-- profil : lecture et mise à jour de son propre profil (création par déclencheur)
create policy "profil : lecture" on public.customers for select to authenticated using (id = (select auth.uid()));
create policy "profil : mise à jour" on public.customers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- colonnes que la cliente ne peut pas modifier elle-même
revoke update on public.customers from authenticated;
grant update (first_name, last_name, phone, birthday, locale, currency, sizes, marketing_email, marketing_email_at, personalization, cercle_member, cercle_joined_at, last_seen_at, updated_at)
  on public.customers to authenticated;

create policy "adresses : les siennes" on public.addresses for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create policy "commandes : lecture des siennes" on public.orders for select to authenticated using (customer_id = (select auth.uid()));

create policy "envies : les siennes" on public.wishlist_items for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy "envies partagées : les siennes" on public.shared_wishlists for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create policy "attente : lecture des siennes" on public.waitlist_entries for select to authenticated using (customer_id = (select auth.uid()));
create policy "attente : retrait des siennes" on public.waitlist_entries for delete to authenticated using (customer_id = (select auth.uid()));

-- navigation : seulement si la cliente a accepté la personnalisation
create policy "navigation : lecture des siennes" on public.browsing_events for select to authenticated using (customer_id = (select auth.uid()));
create policy "navigation : ajout avec consentement" on public.browsing_events for insert to authenticated
  with check (customer_id = (select auth.uid()) and exists (select 1 from public.customers c where c.id = (select auth.uid()) and c.personalization));
create policy "navigation : effacement" on public.browsing_events for delete to authenticated using (customer_id = (select auth.uid()));

create policy "panier : le sien" on public.carts for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

-- avis : publiés visibles de tous ; les siens visibles quel que soit leur statut ;
-- dépôt uniquement pour une pièce effectivement commandée
create policy "avis : publiés" on public.reviews for select to anon, authenticated using (status = 'approved');
create policy "avis : les siens" on public.reviews for select to authenticated using (customer_id = (select auth.uid()));
create policy "avis : dépôt après achat" on public.reviews for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select auth.uid())
        and o.items @> jsonb_build_array(jsonb_build_object('handle', product_handle))
    )
  );

create policy "certificats : les siens" on public.certificates for select to authenticated using (customer_id = (select auth.uid()));
create policy "rendez-vous : les siens" on public.appointments for select to authenticated using (customer_id = (select auth.uid()));
create policy "notifications : les siennes" on public.push_subscriptions for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy "drops : les siennes" on public.drop_signups for select to authenticated using (customer_id = (select auth.uid()));
-- consent_records : aucune politique → accessible uniquement au serveur (clé service)

-- =====================================================================================
-- Fonctions
-- =====================================================================================

-- profil créé automatiquement à l'inscription (e-mail, Google ou Apple)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name');
begin
  insert into public.customers (id, email, first_name, last_name, terms_version, terms_accepted_at, marketing_email, marketing_email_at)
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'first_name', split_part(full_name, ' ', 1)),
    coalesce(meta ->> 'last_name', nullif(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), '')),
    meta ->> 'terms_version',
    case when meta ? 'terms_version' then now() end,
    coalesce((meta ->> 'marketing_email')::boolean, false),
    case when coalesce((meta ->> 'marketing_email')::boolean, false) then now() end
  )
  on conflict (id) do nothing;
  -- rattache les commandes passées sans compte avec la même adresse
  update public.orders set customer_id = new.id where customer_id is null and lower(email) = lower(new.email);
  update public.waitlist_entries set customer_id = new.id where customer_id is null and lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

-- statistiques par cliente (tableau de bord : segments nouvelles / fidèles / VIP) — serveur uniquement ; montants en centimes
create or replace view public.customer_stats with (security_invoker = true) as
select
  c.id, c.email, c.first_name, c.last_name, c.created_at, c.cercle_member, c.marketing_email, c.locale,
  count(o.id) filter (where o.status <> 'refunded') as orders_count,
  coalesce(sum(o.total) filter (where o.status <> 'refunded'), 0) as total_spent,
  max(o.placed_at) as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;
revoke all on public.customer_stats from anon, authenticated;

-- purge quotidienne : navigation > 13 mois, paniers relancés > 30 jours, preuves de consentement > 25 mois
create or replace function public.purge_expired() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_browse int; n_carts int; n_consent int;
begin
  delete from public.browsing_events where created_at < now() - interval '13 months';
  get diagnostics n_browse = row_count;
  delete from public.carts where updated_at < now() - interval '30 days';
  get diagnostics n_carts = row_count;
  delete from public.consent_records where created_at < now() - interval '25 months';
  get diagnostics n_consent = row_count;
  return jsonb_build_object('browsing_events', n_browse, 'carts', n_carts, 'consent_records', n_consent);
end $$;
-- réservée au serveur (clé de service) : PostgreSQL accorde l'exécution à PUBLIC par défaut
revoke execute on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.purge_expired() to service_role;

-- Stockage des photos d'avis : bucket privé « reviews » (créé ici, lecture via URL signée)
insert into storage.buckets (id, name, public) values ('reviews', 'reviews', false) on conflict (id) do nothing;
