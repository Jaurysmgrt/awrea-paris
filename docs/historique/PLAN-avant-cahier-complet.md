# AWREA PARIS — Plan de construction

> Site e-commerce de luxe headless + équipe d'agents IA de gestion.
> Ce plan est le document de référence ; l'avancement réel est consigné dans `JOURNAL.md`.

## 0. Point de départ

Le dépôt contient un ancien site statique (`index.html` autonome, ~1,3 Mo, photos en base64).
Il est remplacé par une application Next.js. Les 9 photos qu'il contenait sont extraites,
étalonnées en noir et blanc chaud et réutilisées **comme visuels provisoires** en attendant
les vraies photos des pièces. L'ancien site est archivé dans `legacy/`.

## 1. Architecture

```
app/                      Routes (App Router, rendu serveur)
  (site)/                 Site public (layout avec nav, footer, transitions, assistant)
  gestion/                Tableau de bord privé « Atelier » (protégé par mot de passe)
  api/                    Panier, liste d'attente, newsletter, contact, assistant, agents, cron
  sitemap.ts robots.ts    SEO technique ; llms.txt servi par une route
components/
  ui/                     Design system : Button, Link, Field, Heading, Text, Media, Price…
  layout/                 Header, Footer, Menu, CookieBanner, ThemeSection
  signature/              Les 9 interactions signature (GoldenLight, LaceReveal, DrapeTransition,
                          HandwrittenLetter, EditionNumber, LaceLoupe, ShopTheLook, Envelope, ThemeShift)
  commerce/               ProductCard, ProductGallery, SizeSelector, CartDrawer, Waitlist…
  assistant/              Fenêtre de discussion cliente
content/                  Tous les textes (fr/, prêts pour en/) + marque (voix, manifeste)
  brand/voice.md          RÉFÉRENCE UNIQUE du ton de la marque (agents + assistant)
data/demo/                Catalogue, looks, journal, presse, commandes de démonstration
lib/
  commerce/               Interface Commerce + 2 pilotes : `demo` (local) et `shopify` (Storefront API)
  shopify/                Clients Storefront & Admin (GraphQL)
  agents/                 Runtime des agents, politique d'autonomie, outils, journal d'actions
  ai/                     Client Claude, prompts partagés
  store/                  Persistance clé-valeur : fichier local (dev) / Upstash Redis (prod)
  email/                  Gabarits d'e-mails à l'image de la marque + envoi (Resend)
  seo/                    Données structurées Schema.org, métadonnées
styles/                   tokens.css (variables), base, typographie, motion
.claude/agents/           Sous-agents de développement (design, front, e-commerce, SEO, tests)
tests/                    Playwright : responsive, débordements, parcours d'achat, a11y
```

### Choix techniques
- **Next.js 16 App Router + TypeScript + Tailwind CSS v4** (tokens dans `@theme`, une seule source).
- **GSAP + ScrollTrigger** (révélations, lettre manuscrite, bascule noir/ivoire), **Lenis** (défilement doux),
  **OGL** (transition drapée WebGL, ~25 Ko) avec repli en fondu.
- **Commerce découplé** : `lib/commerce` expose une interface unique. Sans variables Shopify,
  le pilote `demo` sert le catalogue local et simule le tunnel de commande (mode test complet).
  Avec `SHOPIFY_STORE_DOMAIN` + jeton Storefront, le pilote `shopify` utilise l'API Cart et le
  checkout Shopify (carte, Apple Pay, Google Pay, PayPal, Shop Pay Installments / Klarna).
- **Persistance** (liste d'attente, propositions des agents, journal d'actions) : interface KV,
  fichier `.data/` en local, Upstash Redis REST en production (`KV_REST_API_URL`).
- **IA** : SDK Anthropic. Sans `ANTHROPIC_API_KEY`, l'assistant et les agents passent en mode
  démonstration déterministe pour que tout reste testable.
- **Déploiement** : Vercel, `vercel.json` avec Vercel Cron pour les agents.

## 2. Design system (une seule source : `styles/tokens.css` ; référence de marque : `MARQUE.md`)
> Mis à jour le 13/10/2026 (nouvelle direction artistique, § 12) : la palette dorée et les polices
> Bodoni, Cormorant, Pinyon et Jost sont abandonnées.
- Couleurs : noir `#0A0A0A`, blanc cassé `#F7F6F3`, gris pierre `#E4E2DD`, gris taupe `#8C8780`
  (textes secondaires). Rien d'autre : les nuances sont des mélanges `color-mix` de ces quatre
  couleurs (taupe profond pour les petits textes sur fond clair, contraste AA). Aucun doré.
