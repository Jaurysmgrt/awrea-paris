# Awrea Paris

Site e-commerce de la maison Awrea Paris : prêt-à-porter féminin créé sur demande par des artisans
français, sans stock. Collection en cours : « Hypnotic Lace », sept pièces. Avec son assistante IA,
ses agents de gestion et le tableau de bord privé « Atelier », où la créatrice modifie le site sans
toucher au code (éditeur « Édition »).

Next.js 16 · TypeScript · Tailwind CSS v4 · GSAP · Lenis · Shopify (headless) · Supabase ·
Claude · Vercel.

Sans aucune clé, tout fonctionne en **mode démonstration** : catalogue local des sept pièces, tunnel
de commande simulé, étapes de commande, comptes clientes et e-mails simulés, agents déterministes.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

- Atelier : `/gestion` en démonstration (en production, l'adresse secrète `ADMIN_PATH`). Adresse
  e-mail de la Maison (`awrea.contact@gmail.com`, ou celles de `ATELIER_ACCOUNTS`), mot de passe
  d'installation `atelier-demo` (jamais accepté en production ni avec une boutique Shopify), puis
  mot de passe personnel et double authentification.
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
4. Brancher les services dans l'ordre d'`ACTIVATION.md` : Shopify (les sept pièces, sans suivi de
   stock, avec leurs délais de fabrication), Upstash (stockage technique), Supabase (base clientes,
   région UE, `supabase/migrations`), Resend (e-mails), Brevo ou Klaviyo (lettres), Anthropic (IA),
   Cloudflare Turnstile (anti-robots), puis mesure d'audience et publicité.

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
officielles. L'ancien site statique est archivé dans `legacy/`.
