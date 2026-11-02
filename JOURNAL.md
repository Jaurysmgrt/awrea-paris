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
- 2026-11-02 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/41431659903
- 2026-11-01 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/41296728201
- 2026-10-31 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/41188753092
- 2026-10-30 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/41036014099
- 2026-10-29 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/40851642913
- 2026-10-28 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/40664546084
- 2026-10-27 — 3 contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise. (Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions) ; Parcours du site en ligne (sans rien modifier) ; Textes des agents et de l'assistante (à relire dans l'Atelier)) — https://github.com/Jaurysmgrt/awrea-paris/actions/runs/40476141196

## Fluidité du site (27/10)

Retour de la créatrice : « ça manque de fluidité ». Mesure sur la version de production (Chromium,
processeur ralenti quatre fois pour représenter un téléphone ou un ordinateur modeste), puis cause
par cause, en coupant chaque effet suspect.

- **Défilement** : la vraie cause était l'alternance noir et ivoire. À chaque passage, les couleurs de
  plusieurs centaines d'éléments (textes, filets, boutons) étaient animées une à une, image après
  image. Désormais seul le fond glisse (`data-fond`, sur `<body>` et la bande de l'en-tête), et les
  textes basculent d'un coup quand le fond est à mi-chemin (`data-scene`), ce qui les garde lisibles
  avant comme après. Le halo de lumière est dessiné une fois puis déplacé par `transform`, sans être
  repeint. L'en-tête ne mesure plus sa hauteur à chaque mouvement de la molette. Accueil : 95 % des
  images en moins de 33 ms (67 ms avant), saccades divisées par trois. La Maison : 17 ms (67 ms
  avant).
- **Justification** : les essais d'interlettrage se font sur une copie invisible du paragraphe, par
  tranches de 8 ms au plus. Un contrôle final sur le vrai paragraphe garantit toujours qu'aucun
  espace ne dépasse deux fois l'espace normal. Plus long blocage au chargement des CGV : 0,37 s au
  lieu de 5,9 s.
- **Changement de page** : la page suivante est demandée dès le clic, pendant que le voile blanc se
  pose. Les pages sont rendues à chaque visite (CSP à nonce) et ne peuvent pas être préchargées.
  Nouvelle page visible en 0,6 à 0,7 s au lieu de 0,9 à 1,2 s.
- **À vitesse normale** : aucune tâche longue, défilement à 60 images par seconde, nouvelle page
  visible en 0,35 à 0,4 s. Le défilement doux (Lenis) n'était pas en cause.
- **Clic perdu pendant le fondu** (révélé par un parcours de la CI) : un clic sur un lien pendant
  que le voile se retirait était ignoré, et la page ne changeait pas. Il ouvre désormais la page
  demandée. Un parcours le vérifie (`navigation.spec.ts`).

## Lien privé, langue et mode Nuit (01/11)

- **Lien privé** : la créatrice ne veut plus passer par la page « Bientôt », sans ouvrir le site au
  public. `SITE_PRIVE_CLE` (24 caractères au moins) : `…?cle=<clé>` ouvre tout le site pendant
  30 jours dans ce navigateur. La clé est retirée aussitôt de l'adresse et remplacée par un cookie
  signé qui porte son empreinte : changer la clé ferme tous les accès. Le lien n'ouvre ni l'Atelier
  ni l'Édition, et le site reste exclu des moteurs. Il est affiché dans l'Atelier › Réglages ›
  Sécurité. La créatrice proposait ses accès à l'Atelier : refusés, ils ne servent pas et les agents
  ne gardent aucun mot de passe.
- **Langue à la première arrivée** : `proxy.ts` lit les langues du navigateur (`preferredLocale`,
  `lib/i18n/routing.ts`). Une visiteuse anglophone arrivée sur une adresse française est menée à
  la même page sous /en ; ensuite la langue de chaque page est retenue (`awrea_langue`, 13 mois,
  cookie nécessaire listé dans la politique cookies), et le sélecteur garde la main. Une adresse /en
  donnée reste en anglais, et un robot sans langue annoncée reçoit la page demandée (aucun détour
  pour l'indexation).
- **Mode Nuit** : l'alternance s'inverse. Les sections noires du mode Jour passent la page en
  ivoire, texte noir, puis elle redevient noire. Le halo, lumière blanche, n'y est pas affiché.
- **Bandeau des cookies** : il prenait la couleur d'accent de la page, si bien que son titre passait
  blanc sur blanc au passage d'une section noire, en mode Jour comme en mode Nuit. Il porte
  désormais toutes ses couleurs.
- **Contrôles** : tests unitaires de la langue et du lien privé ; parcours pour l'arrivée en
  anglais, le mode Nuit inversé et le lien privé (serveur lancé en mode privé).

## Cookies obligatoires et Atelier repensé (01/11)

- **Choix des cookies obligatoire** (choix de la créatrice) : tant qu'aucun choix n'est fait, le
  bandeau devient une fenêtre (`role="dialog"`, `aria-modal`). La page est couverte d'un voile
  (`.consent-veil`) ; elle ne défile plus (Lenis arrêté, `overflow: hidden`) et devient inerte
  (`inert` sur tout ce qui entoure le bandeau). Refuser, Accepter et Choisir gardent le même poids.
  La politique cookies, la confidentialité et les mentions légales ne sont pas voilées : on peut les
  lire avant de choisir. « Gérer les cookies » rouvre les réglages sans voile. Pas de « cookie
  wall ».
- **Atelier** (retour : trop austère, trop technique, on s'y perd) :
  - **Menu** : rangé en six groupes en mots simples (Aujourd'hui ; Clientes ; Pièces ; Le site ;
    Gestion ; Coulisses, replié), entrées en romain et non plus en capitales, l'entrée en cours en
    pastille ivoire. Sur téléphone, il est replié derrière « Menu ».
  - **Accueil « Aujourd'hui »** : ce qui attend, dans l'ordre où le faire (commandes en retard,
    rendez-vous du jour, messages, commandes à mettre en confection, retours, propositions), quatre
    chiffres, les gestes courants (modifier le site, ajouter une pièce, changer une photo, voir le
    site) et les pièces en photo.
  - **Coulisses** : les agents, la maintenance de nuit et les dernières actions passent dans
    Coulisses › Équipe.
  - **Mots et mise en page** : « Validations » devient « À valider » ; les pastilles d'état parlent
    simplement (« Paiement simulé », « Assistante simulée ») ; les titres de page sont plus sobres ;
    le texte de l'Atelier n'est plus justifié.


## Accueil : une ouverture qui donne envie (01/11)

- **Demande de la créatrice** : « quand on arrive, je veux voir le logo, que ça donne envie ; il y
  a trop de blanc tout en haut ». Mesure avant : à 1 280 × 720, aucune photo à l'écran (la première
  commençait à 656 px) ; à 1 440 × 900, le titre seul entre deux grands blancs (photo à 600 px) ;
  sur téléphone, un logo de 48 px et la photo à 416 px.
- **Ouverture** : le titre « L'essence de la féminité, révélée le soir », son chapeau et deux pièces
  en grand (la robe Sienna, le top Kira) commencent 24 px sous la navigation. Ordinateur : le titre
  à gauche, les deux photos à droite, la seconde décalée ; tablette : le titre au-dessus des
  photos ; téléphone : la première photo d'abord, puis le titre. Chaque photo mène à sa pièce (le
  nom de la pièce est le lien), avec la mention « visuel provisoire ». Les photos se changent dans
  l'éditeur (document `accueil`, `ouverture.photos`).
- **Logo sur téléphone** : sur l'accueil seulement, le logo entier en grand (80 px) au-dessus de la
  bande Menu · Panier, comme sur ordinateur ; le petit logo de la bande revient une fois le grand
  sorti de l'écran.
- **La Maison** : le texte de présentation (officiel) passe seul, centré, sous l'ouverture, comme
  sur la maquette TEASING MARQUE ; la photo du body Aura, qui l'accompagnait, reste dans la
  sélection de pièces plus bas.
- **Mesure après** : à 1 440 × 900 et 1 280 × 720, le logo, le titre, le chapeau et les deux
  photos sont à l'écran dès l'arrivée ; sur téléphone, le grand logo et la robe Sienna remplissent
  l'écran. Parcours ajoutés : arrivée sur trois tailles d'écran, photo qui mène à la pièce, petit
  logo de la bande au défilement sur téléphone.

## Animations de l'accueil (01/11)

- **Demande de la créatrice** : des animations minimalistes, fluides et haut de gamme, sur l'accueil
  seulement, sans toucher au design ni à la structure, rapides sur téléphone. La refonte de l'accueil
  en grande image de campagne est mise de côté (branche `claude/accueil-campagne`, brouillon).
- **Ouverture** (CSS seul, sans attendre le JavaScript) : chaque photo se dévoile de bas en haut sous
  un rideau de la couleur du fond, puis se pose ; le titre, son chapeau et les légendes montent
  ensuite, décalés de quelques centièmes de seconde.
- **Sections** : blocs de texte, pièces et boutons montent l'un après l'autre à leur entrée dans
  l'écran (observateur commun du site) ; les titres montent d'une ligne invisible d'un seul bloc,
  jamais mot à mot ; les photos se dévoilent par découpage pendant qu'elles se posent.
- **Parallaxe** : collection et création sur demande, 4 % au plus de la hauteur de la photo,
  ordinateur et tablette à la souris seulement ; une lecture de position par photo visible et par
  image. **Micro-interactions** : bouton qui s'enfonce de 2 % à la pression, photo de l'ouverture
  qui s'approche d'un souffle au survol, en plus du fond qui monte dans les boutons et du filet sous
  les liens.
- **Réglages** : une seule durée (`--dur`) et une seule courbe (`--ease`), décalages en
  `--dur-stagger` ; rien ne bouge en animations apaisées. Écueil évité : un élément entièrement
  découpé n'est jamais vu par l'observateur de défilement ; les titres attendent donc transparents
  et le découpage ne vit que le temps de l'animation.
- **Mesures** : défilement de toute la page, processeur ralenti quatre fois, 95 % des images sous
  17 ms ; animations apaisées : rien en attente au chargement ; téléphone : pas de parallaxe.

## Correctifs : logo de l'en-tête sous Safari, tableau des commandes (01/11)

- **Logo invisible en haut de l'accueil** (capture de la créatrice, Safari sur ordinateur) : le
  dessin du logo de l'en-tête prenait 100 % de la hauteur de son lien, de largeur automatique ;
  Safari n'en déduit pas la largeur et le logo restait vide. Chaque logo de l'en-tête (grand logo,
  logo de la bande, monogramme) reçoit désormais sa hauteur propre (`--logo-h`), comme ceux de
  l'Atelier, du pied de page et de la page d'attente, qui s'affichaient bien. Parcours : chaque
  dessin du logo de l'en-tête porte une hauteur propre.
- **Tableau des commandes de l'Atelier** (capture) : dix colonnes, 1 547 px de large pour 1 040 px
  d'écran utile, la fin coupée, les pièces un mot par ligne, l'étape « En attente » barrée comme
  une proposition refusée. Six colonnes désormais (Commande et sa date, Cliente, Pièces, Total,
  Étape avec la fin prévue et le suivi, À faire) ; facture, certificats et suivi détaillé restent
  sur la fiche de la commande. « En attente » et « En retard » prennent la pastille « à traiter »
  et ne sont plus barrés. Le tableau tient dans l'écran dès 1 180 px. Parcours : largeur du tableau
  à 1 440 px, aucune étape barrée.

## Accueil refondu : film plein écran, histoire de la Maison, animations immersives (01/11)

- **Retour de la créatrice** : « je serais pas parti sur ça, pose-moi des questions ». Ses réponses :
  la page actuelle « fait catalogue » ; à l'arrivée, une vidéo plein écran, le logo et le menu posés
  dessus en blanc, rien d'écrit ; ensuite l'histoire de la Maison, puis le reste, plus aéré ;
  animations immersives, plus légères sur téléphone ; inspiration Dior. En attendant sa vidéo, la
  vidéo de démonstration déjà présente (photos noir et blanc de l'ancien site).
- **Film d'ouverture** : plein écran dès le haut de la page (`VideoLazy` : version téléphone, image
  d'attente, pause hors écran, pas de lecture automatique en animations apaisées ou en économie de
  données, bouton pause en bas à gauche, WCAG 2.2.2). L'en-tête de l'accueil ne prend plus de place
  et reste blanc tant qu'il n'est pas compact ; un voile sombre en haut garde le logo et le menu
  lisibles sur un film clair.
- **Histoire de la Maison** : le titre officiel (h1), le chapeau, le portrait officiel de la
  créatrice et le texte TEASING MARQUE, puis la chute et « À propos ». Les deux photos de pièces avec
  leur nom (aspect catalogue) sont retirées de l'ouverture.
- **Animations** : celles de la branche des animations, plus l'arrivée du film (il se pose
  lentement) et sa sortie sur ordinateur (il glisse plus lentement que la page et s'assombrit).
  Sur téléphone, aucun mouvement lié au défilement.
- **À venir** : la vraie vidéo de la créatrice (10 à 20 s, sans son), allégée pour le téléphone.

## Défilement natif à la molette et au pavé tactile (01/11)

- **Retour de la créatrice** : « la fluidité du site est super lourde quand on scrolle ». Cause : le
  défilement doux (Lenis) lissait chaque geste sur 0,8 s ; le pavé tactile d'un Mac, déjà amorti par
  le système, recevait une seconde inertie, et la page arrivait en retard sous les doigts.
- **Correction** : `smoothWheel: false`, la molette et le pavé tactile défilent nativement. Lenis
  garde les défilements commandés par le site (ancres, retour en haut après un changement de page)
  et l'arrêt du défilement derrière les fenêtres et le choix des cookies.
- **Mesure** (Chromium, molette de 400 px) : 90 % du déplacement atteint en 60 ms environ, contre
  près de 0,8 s auparavant.

## Ouverture du site et panne de l'accueil (01/11)

- La créatrice retire `SITE_PRIVE` dans Vercel : le site est ouvert, sans page « Bientôt ».
- Aussitôt, l'accueil tombe en erreur (« This page couldn’t load »). Cause : le cache de données de
  Vercel survit aux mises en ligne et sa clé (`unstable_cache`, `lib/edition/read.ts`) ne dépendait
  que du document et de la langue. L'accueil refait (#21) relisait donc l'ancien document gardé par
  la version précédente, sans `ouverture.video` ni `maison.image`.
- Reproduit en local : ancienne version compilée et affichée en mode `stockage`, puis la version en
  ligne sur le même cache : erreur 500 (`Cannot read properties of undefined (reading 'src')`).
- Correctif : la clé du cache porte l'empreinte du fichier du dépôt (`baseVersion`,
  `lib/edition/store.ts`), et celle du français pour l'anglais. Même scénario après correctif :
  accueil, /en, La Maison, boutique, sur commande et contact répondent 200.
