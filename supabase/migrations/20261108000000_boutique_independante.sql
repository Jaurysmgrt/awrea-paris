-- Boutique indépendante (demande de la créatrice du 08/11) : aucune plateforme de commerce
-- extérieure. Les commandes de la boutique de la Maison sont copiées ici sous leur propre
-- référence ; l'identifiant de fiche client d'une plateforme extérieure n'a plus d'usage.
--
-- Aucune commande n'est effacée : la colonne de référence est seulement renommée, et les
-- références des commandes passées sur le site perdent leur ancien préfixe « demo- ».

alter table public.orders rename column shopify_order_id to reference;
update public.orders set reference = substring(reference from 6) where reference like 'demo-%';
comment on column public.orders.reference is 'Identifiant de la commande dans la boutique de la Maison';

alter table public.customers drop column if exists shopify_customer_id;
