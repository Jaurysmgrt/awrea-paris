# Refonte de l'Atelier : audit et plan

Brief de la créatrice du 03/11 et du 07/11 : une gestion de boutique simple, intelligente et
gratuite. Depuis le 08/11, la boutique est entièrement à la Maison, sans plateforme de commerce
extérieure (section 6).
Audit du 07/11/2026, fait sur le code de `main` (2b5d375) par quatre relectures séparées (pages et
ergonomie, données et intégrations, sécurité, IA et agents), puis vérifié à la main sur les points
graves. Ce document sert de carte et de feuille de route ; il est tenu à jour à chaque lot.

## 1. Carte de l'existant

| Domaine | Ce qui existe | État |
|---|---|---|
| Accès | adresse secrète (`ADMIN_PATH`), mot de passe et code, Face ID, blocage, alertes | solide |
| Accueil | « À faire », 4 chiffres (ventes 7 jours, confections, rendez-vous, messages), galerie des pièces | opérationnel, peu de chiffres |
| Produits | `catalogue` : prix, délai, « provisoire », « nouveau » ; nouvelle pièce rédigée par l'agent Catalogue | partiel : ni brouillon, ni aperçu, ni modification des textes et photos, ni duplication, ni archivage |
| Commandes | liste (60 au plus), fiche, étape suivante avec e-mail, bon, facture, certificat | partiel : ni recherche, ni filtre, ni notes internes, ni historique |
| Clientes | tableau des statistiques (Supabase ou démonstration), 3 catégories | partiel : pas de fiche, pas d'ajout, pas de filtre |
| Promotions | codes appliqués au panier (codes d'essai de `content/settings.ts`) | aucune page de création |
| Site | Édition (textes, photos, blocs, pages, brouillons, programmation, historique), photos provisoires | solide |
| Lettre et e-mails | lettre, inscrites, envoyés, e-mails automatiques modifiables | solide |
| Rendez-vous, messages, retours, avis, factures, certificats, avant-premières | pages dédiées | opérationnels |
| IA | assistante des clientes (outils, mode sans clé), 6 agents, 19 rôles quotidiens, propositions à valider, journal | solide, mais aucun assistant de gestion |
| Automatisations | crons (`vercel.json`), 4 autonomies réglables, envois automatiques | pas d'interrupteur pour les crons et les envois |

Sources des données (à jour du 08/11) : la boutique de la Maison (catalogue de départ
`data/demo/`, réglages des pièces, commandes, retours, factures et avoirs dans le stockage
clé-valeur `lib/store`, Upstash ou fichier), Supabase (comptes clientes, copie des commandes, vue
`customer_stats`), Resend (e-mails), Claude (`lib/ai`). Sans clé, chaque service passe en
simulation ; la boutique tourne en boutique réelle ou en démonstration (`lib/config/boutique.ts`).

## 2. Problèmes trouvés

### Sécurité (à corriger avant l'assistant)
1. `factures/[number]`, `factures/export`, `retours/[id]` (remboursement) et
   `retours/[id]/etiquette` ne revérifient pas la session : seule la redirection de `proxy.ts` les
   protège (vérifié).
2. Le contrôle d'origine (CSRF) de `proxy.ts` ne couvre que `/api/…` : l'API de l'Atelier, servie
   sous l'adresse secrète, n'est protégée que par le cookie `SameSite=Strict` (vérifié).
3. `decide()` (validation d'une proposition) n'est pas atomique : deux clics peuvent exécuter deux
   fois un remboursement ou un envoi (vérifié).
4. `publish_product` mettait une pièce en ligne à un prix libre sans validation (vérifié), alors que
   `change_price` en demande une. Corrigé au lot 2b : une pièce naît toujours en brouillon, la créatrice la
   met en ligne depuis sa fiche ; l'assistant (lot 4) ne recevra jamais
   `publish_product`.
5. Les filtres des réponses aux clientes (`safeOutbound`, `suspicious`) ne vivent que dans l'agent
   Service client, pas dans `perform()`.

### Données
1. (Sans objet depuis le 08/11 : les pièces vivent dans la base de la Maison, une pièce mise en
   ligne dans l'Atelier paraît aussitôt sur le site.)
2. Les commandes d'exemple ne doivent jamais passer pour de vraies commandes. Réglé le 08/11 : sur
   la boutique réelle, aucun exemple n'est montré ; en démonstration, l'Atelier le signale
   (`lib/config/boutique.ts`).
3. Les statistiques de visites passent en données de démonstration quand il y a peu de mesures :
   à ne jamais montrer comme vraies.
4. Sans Upstash sur Vercel, le stockage vit dans un fichier temporaire : compteurs de factures et de
   retours fragiles. À vérifier dans la configuration Vercel (hors de portée du code).

### Ergonomie
1. 21 entrées de menu, des libellés différents des titres de page.
2. Les listes ne mènent nulle part (pas de fiche cliente, pièce modifiable seulement en prix et
   délai).
3. Une seule façon de créer une pièce, en bas de page, publiée aussitôt.
4. Jargon visible (noms de variables, ACTIVATION.md, Supabase, Resend, « ms »).
5. Des envois aux clientes partent sans confirmation (étape suivante, réponse, envois du jour).
6. Doublons : À valider, Journal, e-mails automatiques, photos provisoires, lanceurs d'agents.

## 3. Architecture cible

### Navigation (barre latérale claire, ivoire)
- **Accueil** : Vue d'ensemble.
- **Ma boutique** : Produits (Avant-premières, Certificats), Commandes (Retours, Factures),
  Clientes (Avis), Promotions.
- **Mon site** : Pages, Contenus et visuels, Lettre et e-mails.
- **Mon activité** : Statistiques, Rendez-vous, Messages.
- **Intelligence artificielle** : Mon assistant, À valider, Agents et journal.
- **Paramètres** : Réglages.

Les sous-entrées n'apparaissent que dans leur rubrique ; le nombre d'éléments à traiter remonte sur
la rubrique. Aucune rubrique vide : une entrée n'apparaît que le jour où sa page existe.

### Principe de l'IA
- **Un seul chemin pour agir** : l'assistant, les agents et les automatisations passent tous par
  `perform()` (politique, journal, propositions). Jamais d'appel direct aux exécuteurs.
- **AWREA ASSISTANT** : bouton discret en bas à droite de chaque page. Les capacités sont des
  fonctions de `lib/` exposées deux fois : en outils pour Claude et dans un routeur simple sans IA
  (« commandes en retard », « chiffre du mois », « à faire aujourd'hui »). Sans clé, l'Atelier et
  l'assistant simple fonctionnent.
- **Agents spécialisés** : boutique, commandes, clientes, marketing, contenu, analyse, chacun avec
  des outils réels déjà présents (catalogue, commandes-confection, service-client, contenu, seo,
  rapport), appelés par l'assistant selon la demande.
- **Argent et irréversible** : toujours une proposition à valider, résumé écrit par le serveur à
  partir des paramètres (montant, numéro, destinataire), jamais par l'IA. Aucune adresse e-mail ni
  aucun lien fourni par l'IA.

## 4. Plan par lots

Chaque lot : relecture indépendante, lint, types, tokens, écriture, tests unitaires, base et
Playwright, puis demande de fusion. Mis à jour le 08/11 avec le complément du MASTER PROMPT
(sections 3 à 22) et les choix de la créatrice (section 6). Ordre de travail retenu : 3, puis 4,
puis 2c (la quantité limitée, la collection et les tailles se règlent plus simplement sur la
boutique propre), puis 5, 6 et 7.

| Lot | Contenu | Fini quand |
|---|---|---|
| 0 | (fait le 07/11) Sécurité préalable : session revérifiée sur les 4 routes, contrôle d'origine sur l'API de l'Atelier, `decide()` atomique, filtre des réponses dans `perform()` | tests qui échouent avant et passent après |
| 1 | (fait le 07/11) Menu clair et Vue d'ensemble : chiffre d'affaires du mois, commandes à traiter, nouvelles clientes, dernières commandes, pièces les plus vendues, rendez-vous, activité, actions prioritaires ; données réelles seulement | parcours de l'accueil et du menu, téléphone et ordinateur |
| 2a | (fait le 08/11) Produits : liste, recherche, filtres, fiche, textes, statut, copie, archive | parcours testés en démonstration |
| 2b | (fait le 08/11) Aperçu des brouillons sur la vraie page, création en quatre étapes toujours en brouillon, photos (ajout, ordre, texte, retrait) | parcours testés en démonstration |
| 2c | Fiche complète : collection, tailles, matières, entretien, coupe ; quantité limitée par pièce (alerte quand il en reste peu, fermeture à zéro) ; propositions de l'IA sur une fiche existante, sans rien inventer | réglages enregistrés et visibles sur le site |
| 3 | (fait le 08/11 : 3a commandes, 3b clientes) Commandes (statuts de la confection, recherche, filtres par statut et période, notes internes, historique, annulation et remboursement confirmés) et clientes (fiche, historique, total des achats, catégories nouvelle, régulière, fidèle, inactive, notes, RGPD : export et effacement) | fiches, filtres et historique testés |
| 4 | Boutique propre. Fait le 08/11 : plus aucune plateforme de commerce extérieure ; pièces dans le catalogue de départ et le stockage du site ; commandes copiées dans la table `orders` de Supabase (colonne `reference`, migration `20261108000000_boutique_independante.sql`) ; boutique réelle ou démonstration (`lib/config/boutique.ts`). Paiement par Stripe Checkout intégré le 08/11 (`lib/paiement`) : page de paiement hébergée, webhook signé, idempotence, remboursements par Stripe depuis la fiche, les agents validés et les retours, page Atelier › Paiements. Reste : l'essai de bout en bout en mode test avec le compte Stripe de la Maison | commande de bout en bout en mode test Stripe |
| 5 | Agents et autonomie : file de tâches (planifiées et déclenchées par un événement, relances, statuts, journal), agents Boutique, Commandes, Clientes, Marketing, Analytics et Coordinateur (mission, outils, permissions, mémoire de travail, passage de relais), interrupteur et limite par agent | tâches réellement déclenchées et suivies, validations en attente respectées |
| 6 | IA et coûts : modèle par agent (économique pour les tâches simples), budget mensuel et quotidien, consommation et coût estimé, historique des appels, alerte, suspension des tâches au plafond ; AWREA ASSISTANT branché sur les vraies données | budget atteint : tâches suspendues et créatrice prévenue ; boutique intacte sans IA |
| 7 | Pilotage : filtres de période (aujourd'hui, 7 jours, 30 jours, 12 mois, période choisie), panier moyen, évolution des ventes, performances des pièces ; Promotions (codes privés, prix de vente privée des avant-premières) ; Statistiques | chiffres réels seulement, testés par période |

## 5. Ce qui demande une clé ou une configuration

| Fonction | Nécessaire |
|---|---|
| Boutique propre et paiement (lot 4) | compte Stripe créé par la créatrice (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) ; frais par vente, sans abonnement |
| Fiches clientes et copie des commandes | Supabase |
| Assistant qui comprend les phrases libres, rédaction, agents | clé Claude (`ANTHROPIC_API_KEY`), payante à l'usage ; budget réglable au lot 6 |
| E-mails | Resend |
| Données durables sur Vercel (réglages des pièces, commandes, retours, factures) | Upstash (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) |

## 6. Choix de la créatrice

Le 08/11, en réponse au complément du MASTER PROMPT :
- **Paiement** : boutique propre et paiement par Stripe, sans abonnement. Aucune donnée bancaire sur
  le site : Stripe Checkout encaisse. Le compte Stripe est créé par la créatrice. Précision du même
  jour : aucune connexion à une plateforme de commerce extérieure, même optionnelle ; tant que
  Stripe n'est pas branché, la boutique réelle ne prend aucune commande payée.
- **Stocks** : les pièces restent créées sur demande ; une quantité limitée peut être fixée pièce par
  pièce (tissu rare, édition courte), avec une alerte quand il en reste peu et une fermeture à zéro.
- **Promotions** : codes privés donnés à une cliente, et prix de vente privée réservé aux inscrites
  d'une avant-première ; rien de barré sur le site public (règle de luxe discret de `MARQUE.md`).

Choix plus anciens, toujours valables : menu clair et ivoire ; « Produits » dans l'Atelier, « pièce »
sur le site public.

## 7. Complément du MASTER PROMPT : où en est chaque section (08/11)

| Section | Existant | À faire (lot) |
|---|---|---|
| 4. Architecture | Next.js 16, boutique de la Maison en deux modes (boutique réelle, démonstration), Supabase pour les clientes et la copie des commandes, stockage clé-valeur, paiement Stripe Checkout, IA facultative | essai Stripe en mode test avec le compte de la Maison (4) |
| 5. Tableau de bord | Vue d'ensemble du lot 1 (chiffre du mois, commandes, clientes, pièces vendues, activité, alertes et propositions) | filtres de période, panier moyen, évolution (7) |
| 6. Produits | lots 2a et 2b : liste, fiche, textes, photos et ordre, statut, copie, aperçu | collection, tailles, quantité limitée, matières (2c) ; suppression définitive après confirmation (2c) |
| 7. Commandes | lot 3 : liste, recherche, étapes et période, fiche, étape suivante avec e-mail, bon, facture, notes, historique, annulation et remboursement confirmés, une seule fois par commande | rien de bloquant |
| 8. Clientes | lot 3 : liste, recherche, catégories, fiche, historique, total des achats, notes, données remises, effacement gardé | rien de bloquant |
| 9. Contenu | éditeur « Édition » : textes, photos, blocs, pages, brouillons, aperçu, programmation, historique | rien de bloquant |
| 10. Assistant | assistante des clientes ; propositions et journal des agents | AWREA ASSISTANT de gestion (6) |
| 11. Agents | 6 agents et 19 rôles quotidiens, propositions à valider, journal | missions et permissions par agent, mémoire, passage de relais, Coordinateur (5) |
| 12. Autonomie | tâches planifiées Vercel (chaque jour et chaque semaine), événement « commande créée » | file de tâches, relances, déclencheurs, statuts (5) |
| 13. Permissions | `lib/agents/policy.ts` : argent et irréversible toujours validés ; autonomies réglables | interrupteur et limite par agent (5) |
| 14. Modèles et coûts | un modèle Claude réglable, mode sans clé | modèle par agent, budget, consommation, alertes (6) |
| 15 à 18. Design, simplicité, sécurité, qualité | audits de tokens et d'écriture, tests Playwright et axe, sécurité du lot 0, relectures indépendantes | à tenir à chaque lot |

## 8. Ressources réellement utilisables (vérifiées le 08/11)

- **Sous-agents du projet** (`.claude/agents/`, 50) : relecteur de code, attaquant éthique,
  testeuse non technique, testeurs (accessibilité, responsive, performance, homogénéité), équipes
  d'écriture, de design et de SEO, spécialiste de la boutique, chef de projet. Utilisés pour chaque lot :
  relecture indépendante du lot 2a et du lot 2b (relecteur de code).
- **Connecteurs utilisés** : GitHub (demandes de fusion, vérifications, fusion), Playwright
  (parcours et captures sur téléphone et ordinateur).
- **Compétences (Skills)** : « no-ui-slop » pour les écrans de l'Atelier ; avant le lot 6, la
  référence de l'API Claude (modèles, prix, cache) sera lue avant d'écrire le moindre réglage de
  modèle ou de budget.
- **Indisponibles ici** : analyse de sécurité HawkScan (clé `HAWK_API_KEY` absente) ; plusieurs
  connecteurs refusés par le réseau de l'environnement ; aucun connecteur Stripe ni Supabase (les
  tests de la base passent par PostgreSQL embarqué, `npm run test:db`).
