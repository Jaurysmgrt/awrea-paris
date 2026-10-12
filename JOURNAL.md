# Journal de construction — AWREA PARIS

## Étape 1 — Plan
- Lecture du dépôt existant : ancien site statique (`index.html` 1,3 Mo, 9 photos en base64). Archivé dans `legacy/`.
- Rédaction de `PLAN.md` (architecture, design system, pages, signatures, IA, SEO, tests).
- Branche de travail : `claude/awrea-site`.

## Étape 2 — Socle, design system, page d'accueil
- Next.js 16 (App Router, Turbopack) + TypeScript strict + Tailwind CSS v4, GSAP 3.15, Lenis, OGL, SDK Anthropic, zod.
- **Pipeline média** (`scripts/build-media.py`, `npm run media`) :
  - les 9 photos de l'ancien site sont extraites dans `media-src/placeholders/`, étalonnées en duotone
    noir #0B0B0B / ivoire #F4F1EB et recadrées en 36 visuels provisoires (WebP 480 / 960 / 1200) ;
  - texture dentelle procédurale raccordable (tulle hexagonal, rosaces brodées, rinceaux) en ivoire, or, noir + masque ;
  - texture papier (sections « lettre ») et grain ;
  - vidéos de démonstration H.264 générées par ffmpeg (hero desktop 1280×720 / mobile 540×960, 8 vidéos produit,
    4 vidéos atelier) + images de remplacement. Poids total des médias ≈ 6 Mo.
- **Design system** unique dans `styles/tokens.css` : 4 couleurs (palettes Tailwind par défaut supprimées),
  4 familles typographiques en variables, échelle typographique fluide `step--2 → step-6`, échelle d'espacements
  unique `3xs → 3xl` + gouttière, 3 durées et 2 courbes de mouvement (lues aussi par GSAP via `lib/motion.ts`),
  aucun arrondi, aucune ombre. Miroir TypeScript `styles/tokens.ts` pour les contextes sans CSS.
- Composants du design system (`styles/components.css`) : conteneurs, sections à thème, typographie, boutons
  (remplissage qui tombe comme un tissu), liens soulignés au fil, champs, cases carrées/losanges, puces de taille,
  médias, prix, badges, fil d'Ariane, panneaux dépliants, tableaux. Paragraphes justifiés + césure française.
- Contenus séparés du code : `content/brand/identity.ts` (source unique nom/description/liens), `content/brand/voice.md`
  (référence de ton unique pour site, assistant et agents), `content/fr/*` (pages, FAQ, Journal, légal),
  `content/settings.ts` (livraison, emballage, codes de démo, guide des tailles), `data/demo/*` (8 pièces, 2 collections, 3 silhouettes).
- Couche commerce à deux pilotes (`lib/commerce`) : démo locale (avec surcouches persistées pour stocks/prix/fiches
  publiées par les agents) et Shopify Storefront API (produits, collections, panier Cart API). Panier démo en cookie.
- Persistance clé-valeur (`lib/store`) : fichier local `.data/` ou Upstash Redis REST en production.
- Socle front : en-tête (masquage au défilement, couleur qui suit la scène), menu plein écran noir avec lumière dorée,
  pied de page, bandeau cookies RGPD (refuser aussi simple qu'accepter), panier latéral en `<dialog>` natif,
  liste d'envies, défilement doux Lenis synchronisé à ScrollTrigger, apparitions au scroll.
- Signatures déjà en place : lumière dorée (1), révélation en dentelle de la vidéo d'ouverture (2),
  transition drapée WebGL OGL avec ourlet doré et repli en fondu (3), certificat d'édition (5),
  shop the look (7), alternance noir/ivoire au scroll (9).
- Page d'accueil complète : ouverture vidéo, collection en cours, pièces phares (grille asymétrique), manifeste en
  calligraphie, shop the look, aperçu atelier vidéo, lettre/newsletter sur papier, flux Instagram (consentement).
- Vérifications : `tsc` OK, `next build` OK, captures 1440 px et 390 px sans débordement horizontal.
- Corrections : thèmes de section passés en `@layer base` (ils écrasaient la bascule), pied de page intégré à la
  bascule, scène « perle » ajoutée, titre H1 de l'ouverture élargi.
