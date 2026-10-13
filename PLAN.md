# PLAN — Awrea Paris

> Référence unique : le **cahier des charges complet** (13 octobre 2026). État détaillé : `ETAT.md`.
> Décisions : `DECISIONS.md`. Marque : `MARQUE.md`. Journal : `JOURNAL.md`. Ancien plan :
> `docs/historique/PLAN-avant-cahier-complet.md`.
> Ordre imposé : **d'abord une boutique complète et fonctionnelle (même simulée), ensuite les effets
> avancés, ensuite les extras.** Une branche par grand chantier, fusionnée dans `claude/awrea-site`
> quand tout est vert. Si les limites d'utilisation sont atteintes, les équipes travaillent une par une.

## Phase A — Mode de travail et fondations (en cours)

- [x] Sauvegarde de l'état antérieur (`archive/avant-nouvelle-da`), audit (`ETAT.md`), plan priorisé
- [ ] `DECISIONS.md`, `ACTIVATION.md` (comptes à créer, pas à pas, compréhensible sans être développeur)
- [ ] Interrupteurs par service (`COMMERCE_PROVIDER=mock|shopify`, etc.) avec bascule automatique sur
      la simulation quand la clé manque, listés dans `.env.example`
- [ ] Polices hébergées dans le dépôt (aucun appel à Google Fonts), logo provisoire SVG noir et blanc
- [ ] Une durée et une courbe pour toutes les animations ; `MARQUE.md` complété (univers, rubriques
      Instagram)

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
6. **Contenus modifiables** (CMS simple dans l'Atelier, adaptateur métaobjets Shopify / Sanity) et
   régénération des pages par webhooks.
7. **Mesure et suivi** : adaptateur Sentry, Microsoft Clarity et pixel TikTok après consentement,
   LocalBusiness, images de partage par pièce.

## Phase C — Design (processus multi-agents)

Directions « dentelle », « atelier », « édition » (une par une) → critique et gardien de la marque →
fusion choisie et documentée → `DESIGN.md` avec captures → application à tout le site avec les
touches propres à Awrea (motif de dentelle, croquis et annotations, monogramme décliné, numéros
d'édition, un détail inattendu par page) et la grille éditoriale asymétrique de la boutique.

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
