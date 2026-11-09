# Awrea Paris

Site e-commerce de la maison Awrea Paris : prêt-à-porter féminin créé sur demande par des artisans
français, sans stock. Collection en cours : « Hypnotic Lace », sept pièces. Avec son assistante IA,
ses agents de gestion et le tableau de bord privé « Atelier », où la créatrice modifie le site sans
toucher au code (éditeur « Édition »).

Next.js 16 · TypeScript · Tailwind CSS v4 · GSAP · Lenis · Supabase · Upstash Redis · Claude ·
Vercel. Paiement en ligne : Stripe Checkout (`lib/paiement`).

## La boutique de la Maison

La boutique est entièrement à la Maison, sans plateforme de commerce extérieure. Tout se gère dans
l'Atelier :

- **pièces** : le catalogue de départ de la collection (`data/demo/products.ts`), puis les réglages
  de l'Atelier (prix, délais, textes, photos, statut), écrits dans le stockage du site (Upstash
  Redis en production) ;
- **commandes** : dans le stockage du site, copiées dans la table `orders` de Supabase (colonne
  `reference`) ;
- **clientes** : Supabase ;
- **retours, factures et avoirs, certificats** : dans le stockage du site, traités dans l'Atelier ;
- **e-mails de commande** : envoyés par le site lui-même, modifiables dans l'Atelier › E-mails ;
- **paiement** : Stripe Checkout, choix de la créatrice, intégré (`lib/paiement`) et à activer avec le compte Stripe de la Maison (`ACTIVATION.md`, étape 4 bis ; webhook signé,
  clés `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans les variables d'environnement, jamais
  dans le code). La carte se saisit chez Stripe : aucune donnée bancaire sur le site.

Deux façons de tourner (`lib/config/boutique.ts`) :

- **boutique réelle** (site de production sur Vercel, ou `BOUTIQUE_REELLE=1`) : jamais d'exemple
  de commande ni d'accès d'essai. Tant que le paiement en ligne n'est pas branché, le site ne prend
  aucune commande payée, et la page `/commande` le dit ;
- **démonstration** (développement, prévisualisations, tests) : commandes d'exemple et paiement
  d'essai, clairement signalés. Sans aucune clé, tout fonctionne : comptes clientes et e-mails
  simulés, agents déterministes.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

- Atelier : `/gestion` en démonstration (en production, l'adresse secrète `ADMIN_PATH`). Adresse
  e-mail de la Maison (`awrea.contact@gmail.com`, ou celles de `ATELIER_ACCOUNTS`), mot de passe
  d'installation `atelier-demo` (accepté seulement en démonstration, jamais sur la boutique réelle),
  puis mot de passe personnel et double authentification.
- Variables : copier `.env.example` en `.env.local` et compléter au fur et à mesure
  (`ACTIVATION.md`).

## Ressources officielles de la Maison

`ressources-awrea/` est la copie du Drive de la Maison : polices, logo, maquettes, textes de la
créatrice, photos provisoires, CGV et mentions légales. Ces fichiers priment sur toute autre
consigne et ne sont jamais modifiés. `npm run ressources` en tire les versions du site (polices
WOFF2, logo, photos déclinées). Inventaire, usages et droits : `RESSOURCES.md`.

## Vérifier

```bash
npm run lint && npm run typecheck && npm run audit:tokens && npm run audit:ecriture
npm run test:unit && npm run test:db
node scripts/secret-scan.mjs
npm run build && npx playwright test   # parcours complets : bureau, mobile, plusieurs largeurs d’écran
```

## Mettre en ligne (Vercel)

1. Importer le dépôt dans Vercel (Framework : Next.js). Région des fonctions : Paris (`cdg1`,
   déjà dans `vercel.json`, avec les tâches planifiées).
2. Renseigner les variables d'environnement de `.env.example`, au minimum `SESSION_SECRET`,
   `ADMIN_PATH`, `ATELIER_ACCOUNTS`, `ATELIER_PASSWORD`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Domaines : `www.awreaparis.com` (principal) et `awreaparis.com` redirigé (308).
4. Brancher les services dans l'ordre d'`ACTIVATION.md` : Upstash (stockage du site : réglages des
   pièces, commandes, retours, factures), Supabase (base clientes et copie des commandes, région UE,
   toutes les migrations de `supabase/migrations` dans l'ordre, dont
   `20261108000000_boutique_independante.sql`), Resend (e-mails), Brevo ou Klaviyo (lettres),
   Anthropic (IA), Cloudflare Turnstile (anti-robots), puis mesure d'audience et publicité. Le
   paiement en ligne (Stripe, étape 4 bis) demande le compte Stripe de la Maison : sans clé réelle,
   la boutique réelle ne prend aucune commande payée.

## GitHub (une fois)

- Rendre le dépôt **privé** et protéger `main` (demande de fusion + « Intégration continue »
  verte obligatoires), activer *Allow auto-merge*, *Secret scanning* et *Push protection*.
- Installer l'application GitHub « Claude » (agent de maintenance) et créer les secrets :
  `ANTHROPIC_API_KEY`, `CRON_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
  `BACKUP_PASSPHRASE`, `SUPABASE_DB_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` ; variable
  `SITE_URL`.

| Flux | Rôle |
| --- | --- |
| `ci.yml` | Clés, vulnérabilités, lint, types, tests, compilation et parcours à chaque modification |
| `maintenance.yml` | Chaque nuit : bilan complet, réparation par Claude Code si besoin, rapport (JOURNAL.md + Atelier) |
| `deploiement.yml` | Après chaque mise en ligne : contrôle du site et retour automatique à la version précédente |
| `backup.yml` | Chaque nuit : sauvegarde chiffrée et test de restauration |
| `securite.yml` | Chaque lundi : contrôle de sécurité complet |

## Documents

| Document | Contenu |
| --- | --- |
| `GUIDE-CREATRICE.md` | Utiliser le site et l'Atelier au quotidien, pas à pas |
| `ACTIVATION.md` | Brancher chaque service, dans l'ordre, sans toucher au code |
| `MARQUE.md` | Référence de la marque : identité, voix, textes officiels, direction artistique |
| `RESSOURCES.md` | Inventaire, usages et droits des ressources officielles |
| `DESIGN.md` | Design system : polices, échelle, primitives des maquettes |
| `DECISIONS.md` | Choix tranchés et leur justification |
| `PLAN.md`, `ETAT.md` | Plan de construction, état par rapport au cahier des charges |
| `JOURNAL.md` | Journal des étapes et de la maintenance |
| `SECURITE.md` | Audit de sécurité et réglages à faire par la Maison |
| `LEGAL-A-COMPLETER.md` | Informations légales à fournir (`npm run legal:todo`) |
| `docs/EQUIPES.md` | Équipes d'agents et déroulé du travail |
| `CLAUDE.md` | Règles du projet pour Claude Code |

`docs/VEILLE-DESIGN-2026.md` et `docs/equipes/design/` sont des archives d'avant les ressources
officielles. L'ancien site statique est archivé dans `legacy/`. Le code d'avant la boutique
indépendante (08/11/2026) est gardé sur la branche `sauvegarde/avant-suppression-shopify`.