- Vérifications : types, lint, tests unitaires (93), audit des tokens et contrôle d'écriture au vert.

## Logo de l'en-tête encore absent sous Safari (01/11)

- Capture de la créatrice après l'ouverture du site : le menu est posé sur le film, la place du logo
  est gardée, mais le dessin n'apparaît pas. Le correctif du matin (hauteur `--logo-h` sur le dessin)
  ne suffisait pas : Safari ne déduit pas la largeur d'un élément vide placé dans un conteneur à
  largeur automatique.
- `.logo-mask` reçoit maintenant sa largeur, tirée de la hauteur et des proportions du fichier
  (`calc(var(--logo-h) * var(--logo-ratio))`). Sans `--logo-h`, la déclaration ne vaut pas et la
  largeur reste automatique.
- Mesuré sous Chrome sur l'accueil, La Maison, la boutique et la page d'attente, ordinateur et
  téléphone : toutes les tailles de logo restent identiques au pixel près. Safari n'est pas
  disponible ici : à confirmer sur l'ordinateur de la créatrice.

## Accueil, photos et fiche d'une pièce (01/11, soir)

Retours de la créatrice après l'ouverture du site, puis ses réponses : « une pièce en grand », « fondu
lent », « la fiche de la pièce ».

- Accueil : l'histoire de la Maison montre la robe Sienna en grand (7 colonnes sur 12) à côté du texte
  officiel, à la place du portrait ; la création sur demande passe au détail de dentelle du body Gaïa,
  pour ne pas montrer deux fois la même pièce. Les deux sont des visuels provisoires (mention gardée).