- Typos : Instrument Serif (titres, très grands formats, jamais d'italique) et Inter Tight (textes
  300, navigation et boutons en petites capitales espacées 400). Variables `--font-*` remplaçables
  en un seul endroit (`app/fonts.ts`).
- Échelle typographique par paliers (mobile, 480, 768, 1024, 1440 px), interlignage 1,6 du texte
  courant, interlignages des titres multiples de 8 px ; espacements multiples de 8 px ; rythme
  vertical commun (`--space-title`, `--space-paragraph`, `--space-block`, `--space-section`) ; une
  grille 12 colonnes, mêmes marges partout.
- Mouvement : 3 durées (`--dur-fast 0.4s`, `--dur-base 0.9s`, `--dur-slow 1.6s`), 2 courbes
  (`--ease-silk`, `--ease-drape`). Tout est coupé sous `prefers-reduced-motion`.
- Paragraphes justifiés avec césure française (`lang="fr"`, `hyphens: auto`), mesure de 60 à 70
  caractères, espaces équilibrés paragraphe par paragraphe ; titres, boutons, prix, navigation jamais.
- Aucun coin arrondi, aucune ombre portée, aucun dégradé décoratif, aucun emoji.

## 3. Pages
Accueil · Collections (+ page par collection) · Boutique (filtres catégorie/taille/disponibilité,
seconde image au survol) · Fiche produit · Silhouettes (outfits) · La Maison · L'Atelier · Journal
(+ articles) · Presse · Contact & rendez-vous · FAQ · Livraison & retours · CGV · Mentions légales ·
Confidentialité · Cookies · Panier latéral · Commande (mode test) · Confirmation (enveloppe) ·
Compte (commandes, retours, adresses, liste d'envies) · Liste d'envies.

## 4. Interactions signature
1. Halo de lumière blanche (masque radial suivant le curseur sur la texture dentelle, dérive lente au tactile) — anciennement « lumière dorée »
2. Révélation en dentelle de la vidéo d'ouverture (masque dentelle SVG qui s'ouvre)
3. Transitions drapées (shader OGL de tissu qui glisse, repli en fondu)
4. Lettre de la créatrice révélée au scroll (Instrument Serif), signée « La Créatrice » d'un trait fin
5. Pièces numérotées façon certificat (« N° 3 / 5 », pièces restantes)
6. Loupe dentelle (curseur ; appui long au tactile)
7. Shop the look (points interactifs accessibles au clavier)
8. Enveloppe de confirmation de commande
9. Alternance noir / blanc cassé au scroll

## 5. Parcours d'achat
Panier latéral · tunnel court sans compte · moyens de paiement (Shopify) · stocks par taille ·
liste d'attente · précommande avec délai de fabrication · livraison France/international avec seuil
offert · suivi de colis · emballage cadeau + message · codes promo & cartes cadeaux · compte client ·
e-mails à l'image de la marque.

## 6. IA
- **Assistant clientes** : `/api/assistant` (streaming), outils catalogue/stock/livraison/guide des tailles,
  vouvoiement, bascule vers un humain (formulaire + Instagram).
- **Agents de gestion** (`lib/agents/`) : Catalogue, Service client, Commandes & stock, SEO & visibilité IA,
  Contenu, Rapport. Politique d'autonomie centralisée (`lib/agents/policy.ts`) : le quotidien est
  exécuté directement ; remboursement, changement de prix, suppression, newsletter à toute la liste
  → proposition à valider en un clic. Journal d'actions complet. Tableau de bord `/gestion`.

## 7. SEO & référencement IA
Un H1 par page, title/meta uniques, URLs lisibles en français, Schema.org (Organization + Instagram,
WebSite, Product, Offer, BreadcrumbList, FAQPage, Article), sitemap, robots, Open Graph, images WebP
avec alt, rendu serveur, `llms.txt` + `llms-full.txt`, informations de marque centralisées
(`content/brand/identity.ts`) et identiques partout.

## 8. Qualité & tests
Playwright sur 7 formats (360, 414, 768, 1024 paysage, 1280, 1440, 1920) : débordement horizontal,
H1 unique, liens, parcours d'achat complet, assistant, tableau de bord. Audit axe (WCAG AA).
Lighthouse > 90. Audit d'homogénéité (aucune couleur / taille / durée en dur hors tokens) à chaque étape.

## 9. Étapes
1. Plan (ce fichier) + journal
2. Socle Next.js, design system, page d'accueil
3. Toutes les pages avec données de démonstration
4. Interactions signature
5. Panier et parcours d'achat (démo + Shopify)
6. Assistant IA clientes
7. Agents de gestion et tableau de bord Atelier
8. SEO et référencement IA
9. Tests finaux, CLAUDE.md, sous-agents, préparation du déploiement Vercel

