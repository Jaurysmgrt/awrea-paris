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

## Sécurité complète, agent de maintenance, exploitation
- Audit de sécurité complet consigné dans `SECURITE.md` (état de chaque protection, résultats, failles corrigées,
  réglages restant à faire par la maison).
- Failles trouvées et corrigées pendant l'audit : clé de session de développement utilisable en production
  (désormais refusée : l'Atelier reste fermé sans `SESSION_SECRET`), mot de passe de démonstration accepté sans
  boutique branchée, enrôlement de la double authentification non limité, sessions non révocables, numéro de carte
  de test transmis au serveur, purge des données exécutable par tout le monde (désormais réservée au serveur).
- Turnstile ajouté à la connexion de l'Atelier ; purge quotidienne des données arrivées à échéance branchée.
- Sauvegardes quotidiennes chiffrées (AES-256) avec test de restauration automatique ; recherche de clés secrètes ;
  Dependabot ; intégration continue complète ; contrôle de sécurité hebdomadaire.
- Agent de maintenance quotidienne (GitHub Actions) : bilan complet, réparation par Claude Code en mode auto avec
  demande de fusion fusionnée seulement au vert, rapport dans ce journal et dans l'Atelier ; contrôle après chaque
  mise en ligne avec retour automatique à la version précédente.
- `CLAUDE.md`, sous-agents de développement (design, front-end, e-commerce, SEO, tests), `README.md` et
  `.env.example` à jour.
- Constat : le dépôt GitHub est public et `main` n'est pas protégée — à corriger par la maison (SECURITE.md § 11).
- Tests : 263/263 sur la version de production (CSP stricte), tests unitaires et de la base au vert.

## Certificats numériques, flux produits, « Trouver ma taille »
- Certificat d'authenticité numérique pour chaque pièce vendue : numéro de série sous un QR code, page publique
  `/certificat/<numéro>` (numéro d'édition, collection, taille, matières, date, signature) sans aucune donnée
  personnelle, impression sur une page A4. Émis une seule fois par commande, même si Shopify renvoie le webhook
  (verrou atomique). Rattaché au compte de l'acheteuse (même e-mail) ; une pièce offerte se rattache avec le code
  transmis à l'achat. Onglet « Certificats » dans le compte, liens sur la page de confirmation.
- Flux Google Merchant Center et Meta (Instagram, Facebook) : `/feeds/google.xml`, `/feeds/meta.xml`.
- « Trouver ma taille » sur chaque fiche : trois mesures, la taille conseillée selon la coupe de la pièce (lacée,
  satin), un geste pour la choisir, mesures gardées dans le compte si la cliente le souhaite.
- Corrections relevées en vérifiant à l'écran : espacement `.stack-s` jamais défini (formulaires serrés), bouton
  doré illisible sur fond clair (désormais or profond), espace fine insécable avant « % ».
- Tests : 265/265 sur la version de production, dont le parcours achat → certificat → rattachement d'une pièce
  offerte.

## Nouvelle direction artistique, équipes d'agents, drops, avis vérifiés (13/10)
- Direction artistique remplacée partout : plus aucun doré (tokens, CSS, e-mails, halo devenu blanc,
  fil du drapé blanc), Instrument Serif (titres, très grands, jamais en italique) et Inter Tight
  (textes 300, navigation et boutons en petites capitales 400), aucune calligraphie. Palette de quatre
  couleurs ; taupe profond pour les petits textes secondaires (contraste AA).
- Justification régulière : paragraphes justifiés avec césure française, mesure de 60 à 70 caractères,
  équilibreur par paragraphe (±1 % d'espacement des mots et des lettres), contrôle automatique sur
  27 pages × 3 formats (`tests/e2e/homogeneite.spec.ts`) : polices, italiques, couleurs, grille de
  8 px, interlignage 1,6, trous de justification.
- Équipes d'agents : 34 rôles dans `.claude/agents/`, organisation dans `docs/EQUIPES.md`, référence
  commune `MARQUE.md`. Veille design : liste noire de vingt sites (`docs/equipes/design/`), arbitrages.
- Drops (« Bientôt ») : compte à rebours sobre, accès anticipé signé, vente privée par mot de passe,
  contrôle côté serveur (panier, commande). Avis vérifiés sans étoiles (lien personnel après
  livraison, photos recompressées sans métadonnées, modération et réponse dans l'Atelier).
  Certificats dans l'Atelier (mot de la créatrice, impression de l'étiquette QR et du code).

## Cahier des charges complet — reprise autonome, phase A (13/10, soir)
- Le cahier des charges complet devient la référence unique. Audit de l'existant (`ETAT.md`), plan
  priorisé en phases A à G (`PLAN.md`, l'ancien plan archivé), registre des décisions
  (`DECISIONS.md`). État antérieur sauvegardé sur la branche `archive/avant-nouvelle-da`.
- Interrupteurs par service (`lib/config/providers.ts`) : `COMMERCE_PROVIDER`, `CUSTOMERS_PROVIDER`,
  `STORE_PROVIDER`, `EMAIL_PROVIDER`, `MARKETING_PROVIDER`, `AI_PROVIDER`, `CAPTCHA_PROVIDER`,
  `INSTAGRAM_PROVIDER` ; `mock` force la simulation, un prestataire sans ses clés retombe sur la
  simulation sans planter ; état et clés manquantes dans l'Atelier › Réglages ; tests unitaires.
- Shopify à jour des changements de 2026 : jeton privé du canal Headless, accès Admin des agents par
  une application du Dev Dashboard (jeton de 24 h demandé et renouvelé par le site).
- `ACTIVATION.md` : treize étapes dans l'ordre, pour une non-développeuse (compte à créer, où
  cliquer, quoi recopier, comment vérifier), du dépôt privé jusqu'à la maintenance automatique.
- Polices servies par le site (plus aucun appel à Google Fonts) ; logo provisoire vectorisé à partir
  des polices (fichiers noir et blanc, favicon, icônes de l'application) ; une seule durée (0,8 s) et
  une seule courbe pour toutes les animations, défilement doux compris, contrôlées par l'audit.
- En avance sur la phase B : Microsoft Clarity et pixel TikTok après consentement (déclarés dans les
  pages légales), régénération du catalogue par webhooks Shopify, jeton Instagram renouvelé chaque
  semaine, gabarit du code de connexion Supabase aux couleurs de la maison.
- Vérifications : lint, types, audit des tokens, tests unitaires (14) et de la base au vert ; recherche
  de clés secrètes propre.

### Réunion de synthèse — fin de la phase A
- **Présents** : chef de projet, Développement (architecte), Sécurité (défenseur), Design (directeur
  artistique « dentelle », en cours de proposition).
- **Décidé** : les interrupteurs n'appliquent un prestataire que si toutes ses clés sont là ; le mot de
  passe de démonstration de l'Atelier reste refusé dès qu'une boutique Shopify est renseignée ; la
  durée unique vaut aussi pour les séquences signature, qui l'enchaînent.
- **Point de vigilance** (Sécurité) : Clarity enregistre les visites ; masquage strict obligatoire dans
  son tableau de bord (écrit dans `ACTIVATION.md`), chargé seulement avec l'accord « mesure d'audience ».
- **Suite** : phase B (boutique complète en simulation) ; en parallèle, les directions artistiques
  « atelier » et « édition » une par une, puis critique, gardien de la marque et fusion.

## Phase H : écriture, éditeur visuel, e-mails, équipe de gestion, rendez-vous (14 et 15/10)

- **Écriture humaine** : contrôle automatique en CI (`npm run audit:ecriture`), textes des agents et
  de l'assistante nettoyés et contrôlés ; réécriture des 172 textes signalés par lots (Plume, puis
  Détecteur IA et Lecture à voix haute, reprise, Typographe, Cohérence), conduite comme un workflow
  d'équipes, interrompu deux fois par la limite d'utilisation et repris à sa levée.
- **Accès admin invisible** : adresse secrète, comptes autorisés, double authentification par
  compte, blocage, alerte à chaque connexion ; vérifié de bout en bout.
- **Éditeur visuel « Édition »** : textes cliquables sur la vraie page (titres animés compris),
  photos par glisser-déposer avec point focal et déclinaisons, sections en blocs, aperçu téléphone,
  tablette et ordinateur dans un cadre réservé à la créatrice, brouillons, publication programmée
  (tous les quarts d'heure), historique et retour en un clic, guide d'accueil ; pages d'événement,
  d'article et de collection créées depuis un modèle, invisibles avant publication, supprimables ;
  page « Pages » de l'Atelier. Test de bout en bout : création, modification sur place, brouillon
  invisible du public, publication, retour à la version précédente, suppression.
- **E-mails modifiables sans code** : blocs dans la direction artistique, rendu clair et sombre,
  simulation Gmail, Apple Mail, Outlook et téléphone, envoi d'essai, export Brevo, Klaviyo et
  Shopify ; galerie, éditeur et textes communs dans l'Atelier. Désinscription signée en un clic.
- **Équipe de gestion quotidienne** : dix-huit rôles (Gardien de l'éditeur, Avis, Retours, Logistique,
  Anti-fraude, Comptabilité et TVA européenne, Données personnelles, Cercle, Drops, Sur mesure,
  Rendez-vous, Production, Presse, Instagram, Publicité, Accessibilité, Performance, Sauvegarde),
  un passage chaque matin, relus par le Contrôle ; page Équipe de l'Atelier ; la sauvegarde chiffrée
  de la nuit rend compte à l'Atelier.
- **Rendez-vous en ligne** : choix du rendez-vous, du jour et de l'heure, confirmation avec
  invitation d'agenda, rappel la veille, annulation par lien signé ; agenda, disponibilités et
  abonnement iCal dans l'Atelier. Testé sur ordinateur et sur téléphone.
- **Suivi des erreurs** : serveur et navigateur, Sentry sans bibliothèque, repli local.
- **Design** : troisième direction (« édition ») terminée ; critique, gardien de la marque et fusion à
  reprendre à la levée de la limite.
- **Trouvé en route et corrigé** : des articles de presse d'exemple inventés (à retirer à la
  migration des textes), un lien de désinscription annoncé qui n'existait pas, une pièce de test
  restée dans la boutique de développement.

## Intégration des ressources officielles (17 au 25/10)

- **Réunion de synthèse** (chef de projet, Gardien de la marque, Critique design, Développement,
  Écriture, Juridique, Assistant IA) : les ressources de `ressources-awrea/` priment sur toutes les
  consignes précédentes ; travail mené en treize lots, deux équipes à la fois pour tenir les limites
  d'utilisation, puis un lot d'intégration qui a appliqué les suites de chacun.
- **Design** : polices officielles (Fraunces 72pt Italic pour les titres, Cormorant Garamond pour
  les textes), logo officiel en image, la police du logo jamais chargée ni publiée ; en-tête, pied de
  page, fiche pièce, contact et lettre de la Maison selon les maquettes ; langage des maquettes
  étendu à tout le site (filets fins, champs soulignés, boutons en pilule, pastille « Nouveau »).
- **Textes officiels** repris mot pour mot et marqués `officiel` (La Maison, collection Hypnotic
  Lace, teasing, CGV, mentions légales) ; le contrôle d'écriture n'y applique que la typographie.
- **Modèle sur demande** : pièces créées sur demande par des artisans français, sans stock ; délai
  de fabrication sur chaque fiche ; étapes commande reçue, en confection, prête, expédiée, avec un
  e-mail à chaque étape ; numéro de création sur le certificat ; listes d'attente, stock, séries
  numérotées et compte à rebours retirés partout (site, Atelier, agents, assistante, base).
- **Catalogue** : sept pièces (body Aura, robes Odessa, Aria et Sienna, body Gaïa, tops Evina et
  Kira), prix provisoires modifiables, photos générées marquées « visuel provisoire » et repérées
  dans l'éditeur (« Photos provisoires à remplacer »).
- **Juridique** : CGV et mentions légales officielles transcrites, livraison et paiement alignés sur
  les CGV (France métropolitaine ; carte, Apple Pay, Google Pay, PayPal), écarts listés dans
  `LEGAL-A-COMPLETER.md`.
- **Sécurité** : Next.js passé en 16.4.2 (avis critique sur les versions 16.0.0 à 16.4.0 : exécution
  de code à distance par l'optimisation d'images et `use cache`, déni de service par les actions
  serveur) ; `npm audit` sans vulnérabilité.
- **Vérifications** : types, lint, audit des tokens, contrôle d'écriture (517 fichiers), tests
  unitaires (78), base de données, recherche de secrets et compilation au vert ; parcours Playwright
  relancés sur le serveur de production.
- **Restent à la Maison** : vraies photos des shootings, logo vectoriel, adresse de l'atelier,
  étiquette de retour prépayée face à l'article 7 des CGV, version des CGV, e-mail de confirmation
  (Shopify ou « Commande reçue »), origine des vidéos des coulisses, graphie « Hypnotic Lace » ou
  « Hypnotic lace », licence de la police du logo.
- **Restent au développement** : quelques textes en dur hors commerce (avis, rétractation,
  préférences d'affichage, empreinte écologique, vidéo différée), e-mails de `flows.ts` en documents,
  lieu dans l'e-mail de rendez-vous, photos des avant-premières dans la liste des provisoires.

## Retours de la créatrice et réponses aux questions (25/10)

- **Style** : la créatrice trouve le site « trop IA ». Tics décoratifs retirés (surtitres, traits
  devant les surtitres, apparition des titres mot à mot), bouton de l'assistante en pilule sobre.
  Refonte à venir dans l'esprit d'un site de référence qu'elle a choisi (natalierolt.com), sans le
  copier ; le site n'est pas encore joignable depuis l'environnement de travail.
- **Mode Nuit** toujours automatique selon le réglage de l'appareil (et animations apaisées de même) ;
  l'interrupteur du pied de page et du menu est retiré.
- **Texte aligné à gauche partout** : « le texte a des trous dedans ». L'équilibreur de justification
  est supprimé ; le testeur homogénéité vérifie qu'aucun paragraphe n'est justifié et qu'aucun ne
  dépasse 75 caractères par ligne.
- **Réponses aux questions** (détail dans `DECISIONS.md`) : « Hypnotic Lace » avec deux majuscules ;
  taille XL ajoutée ; retours à la charge de la cliente comme l'article 7 des CGV (bordereau avec
  l'adresse de l'atelier) ; e-mail de confirmation du site, collé dans Shopify ; rendez-vous en appel
  vidéo seulement ; la Maison facture la TVA ; aucun médiateur pour l'instant ; anglais britannique ;
  photos provisoires gardées pour la mise en ligne ; licence commerciale de la police du logo
  achetée ; logo vectoriel à venir ; vidéos des coulisses tournées par elle (à confirmer sur les
  fichiers en place).
- **Version anglaise** (équipe International et architecte, comptes rendus dans `docs/equipes/`) :
  adresses `/en` (réécrites par `proxy.ts`, l'Atelier et l'API restent hors de `/en`), sélecteur
  « FR · EN » dans l'en-tête et le menu, `<html lang>`, hreflang et plan du site dans les deux
  langues, prix et dates britanniques, recherche anglaise. 42 documents et les sept fiches traduits
  en anglais britannique, textes officiels phrase par phrase, « seule la version française fait
  foi » en tête des CGV et des mentions légales. Restent en français sous `/en` : les textes écrits
  en TypeScript (CGU, confidentialité, cookies, livraison et retours, rétractation, Journal, FAQ,
  espace cliente, bandeau cookies), les e-mails et l'assistante. À arbitrer : indexer ou non ces
  pages restées en français sous `/en`.
- **Site privé** (26/10) : la créatrice garde le site pour elle jusqu'à ce qu'il soit fini. Nouveau
  mode `SITE_PRIVE=1` : page d'attente « Bientôt » (français et anglais) pour les visiteuses, rien
  d'indexable, tout le site pour la créatrice connectée à l'Atelier ; tests unitaires et parcours
  dédiés. Le domaine `awreaparis.com`, enregistré chez Wix, reste non relié.

## Cahier des modifications de la créatrice (27/10)

Cahier de cinq pages, appliqué dans l'ordre qu'il conseille ; trois arbitrages demandés à la
créatrice (grands titres en Fraunces 120 Light droite, corps de texte justifiés sur ordinateur
seulement, son paragraphe « savoir-faire » mis en place, « Toutes les collections » vers
`/collections`).

- **Éditeur** : les mots entre accolades (délais, prix, prénom) se retirent librement, sauf un lien
  ou un code utile à la cliente ; c'est ce qui bloquait le paragraphe de la section sur demande.
  Longueurs élargies (titres 120, boutons 40, petites lignes 80).
- **Report des modifications de l'Édition** : une page publiée ou un brouillon ne masque plus les
  nouveautés livrées par le code ; seules les modifications de la créatrice sont reportées sur la
  nouvelle version (`rebase`, `lib/edition/merge.ts`), y compris pour une page publiée avant ce
  report (base de départ : la « Version d'origine » de l'historique). Vérifié par un test unitaire
  et une simulation sur le stockage.
- **Panier** : le pied ne gardait de place que pour le total, la note et le paiement ; sur téléphone
  ou un ordinateur portable, la photo était coupée, la quantité et « Retirer » cachés, et la molette
  ne faisait pas défiler le panier (Lenis arrêté bloquait la molette dans les fenêtres). Pied
  réduit au total et à « Commander », « Quantité » écrit en clair, « Retirer » à droite de la
  taille, pièce ajoutée amenée à l'écran, `prevent` de Lenis pour toutes les fenêtres `<dialog>`.
  Vérifié à 1280 × 700, iPhone 13 et iPhone SE.
- **Mentions légales** (et toutes les pages légales) : sommaire à deux niveaux, numéroté quand les
  titres ne le sont pas, à gauche du texte et toujours visible sur ordinateur ; ancres données à
  chaque intertitre ; contenu inchangé.
- **Identité visuelle** : fausse dentelle éclairée retirée des fonds noirs (texture, composant
  `LaceReveal`, génération dans `build-media.py`), halo gardé ; fondu blanc entre les pages à la
  place du pan de tissu noir (OGL retiré du projet) ; grands titres en Fraunces 120pt Light droite
  (face statique tirée de la police variable Fraunces, OFL, 20 Ko), petits titres inchangés ; corps
  de texte justifiés avec césure sur tablette et ordinateur, à gauche sur téléphone ; cœur au lieu
  du losange pour les envies ; logo « AW » avant le filet du pied de page ; liens du pied sans
  soulignement.
- **Textes** : titre et sous-titre de l'accueil, boutons « À propos d'Awrea Paris », « Voir la
  collection », « Découvrir la confection », titres « Découvrir les nouvelles pièces », « Le
  savoir-faire français au service de l'exception » et « L'exception se dévoile en avant-première »,
  menu « La pièce à la demande », « Le détail du savoir-faire », « Toutes les collections » ; en
  anglais britannique aussi.
- **Contrôles** : le testeur homogénéité vérifie désormais qu'aucun paragraphe n'est justifié sur
  téléphone, qu'un paragraphe justifié a sa césure et au moins 45 caractères par ligne, et que chaque
  texte commence au bord de son titre.
- **À signaler** : les mentions légales officielles nomment Wix comme hébergeur ; le site sera
  hébergé par Vercel (à corriger par la créatrice avant l'ouverture, `LEGAL-A-COMPLETER.md`).
- **Justification sans trou** (retour de la créatrice : « je vois des espaces ») : mesure des espaces
  ligne par ligne sur 15 pages et 3 largeurs. Sans césure, le plus grand espace d'une ligne valait
  en moyenne 1,68 fois l'espace normal, 3 fois ou plus sur une ligne sur dix, jusqu'à 11,6 fois. Le
  site pose désormais lui-même les coupures des mots (motifs français et anglais, `hyphen`), puis
  règle chaque paragraphe par un interlettrage invisible ; colonnes étroites et paragraphes
  impossibles à justifier sans trou au fer à gauche. Résultat : médiane 1,18, 90 % sous 1,5, aucun
  espace au-delà de 2. Le testeur homogénéité mesure maintenant ces espaces lui-même.

## Maintenance quotidienne
- 2026-10-28 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/40664546084
- 2026-10-27 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/40476141196
