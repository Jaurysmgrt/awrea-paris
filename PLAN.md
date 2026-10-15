# PLAN — Awrea Paris

> Référence unique : le **cahier des charges complet** (13 octobre 2026). État détaillé : `ETAT.md`.
> Décisions : `DECISIONS.md`. Marque : `MARQUE.md`. Journal : `JOURNAL.md`. Ancien plan :
> `docs/historique/PLAN-avant-cahier-complet.md`.
> Ordre imposé : **d'abord une boutique complète et fonctionnelle (même simulée), ensuite les effets
> avancés, ensuite les extras.** Une branche par grand chantier, fusionnée dans `claude/awrea-site`
> quand tout est vert. Si les limites d'utilisation sont atteintes, les équipes travaillent une par une.

## Phase A — Mode de travail et fondations (faite le 13/10)

- [x] Sauvegarde de l'état antérieur (`archive/avant-nouvelle-da`), audit (`ETAT.md`), plan priorisé
- [x] `DECISIONS.md`, `ACTIVATION.md` (comptes à créer, pas à pas, compréhensible sans être développeur)
- [x] Interrupteurs par service (`COMMERCE_PROVIDER=mock|shopify`, etc.) avec bascule automatique sur
      la simulation quand la clé manque, listés dans `.env.example`, visibles dans l'Atelier ;
      nouveaux accès Shopify (jeton privé Headless, jetons Admin de 24 h renouvelés seuls)
- [x] Polices hébergées dans le dépôt (aucun appel à Google Fonts), logo provisoire SVG noir et blanc
      vectorisé, favicon et icônes de l'application