- Photos : fondu lent sur tout le site (`@keyframes fondu-lent`, `--dur-breath`, échelle 1,04 → 1),
  à la place du dévoilement par découpage et de la parallaxe de l'accueil. Animation jouée une fois :
  le zoom des cartes au survol garde sa vitesse. Mesuré : opacité 0, puis 0,30 à 300 ms, puis 1.
- Film d'ouverture : sa sortie (il glisse plus lentement et s'assombrit) reste, l'animation que la
  créatrice préfère ; `Parallaxe.tsx` devient `SortieFilm.tsx`, qui ne suit plus que le film.
- Fiche d'une pièce : délai dit une seule fois sous le prix (« Créée sur demande pour vous, en … ») ;
  retirés avant le bouton : le bloc « pièce créée sur demande, délai, certificat », le paragraphe
  d'engagement, les deux liens et « Choisissez votre taille » ; la collection et « Nouveau » sur une
  ligne ; rubriques fermées ; certificat et lien « Voir comment naît votre pièce » dans « Fabrication » ;
  plus d'aide « Survolez l'image » sous la photo.
- Tests adaptés (le délai sous le prix, le certificat dans « Fabrication », rubriques fermées, plus de
  « délai de fabrication » ni de paragraphe d'engagement sur la fiche). Accueil, collection, fiche,
  commande, Atelier et homogénéité : 118 réussis, 2 ignorés.

## Animations au strict minimum (01/11, soir)

Retour de la créatrice : « j'aime pas les animations, ça fait kitsch et vu et revu ». Ses réponses :
« le strict minimum », et garder le fondu blanc entre les pages.

- Retirés : les apparitions au défilement (`RevealObserver`, `data-reveal`, `.reveal-img` ; le fondu
  lent des photos, prévu une heure plus tôt, n'a jamais été publié), le fond qui glissait d'une couleur
  à l'autre au défilement (`ThemeShift` : chaque section porte maintenant sa couleur, le mode Nuit
  garde son alternance inversée), les boutons attirés par le curseur (`Magnetic`), le halo qui suivait
  le curseur sur les sections noires (`LightHalo`), la pose du film à l'arrivée, les titres et blocs
  qui montaient sur l'accueil, l'enveloppe qui s'ouvrait (elle est déjà ouverte) et les points qui
  pulsaient sur les silhouettes.
- Gardés : la sortie du film d'ouverture (il glisse plus lentement et s'assombrit en quittant l'écran,
  ordinateur seulement), le fondu blanc entre les pages, les survols discrets (boutons, liens, photo des
  pièces, loupe dentelle), le passage Jour ↔ Nuit.
