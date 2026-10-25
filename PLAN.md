# PLAN · Awrea Paris

> Références : le **cahier des charges complet** (13 octobre 2026) et, au-dessus de tout, les
> **ressources officielles de la Maison** (`ressources-awrea/`, `RESSOURCES.md`, depuis le 15/10).
> État détaillé : `ETAT.md`. Décisions : `DECISIONS.md`. Marque : `MARQUE.md`. Journal : `JOURNAL.md`.
> Ancien plan : `docs/historique/PLAN-avant-cahier-complet.md`.
> Ordre imposé : **d'abord une boutique complète et fonctionnelle (même simulée), ensuite les effets
> avancés, ensuite les extras.** Une branche par grand chantier, fusionnée dans `claude/awrea-site`
> quand tout est vert. Si les limites d'utilisation sont atteintes, les équipes travaillent une par une
> ou par lots de fichiers séparés (`docs/EQUIPES.md`).

## Phase A · Mode de travail et fondations (faite le 13/10)

- [x] Sauvegarde de l'état antérieur (`archive/avant-nouvelle-da`), audit (`ETAT.md`), plan priorisé
- [x] `DECISIONS.md`, `ACTIVATION.md` (comptes à créer, pas à pas, compréhensible sans être développeur)
- [x] Interrupteurs par service (`COMMERCE_PROVIDER=mock|shopify`, etc.) avec bascule automatique sur
      la simulation quand la clé manque, listés dans `.env.example`, visibles dans l'Atelier ;
      nouveaux accès Shopify (jeton privé Headless, jetons Admin de 24 h renouvelés seuls)
- [x] Polices hébergées dans le dépôt (aucun appel à Google Fonts) ; une durée et une courbe pour
      toutes les animations (contrôlé par l'audit) ; `MARQUE.md` complété
- [x] En avance sur la phase B : Microsoft Clarity et pixel TikTok après consentement, régénération du
      catalogue par webhooks Shopify, renouvellement automatique du jeton Instagram

## Phase H · Écriture humaine, édition sans code, accès admin, e-mails (consignes du 14/10)

1. [x] **Contrôle d'écriture** : règles communes (`lib/writing/rules.ts`), script
   `npm run audit:ecriture` (sources et pages rendues), dans la CI ; textes officiels de la
   créatrice exemptés (seule la typographie y est contrôlée).
2. [x] **Maintenance et agents** : contrôle dans le bilan de nuit, textes des agents nettoyés et
   contrôlés, réponses de l'assistante nettoyées, contrôle nocturne des textes stockés.
3. [x] **Accès admin invisible** : adresse secrète, aucun lien, `noindex` et `robots.txt`, comptes
   autorisés, double authentification, blocage après échecs, alerte e-mail à chaque connexion.
4. [ ] **Contenus centralisés** : tous les textes et images du site dans `content/site/<langue>/`,
   lus par un seul accès (`lib/edition/`). Les pages refaites pour les ressources officielles passent
   aux documents JSON (registres par équipe) ; reste à contrôler qu'aucun texte en dur ne subsiste.
5. [x] **Éditeur visuel « Édition »** : textes cliquables, photos par glisser-déposer, blocs, modèles
   de pages, aperçus, brouillons, publication programmée, historique et retour en un clic,
   garde-fous, version anglaise à côté, contrôle d'écriture, guide d'accueil.
6. [ ] **Réécriture complète** dans la voix de la créatrice (Plume → Détecteur IA → Lecture à voix
   haute → Typographe → Cohérence) : faite le 15/10 ; à reprendre sur les textes qui parlaient de
   stock, de séries ou de « fait main à Paris » (balayage éditorial en cours).
7. [x] **E-mails modifiables sans code** : blocs dans la DA, rendu Gmail, Apple Mail, Outlook,
   mobile, clair et sombre ; export Brevo, Klaviyo, Shopify.
8. [x] **Nouveaux agents** : équipes de construction (`.claude/agents/`) et rôles de gestion
   quotidienne dans l'Atelier.
9. [ ] **Documentation** : `ACTIVATION.md` à jour du modèle sur demande ; `GUIDE-CREATRICE.md`
   premier jet complet (24/10), passages « à vérifier » et captures à ajouter au contrôle final.
10. [ ] Migration des e-mails existants vers les documents d'e-mails (e-mails des étapes de commande
    créés en documents ; reste le contrôle des autres).

## Phase R · Ressources officielles de la Maison (depuis le 15/10, en cours)

Intégration des ressources remises par la créatrice, qui priment sur tout : polices, logo,
maquettes, textes, pièces, CGV et mentions légales. Équipes en parallèle, un lot de fichiers chacune
(`docs/EQUIPES.md`).

1. [x] Copie du Drive dans `ressources-awrea/`, `RESSOURCES.md` (contenu, usage, droits), polices
   Fraunces 72pt Italic et Cormorant Garamond en WOFF2, logo et monogramme officiels, icônes,
   photos provisoires recadrées et déclinées (15/10).
2. [ ] **Design system et catalogue** : langage des maquettes (`DESIGN.md`), sept pièces de
   « Hypnotic Lace » avec prix, délais de fabrication et indicateurs provisoires ; redirection de
   « Lace is more ».