## 10. Ajouts au cahier des charges (deuxième message)

### Exploitation
- **Agent de maintenance quotidienne** : GitHub Actions planifiée chaque jour → contrôle de disponibilité, erreurs
  serveur et JavaScript (Sentry), liens et images cassés, pages lentes, connexion, panier et paiement en mode test,
  formulaires, affichage mobile, accessibilité, dépendances obsolètes ou vulnérables. Parcours Playwright quotidiens
  (accueil, fiche produit, ajout au panier, commande test, création de compte, connexion). En cas d'échec, Claude Code
  (mode automatique) corrige le code, relance tous les tests et ne déploie que si tout passe ; retour arrière
  automatique si un problème apparaît après déploiement. Chaque intervention est consignée dans `JOURNAL.md` et dans
  l'Atelier avec un résumé du jour (« Tout va bien » ou liste des corrections).
- **Environnement de prévisualisation** : chaque branche / demande de fusion a son déploiement Vercel Preview,
  testé par la CI avant la production.
- **Sauvegarde quotidienne** de la base (GitHub Actions, `pg_dump` chiffré).

### Données et comptes
- **Base clientes Supabase** (PostgreSQL + authentification) synchronisée avec Shopify : connexion e-mail, Google,
  Apple ; profil, tailles habituelles, adresses, commandes, liste d'envies, listes d'attente ; données de navigation
  uniquement avec consentement (pièces vues, collections préférées, paniers abandonnés). Recommandations, relances,
  alertes de retour en stock, lettres ciblées, segments (nouvelles, fidèles, VIP) dans l'Atelier. Téléchargement et
  suppression des données depuis le compte, données minimales, sécurité par ligne (RLS) sur toutes les tables.
  Sans clés : mode démonstration sur le stockage clé-valeur, mêmes écrans.
- **Consentement** : quatre catégories, preuve en base, renouvellement à 13 mois, aucun traceur avant accord ;
  analytics respectueux (Plausible, ou GA4) et pixels Meta / Google Ads seulement après accord.

### Légal
Mentions légales, Propriété intellectuelle, CGV complètes (rétractation + formulaire type), CGU, Confidentialité,
Politique cookies, Notice de l'assistante IA ; sommaire cliquable, date de mise à jour, champs « [À COMPLÉTER] »
bien visibles listés dans `LEGAL-A-COMPLETER.md` ; cases d'acceptation au paiement et à la création de compte.

### Commerce et marque
Certificat d'authenticité numérique (QR → page unique, rattachable au compte) · drops (page « Bientôt » avec compte à
rebours, accès anticipé des inscrites, vente privée protégée par mot de passe) · e-mails automatiques (Brevo ou
Klaviyo) · flux Google Merchant Center / Instagram Shopping / Facebook · ventes par source dans l'Atelier ·
« Trouver ma taille » · avis vérifiés sans étoiles avec photos et modération · recherche plein écran · Archives
(« Pièce adoptée ») · en-têtes de sécurité, Cloudflare Turnstile, limitation des tentatives, double authentification
obligatoire pour l'Atelier · page 404 et maintenance, icônes AW, image de partage par produit, impression soignée ·
guide de la créatrice illustré.

