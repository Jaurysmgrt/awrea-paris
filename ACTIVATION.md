# ACTIVATION — brancher les vrais services

> Pour la créatrice et toute personne qui l'aide, **sans connaissance technique**. Le site
> fonctionne déjà entièrement sans aucun compte : catalogue, panier, commande, comptes clientes,
> e-mails, assistante et agents sont **simulés**. Chaque service se branche ensuite seul, **sans
> modifier le code** : on crée le compte, on recopie quelques valeurs dans Vercel, on redéploie, on
> vérifie. Ce document est tenu à jour à chaque nouveau service.
>
> Les prix sont indicatifs (octobre 2026) et les menus des services changent parfois de nom : en cas
> de doute, chercher le mot indiqué entre guillemets dans le service.

## Comment ça marche (à lire une fois)

**Les clés.** Chaque service donne des « clés » : de longues suites de caractères qui permettent au
site de parler au service. Elles sont **secrètes** : ne jamais les envoyer par e-mail ou message, ne
jamais les coller dans un fichier du dépôt GitHub. Les ranger dans un gestionnaire de mots de passe
(1Password, Bitwarden, le trousseau d'Apple…).

**Où les mettre.** Dans Vercel : votre projet › **Settings** › **Environment Variables** ›
**Add New**. Pour chaque clé : le **nom** exact (par exemple `RESEND_API_KEY`), la **valeur**, et
cocher **Production** (et **Preview** pour les versions de test). Ensuite : **Deployments** › la
version la plus récente › **⋯** › **Redeploy**. Une clé n'est prise en compte qu'après ce
redéploiement.

**Comment vérifier.** Dans l'Atelier (`/gestion`) › **Réglages** › tableau **Connexions**. Chaque
service y affiche le nom du vrai prestataire (« Shopify », « Supabase »…) quand il est branché, ou
« Simulation — … » sinon. S'il manque une clé, son nom exact est écrit dans la dernière colonne.

**Les interrupteurs.** Chaque service a une variable `…_PROVIDER` :

| Valeur | Effet |
| --- | --- |
| vide (conseillé) | le vrai service dès que ses clés sont renseignées, la simulation sinon |
| `mock` | simulation, même si les clés sont là (pour faire un essai sans toucher à la vraie boutique) |
| nom du service (`shopify`, `supabase`…) | le vrai service ; s'il manque une clé, le site reste en simulation et l'Atelier dit laquelle |

Le site **ne plante jamais** faute de clé : il bascule sur la simulation.

**En local** (pour une développeuse) : copier `.env.example` en `.env.local` et le compléter ; même
fonctionnement.

## L'ordre conseillé

| Étape | Service | À quoi il sert | Prix indicatif |
| --- | --- | --- | --- |
| 0 | Sécurité des comptes, GitHub | Protéger le code et les comptes | Gratuit |
| 1 | Vercel | Héberger le site, nom de domaine | Pro : environ 20 $ / mois (le forfait gratuit est réservé aux sites non commerciaux) |
| 2 | Secrets du site | Sessions, Atelier, tâches planifiées | Gratuit (aucun compte) |
| 3 | Upstash Redis | Mémoire technique (paniers, files d'envoi, sécurité) | Gratuit pour commencer |
| 4 | Shopify | Catalogue, paiement, commandes | À partir d'environ 30 € / mois + frais de paiement |
| 5 | Supabase | Comptes et base clientes | Gratuit pour commencer ; Pro (environ 25 $ / mois) conseillé pour les sauvegardes |
| 6 | Resend | E-mails du site (codes de connexion, confirmations) | Gratuit jusqu'à environ 3 000 e-mails / mois |
| 7 | Brevo (ou Klaviyo) | Lettre d'information et e-mails automatiques | Gratuit pour commencer (Brevo) |
| 8 | Anthropic (Claude) | Assistante, agents de gestion | À l'usage (quelques euros à quelques dizaines d'euros / mois) |
| 9 | Cloudflare Turnstile | Anti-robots des formulaires | Gratuit |
| 10 | Instagram | Publications sur la page d'accueil | Gratuit |
| 10 bis | Colissimo, adresses, comptabilité | Étiquettes de retour prépayées, suggestions d'adresses, export comptable | Contrat Colissimo ; le reste gratuit |
| 11 | Mesure d'audience et publicité | Plausible ou Google Analytics, Clarity, pixels Meta, TikTok, Google Ads | Plausible environ 9 € / mois ; les autres gratuits |
| 12 | Visibilité hors du site | Google, Bing, fiche Google, Merchant Center, boutique Instagram | Gratuit |
| 13 | Maintenance automatique | Agent de nuit, sauvegardes (GitHub Actions) | Inclus dans GitHub ; Claude à l'usage |
| 14 | Éditeur visuel et e-mails | Modifier textes, photos, pages et e-mails sans code | Inclus (Upstash et Supabase des étapes 3 et 5) |

Les étapes 0 à 4 sont nécessaires avant d'ouvrir la boutique au public ; les autres peuvent venir
ensuite, dans n'importe quel ordre.

---

## Étape 0 — Sécurité des comptes et GitHub

1. Activer la **double authentification** sur chaque compte créé dans ce document (GitHub, Vercel,
   Shopify, Supabase, Cloudflare, Anthropic, Resend, Brevo…), avec une application
   d'authentification plutôt que les SMS.
2. GitHub (github.com) › le dépôt du site › **Settings** › **General** › tout en bas,
   **Change visibility** › **Private**.
3. **Settings** › **Branches** (ou **Rules** › **Rulesets**) › nouvelle règle pour `main` : exiger
   une demande de fusion, exiger le passage au vert de « Intégration continue », interdire les
   poussées forcées et la suppression.
4. **Settings** › **Code security** : activer **Secret scanning** et **Push protection**.

**Vérifier** : le dépôt affiche un cadenas « Private ».

## Étape 1 — Vercel (hébergement)

1. Créer un compte sur [vercel.com](https://vercel.com/signup) avec le compte GitHub, puis passer
   au forfait **Pro**.
2. **Add New** › **Project** › importer le dépôt du site. Ne rien changer aux réglages proposés
   (Next.js est détecté ; la région Paris est déjà indiquée dans `vercel.json`).
3. **Settings** › **Domains** : ajouter `www.awreaparis.com` puis `awreaparis.com`, et suivre les
   indications de Vercel chez le registraire du domaine (les « DNS »). Le site redirige
   automatiquement l'adresse sans « www » vers celle avec « www ».
4. Variable à créer : `NEXT_PUBLIC_SITE_URL` = `https://www.awreaparis.com`.

**Vérifier** : le site s'ouvre à son adresse, avec le cadenas du navigateur.

## Étape 2 — Les secrets du site (aucun compte)

Créer ces variables dans Vercel. Pour fabriquer une valeur aléatoire sans terminal : le générateur
de mots de passe de votre gestionnaire, réglé sur 64 caractères, lettres et chiffres.

| Variable | Valeur |
| --- | --- |
| `SESSION_SECRET` | 64 caractères aléatoires (protège les sessions et la double authentification) |
| `ADMIN_PATH` | l'adresse secrète de l'Atelier : `/prive-` suivi d'au moins douze lettres minuscules ou chiffres tirés au hasard, par exemple `/prive-7k2m9q4p1x8d` |
| `ATELIER_ACCOUNTS` | les adresses e-mail autorisées à entrer dans l'Atelier, séparées par des virgules |
| `ATELIER_PASSWORD` | le mot de passe d'installation : il ne sert qu'à la première connexion de chaque compte |
| `CRON_SECRET` | 32 caractères aléatoires (protège les tâches planifiées) |
| `ATELIER_EMAIL` | l'adresse de l'atelier (copies des demandes, rapports des agents) |
| `SECURITY_ALERT_EMAIL` | une adresse qui reçoit une copie des alertes de connexion (facultatif) |

Gardez l'adresse secrète dans votre gestionnaire de mots de passe, avec le site. Elle n'apparaît nulle
part sur le site : ni lien, ni moteur de recherche. L'ancienne adresse `/gestion` répond « page
introuvable », comme n'importe quelle adresse inconnue.

**Vérifier** : ouvrir `https://votre-domaine/prive-…` (votre adresse secrète), saisir votre adresse
e-mail et le mot de passe d'installation, choisir votre mot de passe personnel, scanner le QR code
avec l'application d'authentification, **noter les codes de secours** dans le gestionnaire de mots
de passe. Un e-mail « Connexion à l'Atelier » arrive aussitôt : il arrivera à chaque connexion, avec
un lien « Ce n'était pas moi » qui ferme toutes les sessions. Dans **Réglages**, chaque compte
autorisé apparaît avec son état. Cinq essais manqués bloquent un compte une demi-heure et préviennent
sa titulaire.

Ne jamais changer `SESSION_SECRET` ensuite sans raison : toutes les sessions seraient fermées et la
double authentification serait à refaire.

## Étape 3 — Upstash Redis (mémoire technique)

Indispensable en ligne : sans lui, Vercel efface régulièrement la mémoire du site.

1. Vercel › votre projet › **Storage** › **Create Database** › **Upstash for Redis**
   (« Marketplace »).
2. Région : **Frankfurt** (ou une autre région de l'Union européenne). Forfait gratuit pour
   commencer.
3. **Connect** au projet : Vercel crée lui-même `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. Redéployer.

**Vérifier** : Réglages › « Stockage technique » indique « Upstash Redis ».
**Interrupteur** : `STORE_PROVIDER` (`mock` = fichier local).

## Étape 4 — Shopify (boutique et paiement)

### 4.1 Créer la boutique

1. [shopify.com/fr](https://www.shopify.com/fr) › créer la boutique (pays : France, devise : euro).
2. **Paramètres** › **Paiements** : activer **Shopify Payments** (carte bancaire, Apple Pay,
   Google Pay, Shop Pay), ajouter **PayPal**. Paiement en 3 ou 4 fois : activer **Klarna** dans
   Shopify Payments, ou installer l'application **Alma** (société française).
3. **Paramètres** › **Expédition et livraison** : tarifs Colissimo, Chronopost, international ;
   seuil de livraison offerte (250 €) ; **points relais** : installer l'application officielle
   **Mondial Relay** (le choix du point se fait alors dans le paiement Shopify) ; **retrait à
   l'atelier** : « Retrait en magasin » sur l'adresse de l'atelier, avec la mention « sur
   rendez-vous ». **Paramètres** › **Taxes et droits** : TVA française, et
   « droits et taxes à l'importation » calculés au paiement pour l'international.
4. **Paramètres** › **Marchés** : France, Union européenne, Royaume-Uni, Suisse, États-Unis, avec
   leurs devises (euro, livre, franc suisse, dollar).

### 4.2 Les pièces (créées sur demande, sans stock)

Chaque pièce de la Maison est **créée sur demande**, après la commande, par des artisans français.
Il n'y a donc **aucun stock** : le site ne lit ni n'affiche jamais de quantité, ne dit jamais
« épuisée » ni « dernière pièce », et chaque fiche annonce son **délai de fabrication**. Shopify
doit, de son côté, accepter chaque taille en permanence.

Commencer par les définitions de métachamps (point 4 ci-dessous, et 4.2 ter pour la collection),
puis créer les pièces : leurs cases sont alors prêtes à remplir sur chaque fiche.

1. **Créer chaque pièce** : **Produits** › **Ajouter un produit**, une fiche par ligne du tableau
   de l'étape 4.2 bis.
   - **Titre** : exactement celui du tableau, avec son article (« Le body Aura »).
   - **Adresse de la page** (le « handle ») : en bas de la fiche, rubrique du référencement sur
     les moteurs de recherche › **Modifier**. Shopify propose `le-body-aura`, tiré du titre :
     la remplacer par l'adresse du tableau, sans article (`body-aura`). Le site, ses
     redirections, ses liens, les commandes de démonstration et les essais automatiques reposent
     sur ces sept adresses ; une autre adresse donne une fiche que le site ne relie à rien.
   - **Description** : les paragraphes de la fiche de démonstration (`data/demo/products.ts`),
     séparés par une ligne vide ; la phrase d'accroche va dans le métachamp `awrea.tagline`.
   - **Type de produit** (point 3), **prix** de chaque taille, **délai** (`awrea.delai_min`,
     `awrea.delai_max`, point 4) : ceux du tableau 4.2 bis ; « provisoire » se traduit par
     `awrea.prix_provisoire` ou `awrea.delai_provisoire` à vrai.
   - **Photos** : les visuels provisoires du site, en pleine taille (`public/media/img/`, par
     exemple `aura-1.webp` pour la fiche et `aura-detail.webp` dans `awrea.detail_image`), avec
     le métachamp `awrea.visuels_provisoires` à vrai ; `awrea.nouveau` à vrai.
   - **Canal de vente** : cocher **Headless** (étape 4.3), sinon la pièce reste invisible du site.
2. Chaque pièce est un produit avec l'option de variante **« Taille »**. Pour **chaque taille**,
   rubrique **Inventaire** : décocher **« Suivre la quantité »** (conseillé). Si le suivi reste
   coché, cocher alors **« Continuer à vendre en cas de rupture de stock »**. Une taille que
   Shopify refuse de vendre n'apparaît pas sur le site (le journal du serveur le signale). Les
   pièces publiées par l'agent Catalogue sont déjà réglées ainsi. Renseigner aussi la
   **référence (SKU)** de chaque taille, sur le modèle de la démonstration (`AW-AUR-S` pour le
   body Aura en S ; `ODS`, `ARI`, `SIE`, `GAI`, `EVI`, `KIR` pour les autres pièces) : elle sert
   d'identifiant à chaque taille dans les flux Google et Meta.
3. **Type de produit** : `robe`, `body` ou `top` (`jupe` et `accessoire` existent aussi). Il range
   la pièce dans les filtres de la boutique et lui donne un délai provisoire tant que ses
   métachamps de délai ne sont pas remplis (bodys et tops 2 à 3 semaines, robes 3 à 4 semaines).
4. **Paramètres** › **Données personnalisées** › **Produits** › **Ajouter une définition**, pour
   chacune des lignes ci-dessous, avec l'espace de noms et la clé indiqués, et la case
   **« Accès à l'API Storefront »** cochée :

| Espace de noms et clé | Type | Contenu |
| --- | --- | --- |
| `awrea.delai_min` | Nombre entier | délai de fabrication le plus court, en semaines (par exemple `2`) |
| `awrea.delai_max` | Nombre entier | délai de fabrication le plus long, en semaines (par exemple `3`) ; le site affiche « 2 à 3 semaines » |
| `awrea.prix_provisoire` | Vrai ou faux | prix encore à confirmer (signalé dans l'Atelier › Catalogue) |
| `awrea.delai_provisoire` | Vrai ou faux | délai encore à confirmer ; une pièce sans délai renseigné est signalée de la même façon |
| `awrea.nouveau` | Vrai ou faux | pastille noire « Nouveau » sur la carte de la pièce (l'étiquette de produit `nouveau` fait de même) |
| `awrea.visuels_provisoires` | Vrai ou faux | photos de présentation en attendant les prises de vue : chaque photo porte la mention « visuel provisoire » |
| `awrea.tagline` | Texte sur une ligne | phrase d'accroche |
| `awrea.materials` | JSON | matières, par exemple `[{"name":"Dentelle","percent":100}]` ; laisser vide tant que la composition n'est pas connue |
| `awrea.care` | Liste de textes sur une ligne | conseils d'entretien |
| `awrea.fit` | Texte sur plusieurs lignes | tombé et conseils de taille |
| `awrea.model` | Texte sur une ligne | taille portée par le mannequin |
| `awrea.details` | Liste de textes sur une ligne | détails de façon |
| `awrea.lining` | Texte sur une ligne | doublure |
| `awrea.complete_the_look` | Liste de références de produits | pièces à associer |
| `awrea.detail_image` | Fichier | photographie de détail (loupe) |
| `awrea.traceability` | JSON | étapes de fabrication et origine des matières, par exemple `{"steps":[{"label":"Coupe","place":"France"}],"origins":[{"material":"Dentelle","origin":null}]}` |

   Les anciens métachamps `awrea.edition_total`, `awrea.edition_produced` et
   `awrea.lead_time_weeks` ne servent plus : les supprimer s'ils existent.
5. **Prix, délai, « provisoire » et « Nouveau »** se règlent aussi sans ouvrir Shopify : Atelier ›
   **Catalogue**, une ligne par pièce, bouton **Enregistrer**. Le site écrit alors lui-même le prix
   de toutes les tailles et les métachamps ci-dessus.
6. Emballage cadeau : créer un produit « Emballage cadeau » (inventaire non suivi, lui aussi), le
   rendre disponible sur le canal Headless (voir 4.3) mais pas sur la boutique en ligne Shopify.
   Ouvrir sa variante : l'adresse de la page se termine par `/variants/123456789`. Variable :
   `SHOPIFY_GIFT_WRAP_VARIANT_ID` = `gid://shopify/ProductVariant/123456789`.
7. **Étapes de la commande.** La cliente suit sa commande en cinq étapes : commande reçue, en
   confection, prête, expédiée, livrée. Shopify ne connaît que le paiement, l'expédition et la
   livraison : les deux étapes de la confection se marquent par une **étiquette de la commande**
   (**Commandes** › la commande › **Étiquettes**) :
   - `en-confection` quand la confection commence ;
   - `prete` quand la pièce est terminée (retirer alors `en-confection`).

   Ces deux étiquettes se posent aussi depuis l'Atelier, sans ouvrir Shopify : **Commandes** › la
   commande › **Étapes**, boutons « En confection » puis « Prête » ; la cliente reçoit l'e-mail de
   chaque étape.

   Sans étiquette, une commande payée est « Commande reçue ». Le traitement de la commande avec son
   numéro de suivi la fait passer à « Expédiée », l'évènement de livraison à « Livrée ». Rien n'est
   remis en stock lors d'un remboursement ou d'une annulation depuis l'Atelier.

### 4.2 bis Prix et délais à confirmer par la Maison

Ce tableau donne les sept pièces de la collection **Hypnotic Lace** telles qu'elles sont en ligne
dans la boutique de démonstration ; elles se saisissent à l'identique dans Shopify (étape 4.2,
point 1). Les valeurs marquées **provisoire** sont signalées dans l'Atelier › Catalogue ; une fois
la valeur confirmée, décocher « provisoire » sur la ligne de la pièce (ou passer le métachamp à
faux dans Shopify).

| Pièce (titre exact) | Adresse (handle) | Type de produit | Prix | Délai de fabrication |
| --- | --- | --- | --- | --- |
| Le body Aura | `body-aura` | `body` | 70,00 € | 2 à 3 semaines, **provisoire** |
| La robe Odessa | `robe-odessa` | `robe` | 100,00 € | 3 à 4 semaines, **provisoire** |
| La robe Aria | `robe-aria` | `robe` | 204,00 € | 3 à 4 semaines, **provisoire** |
| La robe Sienna | `robe-sienna` | `robe` | 180,00 €, **provisoire** | 3 à 4 semaines, **provisoire** |
| Le body Gaïa | `body-gaia` | `body` | 75,00 €, **provisoire** | 2 à 3 semaines, **provisoire** |
| Le top Evina | `top-evina` | `top` | 65,00 €, **provisoire** | 2 à 3 semaines, **provisoire** |
| Le top Kira | `top-kira` | `top` | 70,00 €, **provisoire** | 2 à 3 semaines, **provisoire** |

La fiche de chaque pièce s'ouvre ensuite à l'adresse `https://www.awreaparis.com/boutique/` suivie
de son handle (par exemple `/boutique/body-aura`).

Également à confirmer : les **tailles proposées** (XS, S, M et L pour chaque pièce, en attendant),
et toutes les **photos**, provisoires jusqu'aux prises de vue (`RESSOURCES.md`). Compositions,
doublures, entretien et taille du mannequin restent à fournir : `LEGAL-A-COMPLETER.md`.

### 4.2 ter La collection Hypnotic Lace

1. **Paramètres** › **Données personnalisées** › **Collections** › **Ajouter une définition**,
   pour chacune des lignes ci-dessous, avec la case **« Accès à l'API Storefront »** cochée :

| Espace de noms et clé | Type | Contenu |
| --- | --- | --- |
| `awrea.current` | Vrai ou faux | collection en cours, celle que le site met en avant (une seule à la fois) |
| `awrea.season` | Texte sur une ligne | saison écrite à côté du titre ; laisser vide tant que la Maison ne l'a pas choisie |
| `awrea.texte_officiel` | Vrai ou faux | la description est le texte de la créatrice, repris mot pour mot : ne jamais la faire réécrire |
| `awrea.visuels_provisoires` | Vrai ou faux | l'image de la collection est un visuel provisoire : elle porte la mention « visuel provisoire » |

2. **Produits** › **Collections** › **Créer une collection** : titre **« Hypnotic Lace »**,
   collection **manuelle**. Adresse de la page imposée à `hypnotic-lace` (rubrique du
   référencement › **Modifier**), comme pour les pièces : l'ancienne adresse du site,
   `/collections/lace-is-more`, mène à celle-ci. Ajouter les sept pièces dans l'ordre du tableau
   4.2 bis, puis cocher le canal **Headless**.
3. **Description** : le texte officiel de la collection
   (`ressources-awrea/TEXTES/TEXTE DE COLLECTION.pdf`), sans son titre, tel qu'il figure
   ci-dessous : les mots de la créatrice, seuls les guillemets français et la majuscule de
   « Lace » étant harmonisés comme sur le site. Trois paragraphes séparés par une ligne vide ; le
   site lit le premier comme l'accroche, les suivants comme l'intention.

   > La délicatesse, le pouvoir de l’or.
   >
   > La délicatesse rencontre la force. L’élégance devient une signature. Une rencontre entre la
   > finesse de la dentelle, la sensualité des drapés et l’éclat audacieux de la dorure.
   >
   > À travers des silhouettes sculpturales et des détails précieux, la collection
   > « Hypnotic Lace » célèbre une féminité contrastée : délicate, sensuelle et affirmée.

4. Métachamps de la collection : `awrea.current` à vrai, `awrea.texte_officiel` à vrai,
   `awrea.season` vide. Image de la collection : facultative. Sans image, le site prend la
   première photo de la première pièce, avec sa mention « visuel provisoire » ; avec un visuel
   provisoire déposé ici, passer `awrea.visuels_provisoires` à vrai.
5. Référencement de la collection (même rubrique) : titre « Hypnotic Lace, dentelle noire et
   dorure | Awrea Paris » et description « Hypnotic Lace, la collection d’Awrea Paris : la
   dentelle, les drapés et l’éclat de la dorure. Sept pièces créées sur demande par des artisans
   français. » (ceux de la boutique de démonstration).

### 4.3 Relier le site à la boutique (canal Headless)

1. Dans l'App Store de Shopify, installer le canal de vente **« Headless »** (gratuit, publié par
   Shopify).
2. **Créer un storefront**. Dans **Storefront API**, cocher les autorisations : produits,
   collections, paniers et paiement (« checkouts »), contenus et métaobjets, étiquettes. L'accès
   aux stocks n'est pas nécessaire : le site ne les lit pas.
3. Copier le **jeton d'accès privé** et l'adresse de la boutique (`….myshopify.com`).

| Variable | Valeur |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `awrea-paris.myshopify.com` (votre adresse) |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | le jeton privé (à défaut, le jeton public dans `SHOPIFY_STOREFRONT_ACCESS_TOKEN`) |

### 4.4 L'accès des agents de gestion (application du Dev Dashboard)

Le tableau de bord et les agents (fiches des pièces, prix et délais, étapes des commandes,
remboursements proposés à votre validation) ont besoin d'un accès à l'administration de la
boutique.

1. Ouvrir le [Dev Dashboard de Shopify](https://dev.shopify.com/dashboard) **avec le même compte
   que la boutique** (la boutique et l'application doivent appartenir à la même organisation).
2. **Créer une application** › nom « Awrea — agents ».
3. **Configuration** › **Accès** : cocher uniquement `read_products`, `write_products` (fiches,
   prix, métachamps), `read_inventory`, `write_inventory` (création des tailles sans suivi de
   stock), `read_orders`, `write_orders` (étiquettes d'étape, remboursements), `read_customers`,
   `write_customers`. Dans **Données clientes protégées**, demander l'accès
   aux noms, e-mails, adresses et téléphones (nécessaire aux bons de livraison et aux factures).
   Publier la version.
4. **Installer** l'application sur la boutique.
5. **Paramètres** de l'application : copier l'**identifiant client** et le **secret client**.

| Variable | Valeur |
| --- | --- |
| `SHOPIFY_CLIENT_ID` | identifiant client |
| `SHOPIFY_CLIENT_SECRET` | secret client |

Le site demande lui-même un jeton d'accès valable 24 heures et le renouvelle automatiquement.
(Une ancienne « application personnalisée » créée avant 2026 donne plutôt un jeton permanent
commençant par `shpat_` : le mettre dans `SHOPIFY_ADMIN_ACCESS_TOKEN`.)

Si l'Atelier signale « jeton refusé (shop_not_permitted) », l'application et la boutique ne sont pas
dans la même organisation : recréer l'application depuis le compte propriétaire de la boutique.

### 4.5 Les webhooks (Shopify prévient le site)

**Paramètres** › **Notifications** › **Webhooks** › **Créer un webhook**, au format JSON, adresse
`https://www.awreaparis.com/api/webhooks/shopify`, dernière version de l'API, pour chacun de ces
évènements :

- Création de commande, Mise à jour de commande (commandes, étapes de confection, certificats,
  e-mails)
- Création de traitement de commande (expédition : e-mail avec le lien de suivi)
- Création d'évènement de traitement (livraison : e-mail d'arrivée, puis entretien et demande d'avis)
- Création, Mise à jour et Suppression de produit ; Mise à jour de collection (les pages de la
  boutique se régénèrent seules). Aucun webhook de stock : il n'y a pas de stock à suivre.

En bas de la page, Shopify affiche « Vos webhooks seront signés avec … » : copier cette clé dans
`SHOPIFY_WEBHOOK_SECRET`.

### 4.6 Vérifier

1. Réglages › « Boutique et paiement » indique « Shopify », et « Shopify Admin (agents) » aussi.
2. La boutique du site affiche les pièces de Shopify, chacune avec « Sur demande » et son délai de
   fabrication, dans toutes ses tailles.
3. Passer une commande d'essai : **Paramètres** › **Paiements** › activer le **mode test** de
   Shopify Payments, payer avec la carte d'essai `4242 4242 4242 4242`, puis désactiver le mode
   test. La commande apparaît dans l'Atelier, avec son certificat.
4. Facultatif : **Paramètres** › **Domaines** › relier `paiement.awreaparis.com` pour que la page
   de paiement porte le nom de la maison.

**Interrupteur** : `COMMERCE_PROVIDER` (`mock` = boutique de démonstration).
À noter : tant qu'une adresse `SHOPIFY_STORE_DOMAIN` est renseignée, le mot de passe de
démonstration de l'Atelier est refusé, même en simulation.

## Étape 5 — Supabase (comptes et base clientes)

1. [supabase.com](https://supabase.com/dashboard) › **New project** › nom « awrea-paris », mot de
   passe de la base (le garder dans le gestionnaire), région **West EU (Paris)**.
2. **SQL Editor** › **New query** : copier tout le contenu du fichier
   `supabase/migrations/20261013000000_base_clientes.sql` (dans le dépôt GitHub), coller, **Run**.
   S'il y a plusieurs fichiers dans `supabase/migrations`, les passer **dans l'ordre** des noms,
   en particulier `20261018000000_creation_sur_demande.sql` **avant le déploiement** du site : il
   ajoute le délai de fabrication des commandes (`lead_time`) et le numéro de création des
   certificats (`next_creation_number`), et retire les listes d'attente.
3. **Authentication** › **URL Configuration** : *Site URL* = `https://www.awreaparis.com` ;
   *Redirect URLs* : ajouter `https://www.awreaparis.com/api/account/callback`.
4. **Authentication** › **Emails** › **SMTP Settings** : activer un SMTP personnalisé avec Resend
   (étape 6) — hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = la clé
   Resend, expéditeur `atelier@awreaparis.com`. Les codes de connexion partent alors au nom de la
   maison.
5. **Authentication** › **Emails** › **Templates** › **Magic Link** : sujet « Votre code de
   connexion à Awrea Paris », et coller le contenu de `supabase/templates/code-de-connexion.html`
   (il affiche le code à six chiffres que le site demande).
6. Connexion avec Google ou Apple (facultatif) : **Authentication** › **Sign In / Providers** ›
   Google (identifiants créés dans la console Google Cloud, « Identifiants OAuth ») et Apple
   (« Sign in with Apple », compte développeur Apple). L'adresse de retour à donner à Google et à
   Apple est affichée par Supabase sur la même page.
7. **Project Settings** › **API Keys** : copier les clés.

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | *Project URL* (`https://….supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique (*publishable* ou *anon*) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé secrète (*secret* ou *service_role*) — strictement confidentielle |

**Vérifier** : Réglages › « Base clientes et comptes » indique « Supabase ». Créer un compte
cliente sur le site avec votre adresse : le code arrive par e-mail, le compte apparaît dans
Supabase › **Authentication** › **Users** et dans l'Atelier › Clientes.
**Interrupteur** : `CUSTOMERS_PROVIDER`.

## Étape 6 — Resend (e-mails du site)

1. [resend.com](https://resend.com/signup) › **Domains** › **Add Domain** › `awreaparis.com`, région
   **Ireland (eu-west-1)**.
2. Recopier chez le registraire du domaine les enregistrements DNS affichés (SPF, DKIM, et MX de
   retour), puis **Verify**. Ajouter aussi un enregistrement DMARC :
   `_dmarc` · TXT · `v=DMARC1; p=quarantine; rua=mailto:atelier@awreaparis.com`.
3. **API Keys** › **Create API Key** (accès « Sending access » seulement).

| Variable | Valeur |
| --- | --- |
| `RESEND_API_KEY` | la clé (`re_…`) |
| `EMAIL_FROM` | `Awrea Paris <atelier@awreaparis.com>` |

**Vérifier** : Réglages › « E-mails transactionnels » indique « Resend » ; une demande envoyée par
le formulaire de contact arrive dans la boîte de l'atelier. Chaque lettre envoyée par le site porte
son lien de désinscription et l'en-tête « List-Unsubscribe » : Gmail et Apple Mail proposent alors
la désinscription en un clic, comme ils l'exigent des expéditeurs de lettres.
**Interrupteur** : `EMAIL_PROVIDER` (`mock` = boîte d'envoi simulée, lisible dans l'Atelier).

## Étape 7 — Brevo (lettre d'information et e-mails automatiques)

Brevo est une société française, données hébergées dans l'Union européenne. Klaviyo est possible à
la place (variables `KLAVIYO_PRIVATE_KEY`, `KLAVIYO_LIST_ID`).

1. [brevo.com](https://www.brevo.com/fr/) › créer le compte › **Expéditeurs, domaines** :
   authentifier `awreaparis.com` (enregistrements DNS, comme pour Resend).
2. **Contacts** › **Listes** › créer « Lettre Awrea » et noter son numéro.
3. **SMTP et API** › **Clés API** › générer une clé.

| Variable | Valeur |
| --- | --- |
| `BREVO_API_KEY` | la clé (`xkeysib-…`) |
| `BREVO_LIST_ID` | le numéro de la liste |
| `BREVO_SENDER_EMAIL` | `atelier@awreaparis.com` |

**Vérifier** : Réglages › « Lettres et scénarios e-mail » indique « Brevo » ; une inscription à la
lettre depuis le site apparaît dans la liste (après confirmation par e-mail).
**Interrupteur** : `MARKETING_PROVIDER` (`brevo`, `klaviyo` ou `mock`).

## Étape 8 — Anthropic (assistante, agents)

1. [console.anthropic.com](https://console.anthropic.com) › créer le compte de l'entreprise ›
   **Billing** : ajouter un moyen de paiement et une **limite de dépense mensuelle** (par exemple
   50 €).
2. **API Keys** › **Create Key** › nom « site awrea ».

| Variable | Valeur |
| --- | --- |
| `ANTHROPIC_API_KEY` | la clé (`sk-ant-…`) |
| `AI_ASSISTANT_EFFORT` | `low` (réponses rapides ; `medium` pour des réponses plus réfléchies) |

**Vérifier** : Réglages › « Intelligence artificielle » indique « Claude » ; poser une question de
taille à l'assistante sur une fiche.
**Interrupteur** : `AI_PROVIDER` (`mock` = réponses de démonstration).

## Étape 9 — Cloudflare Turnstile (anti-robots)

1. [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) › créer le compte › **Turnstile** ›
   **Add widget** › nom « Awrea », domaines `awreaparis.com` et `www.awreaparis.com`, mode
   **Managed**.
2. Copier la **Site Key** et la **Secret Key**.

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site Key |
| `TURNSTILE_SECRET_KEY` | Secret Key |

**Vérifier** : Réglages › « Protection anti-robots » indique « Cloudflare Turnstile » ; le
formulaire de contact s'envoie normalement.
**Interrupteur** : `CAPTCHA_PROVIDER`.

## Étape 10 — Instagram (publications sur la page d'accueil)

1. Le compte @awrea.paris doit être un **compte professionnel** (Instagram › Paramètres ›
   Type de compte).
2. [developers.facebook.com](https://developers.facebook.com) › **Créer une application** › cas
   d'usage « Instagram » › **API avec connexion Instagram** › ajouter le compte @awrea.paris et
   **générer un jeton** (autorisation `instagram_business_basic`).
3. Variable `INSTAGRAM_ACCESS_TOKEN` = le jeton. Il dure 60 jours, mais le site le renouvelle
   seul chaque semaine : rien à refaire, sauf si le site est resté éteint plus de 60 jours (générer
   alors un nouveau jeton de la même façon).

**Vérifier** : Réglages › « Publications Instagram » indique « Instagram » ; la page d'accueil montre
les dernières publications.
**Interrupteur** : `INSTAGRAM_PROVIDER`.

## Étape 10 bis — Retours, adresses et comptabilité

**Étiquettes de retour prépayées (Colissimo).** Sans elles, la cliente reçoit une étiquette de
démonstration ; vous pouvez aussi, à tout moment, déposer une vraie étiquette dans l'Atelier ›
Retours (elle lui est envoyée aussitôt).

1. Avoir un contrat **Colissimo Entreprise** ([colissimo.entreprise.laposte.fr](https://www.colissimo.entreprise.laposte.fr)) avec
   l'option « Colissimo Retour France ». Demander à votre conseiller l'accès au **service web
   d'affranchissement** : numéro de contrat et mot de passe.
2. Renseigner l'adresse de l'atelier (destinataire des retours) : `content/brand/identity.ts`
   (rubrique `address`) — ou, une fois le gestionnaire de contenus en place, dans l'Atelier.

| Variable | Valeur |
| --- | --- |
| `LABELS_PROVIDER` | `colissimo` |
| `COLISSIMO_CONTRACT_NUMBER` | numéro de contrat |
| `COLISSIMO_PASSWORD` | mot de passe du service web |

**Vérifier** : passer une commande d'essai, la marquer expédiée puis livrée dans l'Atelier (mode
démonstration) ou avec Shopify, demander un retour depuis le suivi de la commande : l'étiquette PDF
arrive avec le numéro de suivi Colissimo. Si Colissimo refuse la demande, l'Atelier vous prévient et
la rubrique Retours vous propose de déposer l'étiquette à la main.

**Suggestions d'adresses** : `ADDRESS_PROVIDER` = `ign` (service public gratuit de l'IGN, aucune
clé). **Vérifier** : à la commande, taper le début d'une adresse française : des propositions
apparaissent.

**Comptabilité** : `ACCOUNTING_EMAIL` = l'adresse de votre comptable. Le 1er de chaque mois, l'export
du mois écoulé (factures et avoirs, format tableur) lui est envoyé ; il reste téléchargeable dans
l'Atelier › Factures. **Avant la première vente**, compléter les mentions légales des factures
(`LEGAL-A-COMPLETER.md` : dénomination, adresse, SIRET, TVA — ou la mention « TVA non applicable,
art. 293 B du CGI » en franchise).

## Étape 11 — Mesure d'audience et publicité

Tous ces outils ne se chargent **qu'après l'accord de la visiteuse** (bandeau cookies). Une
variable vide = outil éteint.

| Outil | Où le créer | Variable |
| --- | --- | --- |
| Plausible (conseillé, sans cookie, UE) | [plausible.io](https://plausible.io) › Add website › `awreaparis.com` | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` = `awreaparis.com` |
| Google Analytics 4 (à la place de Plausible) | analytics.google.com › Admin › Flux de données | `NEXT_PUBLIC_GA4_ID` = `G-…` |
| Microsoft Clarity (cartes de chaleur) | [clarity.microsoft.com](https://clarity.microsoft.com) › New project ; **Settings › Masking › Strict** | `NEXT_PUBLIC_CLARITY_ID` |
| Pixel Meta (Instagram, Facebook) | business.facebook.com › Gestionnaire d'évènements › Connecter une source › Web | `NEXT_PUBLIC_META_PIXEL_ID` |
| Pixel TikTok | ads.tiktok.com › Outils › Évènements › Évènements web › Configuration manuelle | `NEXT_PUBLIC_TIKTOK_PIXEL_ID` |
| Google Ads (conversions) | ads.google.com › Objectifs › Conversions › Site web | `NEXT_PUBLIC_GOOGLE_ADS_ID` = `AW-…`, `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` |

**Vérifier** : accepter les cookies sur le site, visiter deux pages : la visite apparaît en direct
dans l'outil. Refuser les cookies dans une fenêtre privée : rien ne doit apparaître.

### Suivi des erreurs (facultatif)

[sentry.io](https://sentry.io/signup/) › choisir l'hébergement **EU** (Francfort) › créer un projet
« Next.js » › **Settings** › **Client Keys (DSN)** › copier le DSN.

| Variable | Valeur |
| --- | --- |
| `SENTRY_DSN` | `https://…@….ingest.de.sentry.io/…` |

Sans Sentry, les erreurs du site restent visibles dans l'Atelier › Équipe › Performance.
**Interrupteur** : `ERRORS_PROVIDER` (`sentry` ou `mock`).

## Étape 12 — Visibilité hors du site

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)) :
   ajouter la propriété « Préfixe d'URL » `https://www.awreaparis.com`, méthode **Balise HTML** :
   copier le code du `content="…"` dans `GOOGLE_SITE_VERIFICATION`, redéployer, **Valider**.
   Puis **Sitemaps** › `sitemap.xml`.
2. **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)) : « Importer
   depuis Google Search Console ».
3. **Fiche d'établissement Google** ([business.google.com](https://business.google.com)) :
   l'atelier, ses horaires de rendez-vous, photographies, lien vers le site.
4. **Google Merchant Center** ([merchants.google.com](https://merchants.google.com)) : Produits ›
   Sources › ajouter un flux programmé avec l'adresse `https://www.awreaparis.com/feeds/google.xml`
   (chaque jour). Les pièces y sont « en stock » puisqu'elles se commandent toujours, avec leur
   délai de fabrication en délai de préparation (`min_handling_time`, `max_handling_time`) : ne
   pas fixer de délai de préparation plus court dans les réglages de livraison de Merchant Center.
5. **Boutique Instagram et Facebook** (Meta Commerce Manager) : Catalogue › Sources de données ›
   flux programmé `https://www.awreaparis.com/feeds/meta.xml` (pièces « disponibles à la
   commande »).

   **Visuels provisoires.** Une photo marquée provisoire (image générée en attendant les prises
   de vue, `awrea.visuels_provisoires`) n'est jamais envoyée à Google ni à Meta : ni dans ces
   deux flux, ni dans les données structurées des fiches. Ces plateformes ne montreraient pas la
   mention « visuel provisoire » du site, et elles ont leurs propres règles sur les images
   générées (`LEGAL-A-COMPLETER.md`). Tant que toutes les photos des pièces sont provisoires, les
   flux restent donc vides et Merchant Center n'a rien à montrer : c'est voulu. Chaque pièce y
   entre seule dès que ses vraies photographies remplacent les visuels provisoires et que le
   métachamp repasse à faux.
6. **Instagram** : dans la bio de @awrea.paris, le lien `https://www.awreaparis.com` ; dans
   « Boutons d'action », « Réserver » vers `https://www.awreaparis.com/contact`.

**Vérifier** : Search Console › **Inspection de l'URL** sur la page d'accueil : « L'URL est sur
Google » (quelques jours après l'envoi du sitemap).

## Étape 13 — Maintenance automatique et sauvegardes (GitHub Actions)

1. Installer l'application GitHub **Claude** sur le dépôt (github.com/apps/claude).
2. GitHub › dépôt › **Settings** › **Secrets and variables** › **Actions** :
   - secrets : `ANTHROPIC_API_KEY`, `CRON_SECRET` (le même que dans Vercel), `VERCEL_TOKEN`
     (Vercel › Account Settings › Tokens), `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` (Vercel ›
     projet › Settings › General), `BACKUP_PASSPHRASE` (phrase longue, gardée hors ligne),
     `SUPABASE_DB_URL` (Supabase › Connect › chaîne de connexion), `KV_REST_API_URL`,
     `KV_REST_API_TOKEN` (les mêmes que dans Vercel) ;
   - variable : `SITE_URL` = `https://www.awreaparis.com`.
3. **Settings** › **General** › cocher **Allow auto-merge**.

**Vérifier** : onglet **Actions** › « Maintenance » › **Run workflow** : le rapport apparaît dans
l'Atelier et dans `JOURNAL.md`.

## Étape 14 — Éditeur visuel et e-mails modifiables

L'éditeur ne demande **aucun nouveau compte** : il utilise Upstash (étape 3) pour les brouillons,
l'historique et les versions publiées, et Supabase (étape 5) pour les photos déposées.

1. **Photos** : Supabase › **Storage** › **New bucket** › nom `medias`, cocher **Public bucket**.
   Les photos déposées dans l'éditeur y sont rangées en plusieurs tailles (WebP). Sans ce dossier,
   elles restent dans Upstash (suffisant pour essayer, pas pour un catalogue de photos).
2. **Sauvegarde dans GitHub (conseillé)** : GitHub › **Settings** (du compte) › **Developer
   settings** › **Fine-grained tokens** › **Generate new token** : dépôt `awrea-paris` seulement,
   permission **Contents : Read and write**, expiration un an. Dans Vercel :

| Variable | Valeur |
| --- | --- |
| `EDITION_GITHUB_TOKEN` | le jeton (`github_pat_…`) |
| `EDITION_GITHUB_REPO` | `propriétaire/awrea-paris` |
| `EDITION_GITHUB_BRANCH` | `main` |

   Chaque publication est alors aussi enregistrée dans le dépôt (`content/site/`), qui garde
   l'archive de tous les contenus et relance un déploiement.
3. **Publications programmées** : rien à faire, Vercel Cron les publie tous les quarts d'heure
   (`vercel.json`, `CRON_SECRET` de l'étape 2), et l'éditeur publie aussi celles arrivées à
   échéance dès qu'il s'ouvre.
4. **E-mails** : l'Atelier › **E-mails** montre chaque e-mail tel qu'il arrive (Apple Mail, Gmail,
   Outlook, téléphone, clair et sombre). Les e-mails du site partent directement avec la version
   publiée. Pour les services d'envoi :
   - **Brevo** : l'e-mail › **Pour Brevo** télécharge le gabarit ; Brevo › **Campagnes** ›
     **Modèles** › **Nouveau modèle** › **Importer un modèle** › **Importer un fichier HTML**.
   - **Klaviyo** : **Pour Klaviyo** ; Klaviyo › **Content** › **Templates** › **Create Template** ›
     **Import** › **HTML**.
   - **Notifications Shopify** (confirmation de commande, expédition) : **Pour Shopify** ;
     Shopify › **Paramètres** › **Notifications** › l'e-mail › **Modifier le code** : remplacer le
     contenu par celui du fichier, **Aperçu**, puis **Enregistrer**.
5. **Interrupteur** : `EDITION_STORAGE` (`stockage` en ligne, `fichiers` en local ; vide conseillé).

**Vérifier** : Atelier › **Pages** › **Modifier** sur l'accueil ; changer un mot ; le site public
ne change pas ; **Publier** ; le site public montre le nouveau mot ; **Historique** › la version
précédente › **Remettre en ligne**.

---

## Après la mise en ligne

- Tester [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/) et
  [securityheaders.com](https://securityheaders.com) : objectif A+.
- Après une semaine sans incident : inscrire le domaine sur [hstspreload.org](https://hstspreload.org).
- Pare-feu Vercel : règles décrites dans `SECURITE.md` (§ 3).
- Informations légales encore à fournir : `LEGAL-A-COMPLETER.md`, à faire relire par une
  professionnelle du droit avant l'ouverture.

## Revenir à la simulation

Pour tester une nouveauté sans toucher aux vraies données : dans un déploiement **Preview** de
Vercel, mettre l'interrupteur du service à `mock` (par exemple `COMMERCE_PROVIDER=mock`). La
production n'est pas concernée.
