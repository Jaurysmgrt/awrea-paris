# Refonte de l'Atelier : audit et plan

Brief de la créatrice du 03/11 et du 07/11 (« Shopify simplifié, intelligent et gratuit »).
Audit du 07/11/2026, fait sur le code de `main` (2b5d375) par quatre relectures séparées (pages et
ergonomie, données et intégrations, sécurité, IA et agents), puis vérifié à la main sur les points
graves. Ce document sert de carte et de feuille de route ; il est tenu à jour à chaque lot.

## 1. Carte de l'existant

| Domaine | Ce qui existe | État |
|---|---|---|
| Accès | adresse secrète (`ADMIN_PATH`), mot de passe et code, Face ID, blocage, alertes | solide |
| Accueil | « À faire », 4 chiffres (ventes 7 jours, confections, rendez-vous, messages), galerie des pièces | opérationnel, peu de chiffres |
| Produits | `catalogue` : prix, délai, « provisoire », « nouveau » ; nouvelle pièce rédigée par l'agent Catalogue (Shopify Admin `productCreate`) | partiel : ni brouillon, ni aperçu, ni modification des textes et photos, ni duplication, ni archivage |
| Commandes | liste (60 au plus), fiche, étape suivante avec e-mail, bon, facture, certificat | partiel : ni recherche, ni filtre, ni notes internes, ni historique |
| Clientes | tableau des statistiques (Supabase ou démonstration), 3 catégories | partiel : pas de fiche, pas d'ajout, pas de filtre |
| Promotions | codes appliqués au panier (démonstration ou Shopify) | aucune page de création |
| Site | Édition (textes, photos, blocs, pages, brouillons, programmation, historique), photos provisoires | solide |
| Lettre et e-mails | lettre, inscrites, envoyés, e-mails automatiques modifiables | solide |
| Rendez-vous, messages, retours, avis, factures, certificats, avant-premières | pages dédiées | opérationnels |
| IA | assistante des clientes (outils, mode sans clé), 6 agents, 19 rôles quotidiens, propositions à valider, journal | solide, mais aucun assistant de gestion |
| Automatisations | crons (`vercel.json`), 4 autonomies réglables, envois automatiques | pas d'interrupteur pour les crons et les envois |

Sources des données : Shopify (catalogue, commandes, clientes), Supabase (comptes clientes, vue
`customer_stats`), stockage clé-valeur `lib/store` (Upstash ou fichier), Resend (e-mails),
Claude (`lib/ai`). Sans clé, chaque service passe en démonstration.

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
   `change_price` en demande une. Corrigé au lot 2b : une pièce naît toujours en brouillon (démonstration
   et Shopify), la créatrice la met en ligne depuis sa fiche ; l'assistant (lot 4) ne recevra jamais
   `publish_product`.
5. Les filtres des réponses aux clientes (`safeOutbound`, `suspicious`) ne vivent que dans l'agent
   Service client, pas dans `perform()`.

### Données
1. Une pièce créée dans Shopify n'est publiée sur aucun canal de vente : probablement invisible sur
   le site (vérifié : aucun `publishablePublish`). Il faudra la permission `write_publications`.
2. Si Shopify ne répond pas, les commandes et le catalogue de démonstration remplacent les vrais
   sans le dire : l'Atelier doit l'afficher clairement, ou ne rien afficher.
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

Chaque lot : relecture indépendante, lint, types, tokens, écriture, tests unitaires, base et
Playwright, puis demande de fusion.

| Lot | Contenu | Fini quand |
|---|---|---|
| 0 | Sécurité préalable : session revérifiée sur les 4 routes, contrôle d'origine sur l'API de l'Atelier, `decide()` atomique, filtre des réponses dans `perform()` (fait le 07/11) | tests qui échouent avant et passent après |
| 1 | (fait le 07/11) Menu clair et nouvelle Vue d'ensemble : chiffre d'affaires du mois et comparaison, commandes à traiter, nouvelles clientes, dernières commandes, pièces les plus vendues, rendez-vous, activité récente, « Que souhaitez-vous faire ? », actions prioritaires ; données réelles seulement | parcours Playwright de l'accueil et du menu, sur téléphone et ordinateur |
| 2 | (2a fait le 08/11 : liste, fiche, textes, statut, copie ; 2b fait le 08/11 : aperçu des brouillons, création en quatre étapes toujours en brouillon, photos ; 2c à venir : collection, tailles, matières et entretien, propositions de l'IA sur une fiche existante) Produits : fiche modifiable (textes, photos, collection, tailles), ajout en étapes courtes, brouillon ou publié, aperçu, dupliquer, archiver, propositions de l'IA sans rien inventer ; publication Shopify sur le canal du site | création, duplication, archivage testés en démonstration |
| 3 | Commandes (statuts de la confection, recherche, filtres, notes internes, historique, actions rapides confirmées) et clientes (fiche, catégories nouvelle, régulière, fidèle, inactive, filtres, ajout) | fiches et filtres testés |
| 4 | AWREA ASSISTANT, agents, page Automatisations avec interrupteurs, Promotions (codes privés), Statistiques | demandes types du brief testées avec et sans clé |

## 5. Ce qui demande une clé ou une configuration

| Fonction | Nécessaire |
|---|---|
| Vraies commandes, produits, codes de réduction | Shopify Admin (`write_products`, `write_publications`, `write_files`, `write_discounts`, `read_orders`, `write_orders`) |
| Fiches clientes avec comptes | Supabase |
| Assistant qui comprend les phrases libres, rédaction | clé Claude (`ANTHROPIC_API_KEY`), payante à l'usage ; plafond quotidien prévu au lot 4 |
| E-mails | Resend |
| Données durables sur Vercel | Upstash (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) |

## 6. Choix faits par défaut (modifiables)
- **Promotions** : codes privés, donnés à une cliente, sans prix barré ni bannière (règle de luxe
  discret de `MARQUE.md`).
- **Menu** : clair, ivoire, comme le demande le brief.
- **Vocabulaire** : « Produits » dans l'Atelier, comme dans le brief ; « pièce » reste la règle sur
  le site public.