3. [ ] **En-tête et pied de page** des maquettes (cinq entrées, quatre colonnes).
4. [ ] **Pages de la Maison** : accueil, La Maison (texte À propos et portrait), L'Atelier (éthique de
   production), La commande sur demande (`/sur-commande`), Guide des tailles (`/guide-des-tailles`),
   Contact (maquette FORMULAIRE CONTACT).
5. [ ] **Textes juridiques** : CGV et mentions légales officielles mot pour mot, registre légal,
   écarts notés dans `LEGAL-A-COMPLETER.md`.
6. [ ] **Suivi des commandes** : cinq étapes (« Commande reçue », « En confection », « Prête »,
   « Expédiée », « Livrée »), e-mail à chaque étape, fin de confection prévue, commandes en retard
   signalées ; numéro de création sur le certificat.
7. [ ] **Avant-premières** (anciens drops) : dates en toutes lettres, sans compte à rebours ni rareté.
8. [ ] **Agents et assistante** au modèle sur demande (plus de stock ; commandes et confection).
9. [ ] **Photos provisoires dans l'éditeur** : pastille, liste des photos à remplacer, mention
   « visuel provisoire » sur le site.
10. [ ] **Balayages** : pages et e-mails restants, écrans restants de l'Atelier, nettoyage technique
    (ancien logo, laboratoire, métadonnées).
11. [x] **Documentation et marque** : `MARQUE.md`, `content/brand/voice.md`, `DECISIONS.md`,
    `README.md`, `PLAN.md`, `ETAT.md`, `docs/EQUIPES.md`, notes d'archive, `GUIDE-CREATRICE.md`
    (premier jet complet) (24/10).
12. [ ] **Contrôle complet de fin** : compilation, parcours Playwright, comparaison aux maquettes,
    relecture des passages « à vérifier » du guide sur le serveur local, captures du guide, réunion
    de synthèse dans `JOURNAL.md`.

À fournir par la Maison (`RESSOURCES.md`, `LEGAL-A-COMPLETER.md`) : vraies photos des pièces, logo en
SVG, licence commerciale de Croisan ou confirmation pour le logo, crédit du portrait, prix et délais
définitifs, matières, compositions, entretien et mesures, informations légales manquantes.

## Phase B · Boutique complète et fonctionnelle (mode simulé)

Fait le 13 et le 14/10 : fiche produit (traçabilité, partage, barre d'achat fixe sur mobile), panier
et commande (suggestions, Shop Pay, adresses, points relais, retrait, droits et taxes, options
cadeau), après la commande (suivi sans compte, retours et échanges avec étiquette, factures et avoirs,
export comptable), rendez-vous en ligne. Reste :

1. **Pages** : Le Cercle, Points de vente et pop-up, Entretien des matières (quand la Maison les
   donne), Glossaire, Maintenance, Déclaration d'accessibilité, Plan du site.
2. **Clientes et e-mails** : export CSV, statut du Cercle, navigation abandonnée, invitations du
   Cercle, double confirmation de la lettre, liens WhatsApp et message Instagram, génération des QR
   codes en lot.
3. **Mesure et suivi** : LocalBusiness (quand l'adresse à publier est confirmée), images de partage
   par pièce.

## Phase C · Design

Les trois directions (« dentelle », « atelier », « édition ») sont archivées
(`docs/equipes/design/`) : les maquettes officielles de la Maison les remplacent, et leur langage est
étendu à tout le site (`DESIGN.md`, phase R). Restent, avec les ressources officielles : les touches
propres à Awrea (motif de dentelle, croquis de la créatrice dès qu'ils sont fournis, monogramme
officiel décliné, numéro de création, un détail inattendu par page).

## Phase D · Effets avancés

Écran d'ouverture au monogramme officiel (première visite), transition grille → fiche (View
Transitions), vue 360° (avec les vraies photos), ambiance selon l'heure de Paris, ambiance sonore
optionnelle, vibrations, film de collection en chapitres, lookbook feuilletable et PDF (après les
shootings), PWA avec notifications, styliste par photo.

## Phase E · International

Version anglaise complète, détection de la langue et de la devise (euro, livre, dollar, franc suisse),
sélecteur discret, hreflang. Les zones de livraison suivent les CGV officielles.

## Phase F · Équipes au travail (une par une)

Contenu (trois voix → critique → rédacteur final, e-mails compris) · E-commerce (cliente mystère) ·
SEO et IA · Sécurité (attaquant éthique jusqu'à zéro faille) · Qualité (320 → 2560 px, WCAG 2.2 AA,
sous-titres, Lighthouse 95+, budget de poids, tests visuels de non-régression) · Juridique (Cercle,
parrainage, accessibilité, prestataires) · Assistant IA (centaines de conversations).

## Phase G · Livraison

`GUIDE-CREATRICE.md` illustré, `ACTIVATION.md` complet, README en une commande, `REVUE.md` (jury
Awwwards) entièrement corrigée, contrôle final de chaque section du cahier des charges, réunion de
synthèse dans `JOURNAL.md`.