- [x] Une durée et une courbe pour toutes les animations (contrôlé par l'audit) ; `MARQUE.md` complété
      (univers, collection, rubriques Instagram)
- [x] En avance sur la phase B : Microsoft Clarity et pixel TikTok après consentement, régénération du
      catalogue par webhooks Shopify, renouvellement automatique du jeton Instagram

## Phase H — Écriture humaine, édition sans code, accès admin, e-mails (consignes du 14/10, prioritaires)

Ces consignes passent avant la suite de la phase B : les pages restantes (rendez-vous, sur mesure,
Cercle…) seront construites directement sur les documents de contenu et l'éditeur.

1. [x] **Contrôle d'écriture** : règles communes (`lib/writing/rules.ts`), script
   `npm run audit:ecriture` (sources et pages rendues), dans la CI ; corrections typographiques
   sûres appliquées à tout le code (`--fix`).
2. [x] **Maintenance et agents** : contrôle dans le bilan de nuit, textes des agents nettoyés et
   contrôlés (une formulation interdite fait d'une publication une proposition), réponses de
   l'assistante nettoyées, contrôle nocturne des textes stockés.
3. [x] **Accès admin invisible** : adresse secrète, aucun lien, `noindex` et `robots.txt`, comptes
   autorisés, double authentification, blocage après échecs, alerte e-mail à chaque connexion,
   contrôles ajoutés à l'audit de sécurité.
4. [ ] **Contenus centralisés** : tous les textes et images du site dans `content/site/<langue>/`,
   lus par un seul accès (`lib/edition/`), plus aucun texte en dur dans les composants.
5. [x] **Éditeur visuel « Édition »** : textes cliquables sur la page, images par glisser-déposer
   (recadrage, déclinaisons, point focal, texte alternatif), blocs de mise en page, modèles de pages,
   aperçus téléphone, tablette, ordinateur, brouillons, publication programmée, historique et retour
   en un clic, garde-fous, version anglaise à côté, contrôle d'écriture, guide d'accueil.
6. [ ] **Réécriture complète** dans la voix de la créatrice (Plume → Détecteur IA → Lecture à voix
   haute → Typographe → Cohérence), consignée dans `JOURNAL.md` ; zéro erreur au contrôle.
7. [x] **E-mails modifiables sans code** : bibliothèque de blocs dans la DA, rendu Gmail, Apple Mail,
   Outlook, mobile, clair et sombre ; export compatible Brevo et Klaviyo ; galerie d'aperçu locale.
8. [x] **Nouveaux agents** : équipes de construction (`.claude/agents/`) et rôles de gestion
   quotidienne dans l'Atelier.
9. [ ] Documentation : `ACTIVATION.md` (éditeur, recopie Git, e-mails : fait), `GUIDE-CREATRICE.md`
   (« Modifier un texte, une image, une page, un e-mail », avec captures : après l'application du
   design, pour que les captures montrent le site final).
10. [ ] Migration des e-mails existants vers les documents d'e-mails (avec la centralisation, point 4).

## Phase B — Boutique complète et fonctionnelle (mode simulé)

1. **Fiche produit** : fiche de traçabilité (origine des matières, temps de fabrication, exemplaires),
   partage, barre d'achat fixe sur mobile.
2. **Panier et commande** : suggestions complémentaires, Shop Pay, autocomplétion d'adresse
   (adaptateur), Mondial Relay et retrait à l'atelier, droits et taxes calculés à l'avance, date de
   livraison d'un cadeau, prix masqué sur le bordereau.
3. **Après la commande** : suivi de commande sans compte, retours et échanges de taille en
   libre-service avec étiquette, factures PDF conformes et export comptable mensuel, parrainage
   discret, sur-mesure (demande, mensurations, devis depuis l'Atelier).
4. **Pages** : Archives (« Pièce adoptée »), Sur mesure, Le Cercle, Rendez-vous (agenda), Points de
   vente et pop-up, Guide des tailles, Entretien des matières, Glossaire, Maintenance, Déclaration
   d'accessibilité, Plan du site, Outfits (rubriques Instagram), kit presse.
5. **Clientes et e-mails** : export CSV, statut VIP du Cercle, e-mails d'expédition, de livraison, de
   navigation abandonnée, invitations du Cercle, double confirmation de la newsletter, liens WhatsApp /
   message Instagram, génération des QR codes en lot.
6. **Contenus modifiables** (CMS simple dans l'Atelier, adaptateur métaobjets Shopify / Sanity) ;
   régénération des contenus à la modification (celle du catalogue par webhooks Shopify est faite).
7. **Mesure et suivi** : adaptateur Sentry, LocalBusiness, images de partage par pièce.

## Phase C — Design (processus multi-agents)

Directions « dentelle », « atelier », « édition » (une par une) → critique et gardien de la marque →
fusion choisie et documentée → `DESIGN.md` avec captures → application à tout le site avec les
touches propres à Awrea (motif de dentelle, croquis et annotations, monogramme décliné, numéros
d'édition, un détail inattendu par page) et la grille éditoriale asymétrique de la boutique.
À reprendre à la fusion : les survols qui passaient au doré n'ont plus d'effet visible sur fond clair
(la couleur d'accent vaut désormais celle du texte) ; les remplacer par l'inversion noir / blanc cassé
ou le filet fin (`MARQUE.md`).

## Phase D — Effets avancés

Écran d'ouverture (monogramme au trait noir, première visite), transition grille → fiche (View
Transitions), vue 360°, ambiance selon l'heure de Paris, ambiance sonore optionnelle, vibrations,
film de collection en chapitres, lookbook feuilletable et PDF, PWA avec notifications, styliste par
photo.

## Phase E — International

Version anglaise complète, détection de la langue et de la devise (euro, livre, dollar, franc suisse),
sélecteur discret, hreflang.

## Phase F — Équipes au travail (une par une)

Contenu (trois voix → critique → rédacteur final, e-mails compris) · E-commerce (cliente mystère) ·
SEO et IA · Sécurité (attaquant éthique jusqu'à zéro faille) · Qualité (320 → 2560 px, WCAG 2.2 AA,
sous-titres, Lighthouse 95+, budget de poids, tests visuels de non-régression) · Juridique (Cercle,
parrainage, accessibilité, prestataires) · Assistant IA (centaines de conversations).

## Phase G — Livraison

`GUIDE-CREATRICE.md` illustré, `ACTIVATION.md` complet, README en une commande, `REVUE.md` (jury
Awwwards) entièrement corrigée, contrôle final de chaque section du cahier des charges, réunion de
synthèse dans `JOURNAL.md`.
