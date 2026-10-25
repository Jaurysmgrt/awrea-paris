-- =====================================================================================
-- AWREA PARIS — création sur demande (octobre 2026)
--
-- Chaque pièce est créée sur demande, sans stock, par des artisans français :
--  * plus de listes d'attente ni d'alertes de retour en stock : la table waitlist_entries et ses
--    politiques disparaissent (aucune donnée personnelle n'est plus collectée pour cela) ;
--  * plus de numéro d'édition ni de total de série : chaque certificat porte un NUMÉRO DE
--    CRÉATION unique, numéro d'ordre de la Maison tiré d'une séquence (jamais deux fois le même,
--    même pour des commandes simultanées), affiché « Création n° 0001 » ;
--  * les commandes gardent la date de chaque étape (reçue, en confection, prête, expédiée,
--    livrée) et le délai de fabrication annoncé à la commande ;
--  * les notifications ne proposent plus le sujet « restock » : nouvelles collections et
--    avant-premières seulement.
-- La sécurité par ligne reste activée sur toutes les tables ; aucune table n'est ajoutée.
-- =====================================================================================

-- ------------------------------------------------------------------ listes d'attente retirées
-- (la migration peut être rejouée : les politiques ne sont retirées que si la table existe encore)
do $$
begin
  if to_regclass('public.waitlist_entries') is not null then
    drop policy if exists "attente : lecture des siennes" on public.waitlist_entries;
    drop policy if exists "attente : retrait des siennes" on public.waitlist_entries;
  end if;
end $$;
drop table if exists public.waitlist_entries;

-- profil créé à l'inscription : la même fonction, sans le rattachement des listes d'attente
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
  return new;
end $$;

-- ------------------------------------------------------------------ numéro de création des certificats
create sequence if not exists public.certificate_creation_seq as bigint minvalue 1 start with 1 no cycle;
alter table public.certificates add column if not exists creation_number bigint;

-- certificats déjà émis : numérotés dans l'ordre de leur émission, à la suite des numéros existants
with ordered as (
  select serial, row_number() over (order by created_at, serial) as n
  from public.certificates
  where creation_number is null
)
update public.certificates c
set creation_number = o.n + (select coalesce(max(creation_number), 0) from public.certificates)
from ordered o
where c.serial = o.serial;

-- la séquence reprend après le plus grand numéro attribué (1 si aucun certificat)
select setval(
  'public.certificate_creation_seq',
  greatest((select coalesce(max(creation_number), 0) from public.certificates), 1),
  (select count(*) > 0 from public.certificates)
);

alter sequence public.certificate_creation_seq owned by public.certificates.creation_number;
alter table public.certificates alter column creation_number set default nextval('public.certificate_creation_seq');
alter table public.certificates alter column creation_number set not null;
create unique index if not exists certificates_creation_number_key on public.certificates (creation_number);
alter table public.certificates drop column if exists edition_number;
alter table public.certificates drop column if exists edition_total;

-- numéro suivant, tiré par le serveur au moment d'émettre un certificat (clé de service seulement)
create or replace function public.next_creation_number() returns bigint
language sql security definer set search_path = public as $$
  select nextval('public.certificate_creation_seq')
$$;
revoke execute on function public.next_creation_number() from public, anon, authenticated;
grant execute on function public.next_creation_number() to service_role;
-- la séquence n'est jamais lue ni avancée par une cliente ou une visiteuse
revoke all on sequence public.certificate_creation_seq from public, anon, authenticated;
grant usage, select on sequence public.certificate_creation_seq to service_role;

-- ------------------------------------------------------------------ étapes des commandes
-- date de chaque étape franchie : {"paid": "…", "in_production": "…", "ready": "…", "shipped": "…", "delivered": "…"}
alter table public.orders add column if not exists stage_dates jsonb not null default '{}'::jsonb;
-- délai de fabrication annoncé à la commande, en semaines : {"min": 2, "max": 3}
alter table public.orders add column if not exists lead_time jsonb;

-- commandes déjà copiées : la réception (date de commande) et la livraison, quand elles sont connues
update public.orders
set stage_dates = jsonb_strip_nulls(jsonb_build_object(
  'paid', case when status in ('paid', 'in_production', 'ready', 'shipped', 'delivered', 'returned') then placed_at end,
  'delivered', delivered_at
))
where stage_dates = '{}'::jsonb;

-- chaque changement de statut date l'étape franchie (la première date est gardée) ; la livraison
-- pose aussi delivered_at, point de départ du délai de retour
create or replace function public.orders_stage_dates() returns trigger
language plpgsql set search_path = public as $$
begin
  new.stage_dates := coalesce(new.stage_dates, '{}'::jsonb);
  if new.status in ('paid', 'in_production', 'ready', 'shipped', 'delivered')
     and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not (new.stage_dates ? new.status) then
    new.stage_dates := new.stage_dates || jsonb_build_object(
      new.status,
      case when tg_op = 'INSERT' and new.status = 'paid' then new.placed_at else now() end
    );
  end if;
  if new.status = 'delivered' and new.delivered_at is null then
    new.delivered_at := coalesce((new.stage_dates ->> 'delivered')::timestamptz, now());
  end if;
  return new;
end $$;
drop trigger if exists orders_stage_dates on public.orders;
create trigger orders_stage_dates before insert or update of status on public.orders
  for each row execute function public.orders_stage_dates();

-- ------------------------------------------------------------------ notifications : sans « restock »
update public.push_subscriptions set topics = array_remove(topics, 'restock') where 'restock' = any (topics);
-- par défaut : nouvelles collections et avant-premières
alter table public.push_subscriptions alter column topics set default array['collections', 'drops'];
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subscriptions_topics_check') then
    alter table public.push_subscriptions
      add constraint push_subscriptions_topics_check check (topics <@ array['collections', 'drops']::text[]);
  end if;
end $$;

-- ------------------------------------------------------------------ sécurité par ligne (rappel)
alter table public.orders enable row level security;
alter table public.certificates enable row level security;
alter table public.push_subscriptions enable row level security;