- Test de l'accueil réécrit : rien en attente ni marqué pour apparaître, titres opaques et immobiles,
  section noire à sa couleur, sortie du film toujours active.

## Atelier : voir les agents travailler, et un rôle Design (02/11)

Retour de la créatrice : « quand je les lance, il se passe rien, on les voit pas travailler » ; et « un
agent de design qui regarde tous les jours s'il n'y a pas des problèmes, une récurrence, qui fait
l'analyse lui-même, qui a un esprit critique ».

- Cause du « rien » : sans clé d'IA, un passage dure une fraction de seconde ; le bouton affichait
  « L'agent travaille… » le temps d'un éclair, puis seule une petite ligne grise changeait.
- Suivi en direct (`lib/agents/progress.ts`) : pendant un passage lancé depuis l'Atelier, chaque
  action inscrite au journal et chaque étape annoncée partent au fil de l'eau (une ligne JSON par
  étape). Les tâches planifiées ne changent pas.
- `AgentLauncher` (Atelier › Équipe, agents principaux et rôles) : un point qui respire et un fil qui
  court sous le nom de l'agent, le temps passé, les étapes l'une après l'autre (au rythme de
  0,45 s quand elles arrivent toutes ensemble), puis le compte rendu : actions faites, propositions,
  relevés et Contrôle, lien vers « À valider ». Rien ne bouge en animations apaisées.
