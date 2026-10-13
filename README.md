# Awrea Paris

Site e-commerce de la maison Awrea Paris — prêt-à-porter féminin fait main à Paris, dentelle
noire, jersey, satin et dorure — avec son assistante IA, ses six agents de gestion et le tableau
de bord privé « Atelier ».

Next.js 16 · TypeScript · Tailwind CSS v4 · GSAP · Lenis · OGL · Shopify (headless) · Supabase ·
Claude · Vercel.

Sans aucune clé, tout fonctionne en **mode démonstration** : catalogue local, tunnel de commande
simulé, comptes clientes et e-mails simulés, agents déterministes.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

- Atelier : `/gestion` — mot de passe de démonstration `atelier-demo` (jamais accepté en
  production), puis enrôlement de la double authentification avec une application
  d'authentification.
- Variables : copier `.env.example` en `.env.local` et compléter au fur et à mesure.

## Vérifier

```bash
npm run lint && npm run typecheck && npm run audit:tokens
npm run test:unit && npm run test:db
npm run build && npx playwright test   # plus de 260 tests : bureau, mobile, 7 largeurs d’écran
```

## Mettre en ligne (Vercel)

1. Importer le dépôt dans Vercel (Framework : Next.js). Région des fonctions : Paris (`cdg1`,
   déjà dans `vercel.json`, avec les tâches planifiées).
2. Renseigner les variables d'environnement de `.env.example` — au minimum `SESSION_SECRET`,
   `ATELIER_PASSWORD`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Domaines : `www.awreaparis.com` (principal) et `awreaparis.com` redirigé (308).
4. Brancher les services, dans cet ordre : Shopify (boutique, paiement), Upstash (stockage
   technique, via Vercel Marketplace), Supabase (base clientes, région UE — appliquer
   `supabase/migrations`), Resend (e-mails), Brevo ou Klaviyo (lettres), Anthropic (IA),
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

- `PLAN.md` — plan de construction · `JOURNAL.md` — journal des étapes et de la maintenance
- `SECURITE.md` — audit de sécurité et réglages à faire par la maison
- `LEGAL-A-COMPLETER.md` — informations légales à fournir (`npm run legal:todo`)
- `docs/VEILLE-DESIGN-2026.md` — veille et décisions de design
- `CLAUDE.md` — règles du projet pour Claude Code

L'ancien site statique est archivé dans `legacy/`.