### Niveau supérieur
Écran d'ouverture (monogramme au fil d'or < 2 s) · « Lumière de Paris » (ambiance selon l'heure de Paris) · film de
collection en chapitres · vue 360° · lookbook feuilletable + PDF · son d'ambiance (coupé par défaut) · View
Transitions grille → fiche · haptique, balayage, menu plein écran raffiné · styliste IA (texte ou photo → silhouette
achetable) · accueil personnalisé (avec accord) · liste d'envies partageable · « Offrir une pièce » · club
« Le Cercle Awrea » · rendez-vous privé synchronisé à l'agenda · fiche de traçabilité · espace presse · anglais,
devises (EUR, GBP, USD, CHF), taxes et droits affichés · PWA et notifications · AVIF, préchargement au survol, rendu
en périphérie, zéro décalage, Lighthouse 95+ · clavier, lecteurs d'écran, interrupteur d'animations · tests A/B
mensuels proposés par l'agent Rapport · revue finale façon jury Awwwards dans `REVUE.md`.

### Étapes suivantes
10. Bandeau cookies, consentement et sécurité de base
11. Base clientes Supabase, comptes et RGPD
12. Pages légales et `LEGAL-A-COMPLETER.md`
13. Ajouts commerce et marque (certificats, drops, e-mails, flux, tailles, avis, recherche, archives…)
14. Niveau supérieur (expérience, personnalisation, Cercle, international, PWA)
15. Agent de maintenance, CI, prévisualisation, sauvegardes
16. Revue finale (`REVUE.md`), corrections, documentation (CLAUDE.md, guide de la créatrice)

## 11. Tendances 2026, règles « épuré et luxueux », sécurité (troisième message)

- **Veille** Awwwards / SiteInspire / Godly consignée dans `docs/VEILLE-DESIGN-2026.md`, puis appliquée :
  luxe discret (monogramme réservé à l'en-tête, au pied de page et à l'ouverture), esprit galerie (blancs,
  mises en page asymétriques, légendes discrètes), typographie géante écrite lettre à lettre, vidéo sur chaque
  fiche et au survol des cartes, mode Nuit noir et or (interrupteur + réglage du téléphone), coulisses de
  l'atelier tout au long du parcours, micro-interactions (boutons magnétiques, squelettes ivoire), rythme lent
  mais achat rapide, personnalisation invisible, éco-conception (empreinte affichée, région Paris).
- **Règles épurées** : cinq entrées de menu, un message et un appel à l'action par section, aucun prix barré ni
  bannière, vocabulaire de couture, détails soignés (erreurs, panier vide, 404).
- **Sécurité** : CSP stricte à nonce, en-têtes, HSTS avec préchargement, domaine unique, CSRF, Turnstile partout,
  double authentification de l'Atelier avec journal et alertes, sessions révocables, RLS, aucune donnée bancaire,
  sauvegardes chiffrées testées, clés hors du code, Dependabot et `npm audit`, protection contre l'injection de
  prompt, moindre privilège des agents, surveillance quotidienne ; audit complet dans `SECURITE.md`.
- **Exploitation** : intégration continue, maintenance quotidienne par Claude Code (réparation testée, fusion
  automatique au vert), contrôle après mise en ligne avec retour automatique, sauvegardes, contrôle hebdomadaire.

## 12. Nouvelle direction artistique, design multi-agents, équipes d'agents (quatrième à sixième messages)

Ordre des étapes (tenu par le chef de projet, `docs/EQUIPES.md`) :

1. **Fondations de la nouvelle DA** (remplacent les consignes précédentes sur la typographie, le doré
   et la justification) : palette noir `#0A0A0A` / blanc cassé `#F7F6F3` / gris pierre `#E4E2DD` /
   gris taupe `#8C8780`, aucun doré (site, e-mails, interactions) ; Instrument Serif + Inter Tight,
   ni calligraphie ni italique ; justification régulière (césure, mesure de 60–70 caractères,
   équilibrage des espaces par paragraphe) ; grille de 8 px, interlignage 1,6 ; contrôle automatique
   `tests/e2e/homogeneite.spec.ts` sur mobile, tablette et ordinateur.
2. **Organisation** : `MARQUE.md` (référence unique), 34 agents dans `.claude/agents/` répartis en
   équipes avec chacune son critique indépendant, `docs/EQUIPES.md`.
3. **Processus de design** : veille (liste noire des codes que tout le monde utilise) → trois
   directions artistiques séparées (dentelle, atelier, édition) pour l'accueil et la fiche produit →
   critique (originalité, élégance, lisibilité, achat, cohérence Instagram) et gardien de la marque →
   fusion → `DESIGN.md` avec les captures des trois propositions et de la version fusionnée →
   application à tout le site, avec les touches propres à Awrea (motif de dentelle, croquis et
   annotations, monogramme décliné, numéros d'édition, un détail inattendu par page).
4. **Équipes au travail** : Contenu (trois voix → critique éditorial → rédacteur final, e-mails
   compris), E-commerce (cliente mystère : dizaines de commandes test), SEO et IA, Sécurité (attaquant
   éthique jusqu'à zéro faille), Qualité (responsive, accessibilité, performance, homogénéité),
   Juridique, Assistant IA (centaines de conversations simulées), Développement (fonctionnalités
   restantes : drops, avis, archives, maintenance, images de partage, guide, niveau supérieur).
5. **Revue finale** : le critique design repasse sur toutes les pages pour traquer le « générique » ;
   revue façon jury Awwwards dans `REVUE.md`, corrections ; réunion de synthèse dans `JOURNAL.md`.

## Ce qui sera demandé à la fin (impossible à deviner)
Fichiers du logo, photos et vidéos réelles, croquis et annotations manuscrites scannés de la créatrice, accès Shopify (domaine + jetons Storefront/Admin),
clé API Anthropic, compte Vercel, clé Resend (e-mails transactionnels) et Brevo ou Klaviyo (e-mails marketing),
projet Supabase, DSN Sentry, clés Cloudflare Turnstile, identifiants Plausible/GA4, Meta Pixel, Google Ads et Merchant
Center, jeton Instagram, agenda de la créatrice, mot de passe du tableau de bord, informations légales
(voir `LEGAL-A-COMPLETER.md`).