- Rôle **Design** (`lib/agents/roles/design.ts`, contrôles dans `lib/design/controle.ts`), chaque
  matin et à la demande. Il relit 12 pages comme une visiteuse : accueil, boutique, collection,
  quatre fiches, La Maison, Sur commande, guide des tailles, Contact, accueil en anglais. Il relève :
  page qui ne s'affiche plus, photo cassée ou sans description, titre principal en double, deux
  boutons noirs dans une section, plus de 70 mots ou une phrase répétée avant le bouton d'une pièce.
  Ce qui revient trois jours d'affilée monte d'un cran. Il finit par dire par quoi commencer. Le
  Contrôle relit son passage, comme pour tous les rôles. Site privé : il entre avec le lien privé.
- Tests : 8 tests unitaires (dont l'ancienne fiche, où il relève bien le délai répété), rôle Design
  dans le passage de tous les rôles, et un parcours qui lance Design puis Rapport et suit leurs
  étapes jusqu'au compte rendu.

## Dossier récapitulatif de la créatrice : À la demande, Hypnotic Lace, rendez-vous, boutons (02/11)

Dossier PDF « AWREA PARIS, dossier récapitulatif », appliqué point par point, sans toucher aux autres
pages.

- Menu : « Sur commande » devient « À la demande » (ordinateur et téléphone, même document de
  navigation). Version anglaise inchangée (« Made to order »).
- Page « À la demande » (`/sur-commande`, adresse gardée) : titre « Le privilège d’une pièce
  unique. », nouveau chapeau mot pour mot, centré sur l'axe du titre sur tous les écrans, 648 px au
  plus (`--container-chapeau`, option `leadCentre` de `PageHeader`) ; « Les étapes » devient « Votre
  expérience », « De votre choix à votre porte » reste, centré. Le fil d'Ariane dit « À la demande ».
- Collection « Hypnotic Lace » : seul le sous-titre change, « Entre ombre et lumière, une élégance
  singulière. » (accueil et page de la collection) ; titre et mise en page inchangés.
- Rendez-vous (`/rendez-vous`) : grande photographie pleine largeur sous la navigation (dentelle
  ivoire et ciseaux sur la table de l'atelier, photo de l'ancien site), puis une section noire centrée
  : « Une pièce exclusive à votre demande. », le texte du dossier, un seul bouton « Prendre
  rendez-vous » et « Un échange privilégié avec la créatrice. ». Les deux cartes ont disparu : la
  réservation s'ouvre à la place du bouton (le rendez-vous, le jour et l'heure en pastilles, puis les
  coordonnées), et un lien qui choisit déjà le rendez-vous (`?type=visio`) l'ouvre directement. La
  section reste noire en mode Nuit (`data-nuit="noir"`), bouton ivoire.
