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

## Étape 3 — Toutes les pages
- Pages publiques avec données de démonstration : collections (+ page par collection), boutique (grille asymétrique,
  filtres catégorie / taille / disponibilité, seconde image au survol), fiche produit (galerie, vidéo, loupe, certificat
  d'édition, tailles, guide des tailles, matières et entretien, « Fait main à Paris », compléter la silhouette, liste
  d'envies, précommande avec délai, liste d'attente), silhouettes achetables, La Maison (lettre manuscrite), L'Atelier
  (carnet de croquis, vidéos), Journal (+ articles), Presse, Contact et rendez-vous, FAQ, livraison et retours, pages
  légales, compte, liste d'envies, page introuvable.
- Correction : aucune information d'entreprise inventée (année de création, adresse, arrondissement retirés ;
  champs « À COMPLÉTER »), articles grammaticaux par catégorie dans les textes générés.

## Étape 4 — Interactions signature
- Les neuf signatures en place : lumière dorée (1), dentelle de l'ouverture (2), transition drapée WebGL (3), lettre
  manuscrite au scroll signée « La Créatrice » (4), pièces numérotées « N° 3 / 5 » et pièces restantes (5), loupe
  dentelle (6), shop the look (7), enveloppe de confirmation (8), alternance noir/ivoire (9).
- Toutes coupées sous `prefers-reduced-motion`, adaptées au tactile (appui long pour la loupe, dérive de la lumière).
- Corrections : la transition drapée ne bloque plus les clics des liens (fermeture du panier), l'enveloppe laisse
  sortir la lettre au-dessus du rabat.

## Étape 5 — Panier et parcours d'achat
- Panier latéral (`<dialog>` natif), livraison offerte au-delà du seuil, emballage cadeau + message, codes promo et
  cartes cadeaux de démonstration, tunnel court sans compte en mode test (cartes de test acceptée et refusée),
  stocks par taille, numéros d'édition attribués à la commande, e-mail de confirmation, enveloppe animée.
- Pilote Shopify : Cart API et checkout Shopify (carte, Apple Pay, Google Pay, PayPal, paiement en plusieurs fois).
- Tests e2e du parcours complet (bureau + mobile).

## Étape 6 — Assistante IA clientes
- Claude en streaming avec outils (catalogue, fiche, guide des tailles, livraison, suivi de commande protégé par
  l'e-mail, transmission à l'atelier), contexte de marque mis en cache, repli serveur en cas de refus, mode
  démonstration sans clé, vouvoiement, interface au design de la maison.

## Étape 7 — Agents de gestion et tableau de bord « Atelier »
- Politique d'autonomie centralisée : le quotidien est exécuté, l'argent et l'irréversible (remboursement, prix,
  suppression, lettre à toute la liste) attendent une validation en un clic.
- Six agents (Catalogue avec vision, Service client, Commandes et stock, SEO et visibilité IA avec audit, Contenu,
  Rapport), journal d'actions, déclencheurs par évènement (`after()`), Vercel Cron, tableau de bord protégé
  (`proxy.ts`), tests e2e.

## Étape 8 — Référencement Google et IA
- Sitemap (avec langues), robots (robots d'IA autorisés, espaces privés exclus), manifeste, `llms.txt` et
  `llms-full.txt` générés depuis les mêmes données que les pages, données structurées (Organization + Instagram,
  WebSite, Product, Offer, BreadcrumbList, FAQPage, Article), un H1 et des métadonnées uniques par page.
- Audit SEO de l'agent : 99/100 sur 28 pages.

## Étape 9 — Tests finaux et performance
- Tests responsive sur 7 largeurs (360 → 1920) : 168/168 ; accessibilité axe (WCAG 2.1 AA) et parcours : 41/41.
- Audit d'homogénéité automatique (`npm run audit:tokens`) : aucune valeur en dur hors du design system.
- Performance mobile (Lighthouse, mesure simulée 4G lente) : la page d'accueil passait à 52 à cause de transitions
  de couleur relancées à chaque image et de sections hors écran animées au chargement. Corrections : bascule de scène
  instantanée au chargement, scène initiale en CSS, transitions de couleur réservées au survol, animations sur le
  compositeur, textures divisées par deux, GSAP / assistante / panier chargés à la demande, préchargement à
  l'intention, seconde image des cartes jamais téléchargée sur mobile, contenu visible jamais masqué en attente
  du JavaScript. Résultat : 92 à 97 en performance mobile, 100 en accessibilité, bonnes pratiques et SEO
  (bureau : 97 à 99).

## Ajouts au cahier des charges — reprise
- Bandeau cookies refait : ivoire, filet doré, fondu discret, « Refuser » et « Accepter » à égalité, quatre
  catégories, choix valable 13 mois, preuve enregistrée côté serveur, « Gérer mes cookies » dans le pied de page.
- Limitation de débit partagée entre instances (connexions, assistante, consentement).
- Base clientes Supabase (schéma, sécurité par ligne testée dans un PostgreSQL embarqué), comptes sans mot de passe
  (code e-mail, Google, Apple), RGPD en libre-service (export, suppression), segments et e-mails automatiques,
  mesure et publicité seulement après accord, ventes par source.
- Double authentification obligatoire de l'Atelier (TOTP vérifié sur les vecteurs de la RFC 6238, codes de secours,
  anti-rejeu), Turnstile sur les formulaires, limitation des tentatives partagée entre instances.
