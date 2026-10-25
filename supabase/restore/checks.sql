-- Contrôles après restauration : toutes les tables de la base clientes sont présentes,
-- la sécurité par ligne est active partout, et les données sont lisibles.
\set ON_ERROR_STOP on
do $$
declare
  missing text;
  unprotected text;
begin
  select string_agg(t, ', ') into missing
  from unnest(array['customers','addresses','orders','wishlist_items','shared_wishlists','browsing_events','carts','consent_records','reviews','certificates','appointments','push_subscriptions','drop_signups']) as t
  where to_regclass('public.' || t) is null;
  if missing is not null then raise exception 'Tables absentes après restauration : %', missing; end if;
  select string_agg(relname, ', ') into unprotected
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
  if unprotected is not null then raise exception 'Tables sans sécurité par ligne : %', unprotected; end if;
end $$;
select 'clientes' as table, count(*) from public.customers
union all select 'commandes', count(*) from public.orders
union all select 'consentements', count(*) from public.consent_records;
