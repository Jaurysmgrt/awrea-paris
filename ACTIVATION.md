# ACTIVATION · brancher les vrais services

> Pour la créatrice et toute personne qui l'aide, **sans connaissance technique**. La boutique est
> entièrement à la Maison : pièces, commandes, clientes, retours et factures se gèrent dans
> l'Atelier, sans plateforme de commerce extérieure. Les services de ce document gardent les
> données, envoient les e-mails, font tourner l'assistante. Tant qu'un service n'est pas branché,
> le site le remplace par une **simulation**. Chaque service se branche seul, **sans modifier le
> code** : on crée le compte, on recopie quelques valeurs dans Vercel, on redéploie, on vérifie. Ce
> document est tenu à jour à chaque nouveau service.
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
cocher **Production** (et **Preview** pour les versions de test, après avoir lu la prudence de
l'étape 4.1). Ensuite : **Deployments** › la version la plus récente › **⋯** › **Redeploy**. Une
clé n'est prise en compte qu'après ce redéploiement.

**Comment vérifier.** Dans l'Atelier (`/gestion`) › **Réglages** › tableau **Connexions**. Chaque
service y affiche le nom du vrai prestataire (« Supabase », « Resend »…) quand il est branché, ou
« Simulation · … » sinon. S'il manque une clé, son nom exact est écrit dans la dernière colonne.

**Les interrupteurs.** Chaque service a une variable `…_PROVIDER` :

| Valeur | Effet |
| --- | --- |
| vide (conseillé) | le vrai service dès que ses clés sont renseignées, la simulation sinon |
| `mock` | simulation, même si les clés sont là (pour faire un essai sans toucher aux vraies données) |
| nom du service (`supabase`, `resend`…) | le vrai service ; s'il manque une clé, le site reste en simulation et l'Atelier dit laquelle |

Le site **ne plante jamais** faute de clé : il bascule sur la simulation.

**En local** (pour une développeuse) : copier `.env.example` en `.env.local` et le compléter ; même
fonctionnement.

## L'ordre conseillé

| Étape | Service | À quoi il sert | Prix indicatif |
| --- | --- | --- | --- |
| 0 | Sécurité des comptes, GitHub | Protéger le code et les comptes | Gratuit |
| 1 | Vercel | Héberger le site, nom de domaine | Pro : environ 20 $ / mois (le forfait gratuit est réservé aux sites non commerciaux) |
| 2 | Secrets du site | Sessions, Atelier, tâches planifiées | Gratuit (aucun compte) |
| 3 | Upstash Redis | Mémoire du site (réglages des pièces, commandes, retours, factures, files d'envoi, sécurité) | Gratuit pour commencer |
| 4 | La boutique de la Maison | Pièces, prix, délais, commandes, dans l'Atelier | Inclus (aucun compte) |
| 4 bis | Stripe | Paiement en ligne | Frais à chaque vente, sans abonnement |
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
| 15 | Application de l'Atelier | L'Atelier sur l'iPhone ou l'Android, avec ses notifications | Gratuit (aucun compte, aucune boutique d'applications) |

Les étapes 0 à 5 sont nécessaires avant de prendre de vraies commandes ; les commandes payées
attendent en plus l'étape 4 bis (Stripe). Les autres étapes peuvent venir ensuite,
dans n'importe quel ordre.

---

## Étape 0 · Sécurité des comptes et GitHub

1. Activer la **double authentification** sur chaque compte créé dans ce document (GitHub, Vercel,
   Supabase, Cloudflare, Anthropic, Resend, Brevo, puis Stripe…), avec une application
   d'authentification plutôt que les SMS.
2. GitHub (github.com) › le dépôt du site › **Settings** › **General** › tout en bas,
   **Change visibility** › **Private**.
3. **Settings** › **Branches** (ou **Rules** › **Rulesets**) › nouvelle règle pour `main` : exiger
   une demande de fusion, exiger le passage au vert de « Intégration continue », interdire les
   poussées forcées et la suppression.
4. **Settings** › **Code security** : activer **Secret scanning** et **Push protection**.

**Vérifier** : le dépôt affiche un cadenas « Private ».

## Étape 1 · Vercel (hébergement)

1. Créer un compte sur [vercel.com](https://vercel.com/signup) avec le compte GitHub (fait le
   26/10/2026). Pour l'essai privé (`SITE_PRIVE=1`), le forfait gratuit **Hobby** suffit ; avant
   l'ouverture au public, passer au forfait **Pro** (Hobby est réservé aux sites non commerciaux)
   et remettre la publication programmée toutes les 15 minutes : dans `vercel.json`, la tâche
   `/api/cron/edition` reprend `*/15 * * * *` (Hobby n'accepte qu'une tâche par jour).
2. **Add New** › **Project** › importer le dépôt du site. Ne rien changer aux réglages proposés
   (Next.js est détecté ; la région Paris est déjà indiquée dans `vercel.json`).
3. **Settings** › **Domains** : ajouter `www.awreaparis.com` puis `awreaparis.com`, et suivre les
   indications de Vercel chez le registraire du domaine (les « DNS »). Le site redirige
   automatiquement l'adresse sans « www » vers celle avec « www ».
   Le domaine `awreaparis.com` est enregistré chez **Wix** (constaté le 26/10/2026 : il affiche
   « Ce domaine n'est pas connecté à un site »). Chez Wix : **Domaines** › `awreaparis.com` ›
   **Gérer les enregistrements DNS**, puis remplacer les enregistrements A (`@`) et CNAME (`www`)
   par les valeurs exactes que Vercel affiche. Ne pas toucher aux enregistrements MX s'il y en a
   (e-mails).
4. Variable à créer : `NEXT_PUBLIC_SITE_URL` = `https://www.awreaparis.com`.

**Vérifier** : le site s'ouvre à son adresse, avec le cadenas du navigateur.

## Étape 2 · Les secrets du site (aucun compte)

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
| `SITE_PRIVE` | `1` tant que le site n'est pas ouvert au public (décision de la créatrice du 26/10/2026) : une visiteuse ne voit que la page « Bientôt », rien n'est indexé, et la créatrice connectée à l'Atelier voit tout le site. Pour l'ouvrir : supprimer la variable, puis **Redeploy** |
| `SITE_PRIVE_CLE` | le lien privé (décision de la créatrice du 01/11/2026) : 32 caractères aléatoires. L'adresse `https://votre-site/?cle=` suivie de cette valeur ouvre tout le site, sans passer par l'Atelier, pendant 30 jours dans le navigateur où elle est ouverte ; les autres visiteuses voient toujours « Bientôt ». Le lien complet s'affiche dans l'Atelier › **Réglages** › **Sécurité**. Changer la valeur ferme d'un coup tous les accès déjà donnés |

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

## Étape 3 · Upstash Redis (mémoire technique)

Indispensable en ligne : sans lui, Vercel efface régulièrement la mémoire du site. C'est là que
vivent les réglages des pièces faits dans l'Atelier, les commandes, les retours, les factures et les
avoirs : à brancher avant toute vraie commande. La sauvegarde de chaque nuit (étape 13) en garde une
copie chiffrée.

1. Vercel › votre projet › **Storage** › **Create Database** › **Upstash for Redis**
   (« Marketplace »).
2. Région : **Frankfurt** (ou une autre région de l'Union européenne). Forfait gratuit pour
   commencer.
3. **Connect** au projet : Vercel crée lui-même `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. Redéployer.

**Vérifier** : Réglages › « Stockage technique » indique « Upstash Redis ».
**Interrupteur** : `STORE_PROVIDER` (`mock` = fichier local).

## Étape 4 · La boutique de la Maison (aucun compte à créer)

La boutique fait partie du site : aucune plateforme de commerce à ouvrir, aucun abonnement. Les
pièces, les commandes, les clientes, les retours, les factures et les avoirs se gèrent dans
l'Atelier. Elle s'appuie sur deux services de ce document : Upstash (étape 3) garde les réglages des
pièces et les commandes, Supabase (étape 5) garde les comptes clientes et une copie de chaque
commande.

### 4.1 Boutique réelle ou démonstration

Le site choisit seul sa façon de tourner :

| Où | Façon de tourner | Ce qui se passe |
| --- | --- | --- |
| Le site en ligne (Vercel, **Production**) et, par défaut, les versions de test de Vercel (**Preview**) | **Boutique réelle** | Aucune commande d'exemple, aucun code de réduction d'essai, aucun accès d'essai à l'Atelier (le mot de passe `atelier-demo` est refusé), aucune remise à zéro. Le paiement passe par Stripe avec une clé **réelle** (`sk_live_…`, étape 4 bis) ; sans elle, le site ne prend aucune commande payée : la page de commande le dit et propose **Écrire à la Maison**. |
| Votre ordinateur, les tests automatiques, et une version de test marquée `BOUTIQUE_DEMONSTRATION` = `1` | **Démonstration** | Des commandes d'exemple et un paiement d'essai, clairement signalés : aucun argent ne bouge. Avec des clés Stripe **de test**, le vrai parcours Stripe en mode test. Atelier › **Réglages** › **Données de démonstration** › **Réinitialiser la démonstration** remet tout à zéro. |

Pour imposer la boutique réelle ailleurs : variable `BOUTIQUE_REELLE` = `1`. La production n'est
jamais en démonstration, quel que soit le réglage.

**Une version de test en démonstration** (pour essayer Stripe en mode test avant l'ouverture) : dans
Vercel › **Settings** › **Environment Variables**, pour **Preview** seulement : `BOUTIQUE_DEMONSTRATION`
= `1`, des clés Stripe **de test**, et un stockage à part (`STORE_PROVIDER` = `mock` et
`CUSTOMERS_PROVIDER` = `mock`, ou une base Upstash distincte). Jamais les clés Upstash et Supabase de
la production : la remise à zéro de la démonstration effacerait les vraies commandes.

**Vérifier** : en bas du menu de l'Atelier, une ligne dit où en est la boutique : « Boutique en
démonstration », « Paiement en ligne pas encore branché » ou « Boutique ouverte ».

### 4.2 Les pièces (créées sur demande, sans stock)

Chaque pièce de la Maison est **créée sur demande**, après la commande, par des artisans français.
Il n'y a donc **aucun stock** : le site ne lit ni n'affiche jamais de quantité, ne dit jamais
« épuisée » ni « dernière pièce », et chaque fiche annonce son **délai de fabrication**. Chaque
taille se commande toujours.

Les sept pièces de la collection sont déjà dans le site : c'est le catalogue de départ
(`data/demo/products.ts`). Ce que vous changez ensuite dans l'Atelier est gardé dans le stockage du
site (Upstash, étape 3) et remplace la valeur du catalogue de départ.

Dans l'Atelier › **Produits**, touchez une pièce pour ouvrir sa fiche :

- **Prix et délai** : le prix, le délai de fabrication (de tant à tant de semaines), les cases
  « provisoire » et la pastille « Nouveau » ;
- **Textes** : le nom, la phrase d'accroche, la description, et ce que Google affiche ;
- **Photos** : en ajouter (huit au plus), choisir la principale, en retirer, écrire le texte lu aux
  personnes qui ne voient pas la photo ;
- en haut de la fiche : mettre la pièce en ligne, en brouillon, l'archiver ou la dupliquer. Une
  pièce en brouillon ou archivée n'apparaît jamais sur le site.

**Ajouter un produit**, en haut de la page Produits, crée une nouvelle pièce, toujours en
brouillon : vous la mettez en ligne depuis sa fiche quand elle est prête (`GUIDE-CREATRICE.md`,
partie 7).

Une pièce sans délai à elle reçoit le délai provisoire de sa catégorie : bodys et tops 2 à 3
semaines, robes 3 à 4 semaines (Atelier › **Réglages** › **Délais de fabrication**).

Ne se règlent pas encore dans l'Atelier : la composition des matières, la doublure, l'entretien, la
taille portée par le mannequin, les étapes de fabrication et l'origine des matières. Les envoyer à
la personne qui s'occupe du site, qui les inscrit dans `data/demo/products.ts` (liste de ce qui
manque dans `LEGAL-A-COMPLETER.md`).

**Version anglaise des fiches** (site sous /en) : les textes anglais des pièces vivent dans
`content/site/en/catalogue-pieces.json` ; un texte absent garde le français.

### 4.2 bis Prix et délais à confirmer par la Maison

Ce tableau donne les sept pièces de la collection **Hypnotic Lace** telles qu'elles sont dans le
catalogue de départ du site. Les valeurs marquées **provisoire** sont signalées dans l'Atelier ›
**Produits** et dans **Réglages** › **Délais de fabrication** › **À confirmer**. Une fois la valeur
confirmée, décocher « provisoire » sur la fiche de la pièce (rubrique **Prix et délai**).

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
de son handle (par exemple `/boutique/body-aura`). Le site, ses redirections, ses liens et les
essais automatiques reposent sur ces sept adresses.

Également à confirmer : les **tailles proposées** (XS, S, M, L et XL pour chaque pièce, en
attendant), et toutes les **photos**, provisoires jusqu'aux prises de vue (`RESSOURCES.md`).
Compositions, doublures, entretien et taille du mannequin restent à fournir :
`LEGAL-A-COMPLETER.md`.

### 4.2 ter La collection Hypnotic Lace

La collection est déjà dans le site (`data/demo/collections.ts`), rien à créer : titre
« Hypnotic Lace », adresse `/collections/hypnotic-lace` (l'ancienne adresse
`/collections/lace-is-more` y mène), les sept pièces dans l'ordre du tableau 4.2 bis, le texte
officiel de la créatrice repris mot pour mot (`ressources-awrea/TEXTES/TEXTE DE COLLECTION.pdf`),
et ses textes pour Google. Sa saison reste vide tant que la Maison ne l'a pas choisie. La collection
ne se modifie pas encore dans l'Atelier : pour la changer, passer par la personne qui s'occupe du
site.

### 4.3 Commandes, livraisons et e-mails

- Chaque commande est gardée dans le stockage du site (Upstash, étape 3) et copiée dans la base
  Supabase (table `orders`, étape 5), rattachée au compte de la cliente par son adresse e-mail.
- Les cinq étapes (commande reçue, en confection, prête, expédiée, livrée) se donnent toutes depuis
  l'Atelier › **Commandes** ; la cliente reçoit l'e-mail de chaque étape. Rien n'est remis en stock
  lors d'un remboursement ou d'une annulation.
- Les e-mails de commande partent du site lui-même (Resend, étape 6), avec la version publiée dans
  l'Atelier › **E-mails** : rien à recopier dans un autre service.
- Livraison, taxes et emballage cadeau se règlent dans `content/settings.ts` : France métropolitaine
  seulement, comme l'article 5 des CGV. Tarifs, seuil de la livraison offerte et prix de
  l'emballage sont à confirmer (`LEGAL-A-COMPLETER.md`).
- Points relais Mondial Relay : aujourd'hui des points simulés, présentés comme tels. Les vrais
  points relais demanderont un accès Mondial Relay de la Maison, pas encore branché.
- Les codes de réduction et la carte cadeau de `content/settings.ts` sont des codes d'essai, et le
  panier les accepte aussi sur la boutique réelle : les retirer ou les remplacer avant d'ouvrir le
  paiement en ligne.

### 4.4 Vérifier

1. Atelier › **Réglages** › **Connexions**, ligne « Paiement en ligne » : « Pas encore branché : la
   boutique ne prend aucune commande payée » sur le site en ligne, « Paiement d'essai
   (démonstration) » ailleurs.
2. La boutique du site affiche les sept pièces, chacune avec son délai de fabrication, dans toutes
   ses tailles.
3. Sur le site en ligne, la page `/commande` dit « Le paiement en ligne n'est pas encore ouvert » et
   propose **Écrire à la Maison**. Sur une version de démonstration, une commande d'essai va
   jusqu'au bout et apparaît dans l'Atelier › **Commandes**, avec son certificat.

## Étape 4 bis · Stripe (paiement en ligne)

Le paiement passe par **Stripe Checkout** (choix de la créatrice) : la cliente règle sur la page
sécurisée de Stripe, jamais sur le site ; aucune donnée bancaire ne passe par le site ni n'est
gardée par la boutique. Stripe confirme chaque paiement au site par un message signé (le webhook) :
la commande passe alors à « Commande reçue », la facture et les certificats partent, et l'Atelier
montre le paiement (Commandes › **Paiements**, et la fiche de chaque commande).

**1. Le compte** (par la créatrice) : [dashboard.stripe.com](https://dashboard.stripe.com/register),
double authentification activée (étape 0), informations de l'entreprise et compte bancaire de
versement renseignés. Tout le paramétrage se fait d'abord en **mode test** (interrupteur en haut à
droite du tableau de bord).

**2. Les moyens de paiement** : **Paramètres** › **Paiements** › **Moyens de paiement** : activer
ceux de l'article 4 des CGV (carte bancaire, Apple Pay, Google Pay, PayPal), sans paiement en
plusieurs fois (`LEGAL-A-COMPLETER.md`). Le site n'impose aucun moyen : la page de Stripe propose
ceux activés ici.

**3. L'apparence** : **Paramètres** › **Image de marque** : logo officiel (`content/brand/assets.ts`),
fond blanc cassé `#F7F6F3`, accent noir `#0A0A0A`, police à empattements. La page de paiement
s'accorde ainsi au site.

**4. Les clés de test** : **Développeurs** › **Clés API** : copier la **clé secrète de test**
(`sk_test_…`). Dans Vercel, pour **Preview** seulement (voir 4.1, version de test en démonstration) :

| Variable | Valeur |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (point 5) |
| `BOUTIQUE_DEMONSTRATION` | `1` |

**5. Le webhook** : **Développeurs** › **Webhooks** › **Ajouter un point de terminaison** :
adresse `https://<adresse de la version de test>/api/webhooks/stripe`, événements :
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`payment_intent.payment_failed`, `charge.succeeded`, `charge.refunded`, `refund.failed`,
`charge.dispute.created`, `charge.dispute.closed`. Choisir la **version d'API** `2026-10-28.endive`
(celle de la bibliothèque Stripe du site : les messages arrivent alors dans la forme qu'il attend).
Copier la **clé de signature** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`. Le site refuse tout message
dont la signature n'est pas la bonne, et ne traite jamais deux fois le même événement.

La version de test doit aussi avoir **son propre stockage Upstash** (variables `KV_REST_API_URL` et
`KV_REST_API_TOKEN` pour Preview, d'une base distincte de la production) : les commandes de test ne
se mêlent jamais aux vraies. En démonstration, seule une clé de test ouvre le paiement par Stripe ;
une clé réelle y est ignorée (le paiement d'essai reste en place).

**6. Essayer en mode test** : sur la version de test, commander une pièce, payer avec la carte de
test `4242 4242 4242 4242` (date future, cryptogramme au choix), puis : la page de confirmation
s'affiche, la commande apparaît « reçue » dans l'Atelier avec son paiement « Réussi », ses
références Stripe et son historique. Essayer aussi une carte refusée (`4000 0000 0000 0002`), un
paiement abandonné (bouton retour de la page Stripe : le panier est intact), et un remboursement
depuis la fiche de la commande (il apparaît dans Stripe, puis dans l'historique).

**7. Le passage en production** : quand tout est juste en mode test, refaire les points 4 et 5 en
**mode réel** dans Stripe (clé `sk_live_…`, webhook vers `https://www.awreaparis.com/api/webhooks/stripe`),
et renseigner ces deux clés pour **Production** dans Vercel, puis redéployer. La boutique réelle
refuse une clé de test, et n'ouvre le paiement qu'avec le stockage partagé Upstash branché (étape 3) :
tant que l'un des deux manque, elle ne prend aucune commande payée, et Réglages dit pourquoi.

**Vérifier** : Atelier › **Réglages** › **Connexions**, ligne « Paiement en ligne (Stripe) » ; et
Atelier › Commandes › **Paiements**.

**Sécurité** : les clés vivent seulement dans Vercel (jamais dans un fichier ni dans un message) ;
la clé secrète ne quitte jamais le serveur ; chaque paiement, chaque page de paiement et chaque
remboursement porte une clé d'idempotence (une demande répétée ne fait qu'une opération) ; un
remboursement passe toujours par la confirmation de la créatrice dans l'Atelier.

## Étape 5 · Supabase (comptes et base clientes)

1. [supabase.com](https://supabase.com/dashboard) › **New project** › nom « awrea-paris », mot de
   passe de la base (le garder dans le gestionnaire), région **West EU (Paris)**.
2. **SQL Editor** › **New query** : copier tout le contenu du fichier
   `supabase/migrations/20261013000000_base_clientes.sql` (dans le dépôt GitHub), coller, **Run**.
   S'il y a plusieurs fichiers dans `supabase/migrations`, les passer **dans l'ordre** des noms,
   en particulier `20261018000000_creation_sur_demande.sql` **avant le déploiement** du site : il
   ajoute le délai de fabrication des commandes (`lead_time`) et le numéro de création des
   certificats (`next_creation_number`), et retire les listes d'attente. Puis
   `20261108000000_boutique_independante.sql`, **au moment de mettre en ligne la boutique
   indépendante** : la colonne qui identifie chaque commande devient `reference` (aucune commande
   n'est effacée), et une colonne qui ne sert plus quitte la table des clientes. Sans cette
   migration, les commandes ne se recopient plus dans Supabase (l'erreur est notée dans les journaux
   du serveur) ; elles restent gardées dans le stockage du site.
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

## Étape 6 · Resend (e-mails du site)

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

## Étape 7 · Brevo (lettre d'information et e-mails automatiques)

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

## Étape 8 · Anthropic (assistante, agents)

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

## Étape 9 · Cloudflare Turnstile (anti-robots)

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

## Étape 10 · Instagram (publications sur la page d'accueil)

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

## Étape 10 bis · Retours, adresses et comptabilité

**Étiquettes de retour prépayées (Colissimo), facultatives.** La créatrice a choisi le 25/10/2026 de
laisser les frais de retour à la cliente, comme l'article 7 des CGV : la cliente reçoit un bordereau
avec l'adresse de l'atelier, et cette étape ne sert pas. Pour offrir un jour le retour depuis la
France : modifier l'article 7, passer `returnLabelPrepaid` à `true` dans `content/settings.ts`, puis
suivre les points ci-dessous. Vous pouvez aussi, à tout moment, déposer une vraie étiquette dans
l'Atelier › Retours (elle lui est envoyée aussitôt).

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

**Vérifier** : sur une version de démonstration, passer une commande d'essai, la marquer expédiée
puis livrée dans l'Atelier, demander un retour depuis le suivi de la commande : l'étiquette PDF
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

## Étape 11 · Mesure d'audience et publicité

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

## Étape 12 · Visibilité hors du site

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
   de vue) n'est jamais envoyée à Google ni à Meta : ni dans ces
   deux flux, ni dans les données structurées des fiches. Ces plateformes ne montreraient pas la
   mention « visuel provisoire » du site, et elles ont leurs propres règles sur les images
   générées (`LEGAL-A-COMPLETER.md`). Tant que toutes les photos des pièces sont provisoires, les
   flux restent donc vides et Merchant Center n'a rien à montrer : c'est voulu. Chaque pièce y
   entre seule dès que ses vraies photographies remplacent les visuels provisoires (Atelier ›
   **Produits**, fiche de la pièce, rubrique **Photos** : ajouter les vraies photos, retirer les
   visuels provisoires).
6. **Instagram** : dans la bio de @awrea.paris, le lien `https://www.awreaparis.com` ; dans
   « Boutons d'action », « Réserver » vers `https://www.awreaparis.com/contact`.

**Vérifier** : Search Console › **Inspection de l'URL** sur la page d'accueil : « L'URL est sur
Google » (quelques jours après l'envoi du sitemap).

## Étape 13 · Maintenance automatique et sauvegardes (GitHub Actions)

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

## Étape 14 · Éditeur visuel et e-mails modifiables

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
3. **Publications programmées** : rien à faire, Vercel Cron les publie (`vercel.json`,
   `CRON_SECRET` de l'étape 2) : une fois par jour sur le forfait Hobby, tous les quarts d'heure
   une fois `*/15 * * * *` remis avec le forfait Pro (étape 1) ; l'éditeur publie aussi celles
   arrivées à échéance dès qu'il s'ouvre.
4. **E-mails** : l'Atelier › **E-mails** montre chaque e-mail tel qu'il arrive (Apple Mail, Gmail,
   Outlook, téléphone, clair et sombre). Les e-mails du site partent directement avec la version
   publiée, e-mails de commande compris (commande reçue, en confection, prête, expédiée) : rien à
   recopier ailleurs. Pour les services d'envoi de lettres :
   - **Brevo** : l'e-mail › **Pour Brevo** télécharge le gabarit ; Brevo › **Campagnes** ›
     **Modèles** › **Nouveau modèle** › **Importer un modèle** › **Importer un fichier HTML**.
   - **Klaviyo** : **Pour Klaviyo** ; Klaviyo › **Content** › **Templates** › **Create Template** ›
     **Import** › **HTML**.
5. **Interrupteur** : `EDITION_STORAGE` (`stockage` en ligne, `fichiers` en local ; vide conseillé).

**Vérifier** : Atelier › **Pages** › **Modifier** sur l'accueil ; changer un mot ; le site public
ne change pas ; **Publier** ; le site public montre le nouveau mot ; **Historique** › la version
précédente › **Remettre en ligne**.

## Étape 15 · Application de l'Atelier (téléphone et notifications)

L'Atelier s'installe sur l'iPhone ou l'Android comme une application, sans App Store ni Google Play :
c'est le même Atelier, à la même adresse secrète, avec la même connexion (mot de passe et code, ou
Face ID). Marche à suivre pour la créatrice : `docs/APPLICATION.md`.

L'installation ne demande rien. Les **notifications** demandent une paire de clés propre à la Maison
(clés VAPID), à créer une fois :

1. Sur un ordinateur où Node.js est installé, dans un terminal : `npx web-push generate-vapid-keys`.
   La commande affiche une clé publique et une clé privée (ou demandez-les à la personne qui vous
   aide : elles ne servent qu'à ce site).
2. Dans Vercel, pour **Production** (et **Preview** si vous voulez essayer sur la version de test) :

| Variable | Valeur |
| --- | --- |
| `VAPID_PUBLIC_KEY` | la clé publique |
| `VAPID_PRIVATE_KEY` | la clé privée (ne la donnez jamais, ne l'écrivez dans aucun fichier) |
| `VAPID_SUBJECT` | facultatif : `mailto:` suivi de l'adresse de l'Atelier |

3. Redéployer. Changer ces clés plus tard oblige chaque téléphone à réactiver ses notifications.

**Vérifier** : Atelier › **Réglages** › ligne « Notifications de l'application » ; puis, sur le
téléphone, Atelier › Réglages › **Application** › **Recevoir les notifications ici** ›
**Envoyer une notification d'essai**.

**Sécurité** : une notification ne montre jamais le nom, l'adresse ni le téléphone d'une cliente ;
rien n'est gardé sur le téléphone ; **Fermer toutes les sessions** (Réglages) coupe aussi les
notifications de tous les appareils, à faire aussitôt si un téléphone est perdu.

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
Vercel, mettre l'interrupteur du service à `mock`, par exemple `STORE_PROVIDER=mock` et
`CUSTOMERS_PROVIDER=mock` pour garder les commandes et les comptes d'essai à part (étape 4.1). La
production n'est pas concernée.