- Boutons : capsule pleine sans filet visible (le filet prend la couleur du fond), et un survol à
  peine marqué, le fond s'adoucit de 14 % ; plus d'aplat qui monte ni d'inversion. Nouvelle taille
  `.btn--capsule`, plus haute et plus longue, pour « Prendre rendez-vous ». Restes des boutons
  magnétiques retirés du CSS.
- Tests : menu, chapeau centré et surtitre, page Rendez-vous (titre, bouton, réservation complète,
  ouverture directe, couleurs en mode Jour et Nuit), Rendez-vous ajoutée aux tests d'accessibilité,
  d'homogénéité et de responsive. Captures vérifiées à 1440 et 390 px, Jour et Nuit.

## Atelier : agents qui agissent, e-mails réunis, Atelier plus calme (02/11)

Demande de la créatrice : « retravaille la partie e-mailing, revois tout l’Atelier pour qu’on ne s’y
perde pas et que ce soit agréable ; les agents font juste un retour, j’aimerais qu’ils règlent
eux-mêmes les problèmes, avec bien sûr des règles ». Ses réponses : les quatre autonomies, les quatre
usages des e-mails, et « trop de texte, pas assez agréable, trop de pages techniques ».

- **Agents autonomes** (`lib/agents/autonomie.ts`, `autonomie-regles.ts`, `corrections.ts`) : quatre
  actions nouvelles qui ne prennent que des identifiants : `notify_delay` (e-mail « Retard de
  confection », une fois par commande), `publish_review` (avis vérifié sans photo, sans lien ni
  coordonnées, sans mot de souci, revérifié au moment de publier), `correct_page` (typographie et
  description d’une photo de pièce, jamais un bloc officiel ni une page en brouillon, publiée comme
  une version annulable, sur le site en ligne seulement), `send_relance` (rappel de retour, accusé de
  sur mesure, bienvenue du Cercle ; au plus un e-mail par cliente et par semaine).
- Rôles branchés : Avis, Retours, Sur mesure, Cercle, Gardien de l’éditeur, et l’agent Commandes et
  confection (le message de retard ne passe plus par « À valider »).
- **Réglages › Ce que les agents font seuls** : un interrupteur par autonomie (route
  `/api/gestion/autonomie`) ; coupée, l’action redevient une proposition ; le Contrôle signale une
  action faite malgré tout.
- **E-mails** en quatre onglets : La lettre (aperçu, écrire, essai, envoi gardé), Inscrites (et
  tableur), Envoyés, Automatiques. Les idées de lettre de l’agent Contenu y passent ; « Contenus »
  devient « Instagram ».
- **Atelier plus calme** : introductions ramenées à une phrase, menu plus serré qui tient dans
  l’écran, règles des agents repliées, « Créer une page » replié en bas, parties techniques des
  Réglages repliées, calendrier des agents retiré des Réglages (il est dans Équipe).
- Tests : 5 tests unitaires (règles, corrections, tableur), parcours E-mails, Réglages, agent
  Commandes et confection ; parcours de l’Atelier verts en local.