- Pages légales refaites (mentions légales, propriété intellectuelle, CGV avec garanties légales et formulaire type,
  CGU, confidentialité, cookies, notice de l'assistante IA, livraison et retours) : sommaire cliquable, date et
  version, texte justifié, tableaux lisibles sur mobile. Aucune information d'entreprise inventée : registre unique
  `content/legal/fields.ts`, repères dorés « [À COMPLÉTER] » sur le site, liste générée dans `LEGAL-A-COMPLETER.md`
  (`npm run legal:todo`). Fonction de rétractation en ligne en deux étapes avec accusé de réception immédiat.
  Cases d'acceptation : CGU à la création du compte, CGV à la commande (et jointes au panier Shopify).

## Tendances design 2026, règles « épuré et luxueux », sécurité — en cours
- Veille (Awwwards : Max Mara, Detroit Paris, Gucci, Miu Miu, Lacoste, Brunello Cucinelli) consignée dans
  `docs/VEILLE-DESIGN-2026.md`, avec les décisions prises pour la maison. SiteInspire et Godly n'étaient pas
  joignables depuis l'environnement de travail.
- Mode Nuit noir et or complet : « Jour · Nuit · Auto » au pied de page et dans le menu (« Auto » suit le réglage du
  téléphone), appliqué avant le premier affichage, un seul fondu lent au changement ; option « Animations apaisées ».
- En-tête réduit à cinq entrées (Menu, Boutique | Rechercher, Compte, Panier) ; liste d'envies, collections,
  silhouettes, journal et rendez-vous dans le menu plein écran.
- Recherche plein écran instantanée (pièces, collections, Journal, pages, réponses de la FAQ), sans accents ni
  majuscules, raccourci « / », page `/recherche` qui fonctionne sans JavaScript (non indexée), action de recherche
  déclarée à Google, squelettes ivoire pendant le chargement.
- Titres géants écrits lettre à lettre sur les pages éditoriales (le crénage du Bodoni est conservé), titres
  calligraphiés tracés à la plume ; coulisses « Dans l'atelier » (prise de mesures, découpe de la dentelle, point
  invisible, finitions) sur chaque fiche et après la commande ; vidéo au survol des cartes, téléchargée seulement au
  premier survol ; boutons principaux magnétiques et discrets ; transition de page sans monogramme (un fil d'or).
- Prix sobres : plus aucun prix barré (une vente privée s'annonce par un texte avec le prix de référence légal).
- Un seul appel à l'action par section (confirmation, page introuvable : le second choix devient un lien discret).
- Éco-conception : empreinte de la visite au pied de page (octets réellement transférés × facteur du modèle
  Sustainable Web Design v4, précalculé avec CO2.js — `npm run eco:constants`), région Vercel Paris (`cdg1`).
- Sécurité (première partie) : en-têtes stricts (CSP, HSTS avec préchargement, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy, COOP), une seule version du domaine (redirection permanente www ↔ sans www),
  contrôle d'origine contre le CSRF sur toutes les routes d'API qui modifient des données, tâches planifiées
  authentifiées en temps constant. Vérifié sur la version de production : aucune violation CSP sur 23 pages.
- `vercel.json` créé : tâches planifiées des agents et des scénarios d'e-mails quotidiens (`/api/cron/flows`).
- Lint React Compiler entièrement vert (15 erreurs anciennes corrigées : magasins externes pour la liste d'envies,
  le consentement et les préférences, ajustements pendant le rendu au lieu d'effets).
- Tests : 258 tests e2e sur la version de production (responsive 196/196 sur 7 largeurs, navigation, recherche,
  mode Nuit, parcours d'achat, comptes, pages légales, Atelier).
