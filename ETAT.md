# ÉTAT · audit de l'existant face au cahier des charges complet

> Audit du 13 octobre 2026, mis à jour le 24 octobre 2026 pendant l'intégration des ressources
> officielles de la Maison (`RESSOURCES.md`), qui priment sur toute consigne antérieure.
> Légende : **Fait** (présent et gardé) · **En cours** (lot de la phase R en travail ou à valider au
> contrôle de fin) · **À faire** · **Retiré** (sans objet dans le modèle sur demande). Mis à jour à
> chaque fin d'étape. États antérieurs sauvegardés sur les branches `archive/avant-nouvelle-da` et
> `archive/avant-ressources-officielles`.

## 0. Mode de travail

| Point | État |
| --- | --- |
| Autonomie, décisions notées | **Fait** : `DECISIONS.md`, dont les décisions des ressources officielles |
| Adaptateurs réel / simulé, site complet sans clé | **Fait** : commerce (Shopify / démo), base clientes (Supabase / stockage local), e-mails (Resend / boîte simulée), lettres (Brevo, Klaviyo / envoi du site), IA (Claude / réponses simulées), Turnstile, stockage (Upstash / fichier), Instagram ; interrupteurs `*_PROVIDER` (`lib/config/providers.ts`), état visible dans l'Atelier › Réglages |
| `.env.example` commenté | **Fait**, avec les interrupteurs |
| `ACTIVATION.md` | **Fait** : étapes 0 à 14 dans l'ordre, pour une non-développeuse ; pièces créées sur demande, sans suivi de stock, délais et indicateurs provisoires en métachamps |
| `ETAT.md`, `PLAN.md` priorisé | **Fait** (phase R ajoutée au plan) |
| Travail par lots en parallèle | **Fait** : règles dans `docs/EQUIPES.md`, registres de contenu par équipe (`content/site/registre/`) |
| Commits | **En cours** : les lots de la phase R sont dans l'arbre de travail, à valider au contrôle de fin avant d'être enregistrés sur `claude/awrea-site` |

## 1. La marque

| Point | État |
| --- | --- |
| `MARQUE.md` | **Fait** (24/10) : identité au modèle sur demande, sept pièces de « Hypnotic Lace », textes officiels cités mot pour mot, éthique de production, ce qui disparaît, règle des textes officiels, photos provisoires, logo officiel, navigation des maquettes |
| `content/brand/voice.md` | **Fait** (24/10) : voix nourrie des textes officiels, faits à ne jamais contredire (sur demande, délais, étapes, numéro de création, CGV officielles) |
| `content/brand/voix-creatrice.md` | **À faire** : légendes Instagram réelles et texte de la lettre manuscrite à fournir par la créatrice |

## 2. Direction artistique

| Point | État |
| --- | --- |
| Palette, dorure absente de l'interface | **Fait** : tokens, CSS, e-mails, signatures (halo blanc, fondu blanc entre les pages) ; plus de texture de dentelle sur les fonds (27/10) |
| Polices officielles : Fraunces 120pt Light (grands titres, 27/10), Fraunces 72pt Italic (petits titres) et Cormorant Garamond (textes) | **Fait** : WOFF2 servis par le site (`styles/fonts`, `next/font/local`), licences OFL ; anciennes polices retirées et refusées par `npm run audit:tokens` ; Croisan jamais chargée |
| Logo officiel | **Fait** : PNG à fond transparent dans `public/brand/` (`awrea-logo.png`, `awrea-logo-blanc.png`, `awrea-monogramme.png`, `awrea-aw.png`), déclarés dans `content/brand/assets.ts`, affichés en masque par `components/brand/Logo.tsx` ; icônes `app/icon.png` et `app/apple-icon.png`. **À faire** : SVG à fournir par la Maison ; anciens fichiers SVG provisoires retirés par le nettoyage technique (**En cours**) |
| Langage des maquettes étendu à tout le site | **En cours** : primitives dans `styles/components.css` et `DESIGN.md` (`.btn`, `.field`, `.badge`, `.rule--center`, `.media--card`, `PageHeader`) ; pages refaites lot par lot |
| En-tête et pied de page des maquettes | **En cours** (lot en-tête et pied de page) |
| Épuré et luxueux | **Fait** : règles appliquées ; plus aucun compte à rebours ni rareté (**En cours** sur les avant-premières) |
| Alignement du texte | **Fait** : corps de texte justifiés avec césure sur tablette et ordinateur, alignés à gauche sur téléphone (choix du 27/10), textes alignés sur leur titre, mesure de 24,5 em (65 caractères de Cormorant), contrôle automatique |
| Homogénéité (8 px, 1,6, marges) | **Fait** : contrôle automatique ; une durée et une courbe pour toutes les animations |
| Responsive | **Fait** de 360 à 1920 px, barre d'achat fixe sur mobile ; **À faire** : 320 et 2560 px |

## 3. Processus de design multi-agents

| Point | État |
| --- | --- |
| Veille et liste noire | **Fait**, archivées (`docs/VEILLE-DESIGN-2026.md`, `docs/equipes/design/`, note en tête) |
| Trois directions artistiques | **Retiré** : archivées ; les maquettes officielles les remplacent ; laboratoire retiré du site (branche `archive/avant-ressources-officielles`) |
| `DESIGN.md` | **Fait** (ressources officielles : polices, échelle, primitives des maquettes) ; captures du site final au contrôle de fin |
| Touches personnelles | **En cours** : numéro de création, texture de dentelle, monogramme officiel ; croquis de la créatrice à fournir |

## 4. Interactions signature

| # | Interaction | État |
| --- | --- | --- |
| 1 | Écran d'ouverture (monogramme officiel) | **À faire** |
| 2 | Halo de lumière blanche | **Fait**, sans dentelle dessinée (27/10) |
| 3 | Révélation en dentelle de la vidéo d'accueil | **Retiré** (composant supprimé le 27/10 : plus de fausse dentelle sur les fonds noirs) |
| 4 | Transitions entre les pages ; transition grille → fiche (View Transitions) | **Fait** : fondu blanc à la place du drapé (27/10) ; **À faire** pour View Transitions |
| 5 | Lettre de la créatrice au défilement | **À faire** : composant `HandwrittenLetter` gardé, plus affiché ; texte de la lettre à fournir |
| 6 | Numéro de création (« Création n° 0001 ») | **En cours** (remplace les numéros d'édition) ; pièces restantes **Retiré** |
| 7 | Loupe dentelle | **Fait** |
| 8 | Vue 360° | **À faire** (après les vraies photos) |
| 9 | Shop the look | **Fait** (Outfits) |
| 10 | Enveloppe de confirmation | **Fait** |
| 11 | Alternance claire / sombre | **Fait** |
| 12 | Ambiance selon l'heure de Paris | **À faire** |
| 13 | Ambiance sonore optionnelle | **À faire** |
| 14 | Vibrations à l'ajout au panier | **Fait**, à vérifier sur téléphone |

## 5. Stack

| Point | État |
| --- | --- |
| Next.js, TS, Tailwind, GSAP, Lenis | **Fait** (OGL retiré avec la transition drapée, 27/10) |
| Shopify / Supabase / Claude derrière adaptateurs | **Fait** |
| Sentry | **Fait** : envoi sans bibliothèque, repli local |
| Klaviyo / Brevo | **Fait** (`lib/marketing/provider`) |
| Textes et images modifiables sans code | **Fait** : éditeur « Édition », documents `content/site/<langue>/` ; **En cours** : passage des pages refaites aux documents JSON |
| Régénération des pages | **Fait** : catalogue par webhooks Shopify, contenus à la publication (programmée tous les quarts d'heure) |

## 6. Pages

**Fait** : Accueil, Collections et page de la collection Hypnotic Lace, Boutique (filtres, recherche
plein écran), Fiche d'une pièce, Outfits, La Maison, L'Atelier, Rendez-vous (agenda en ligne),
Journal, Presse, Événements, Contact, FAQ, Assistant IA, Livraison et retours, Suivi de commande sans
compte, Bientôt (avant-premières), Recherche, 404, pages légales, compte, liste d'envies, lettres,
avis, certificat.
**En cours** (phase R) : La commande sur demande (`/sur-commande`) et Guide des tailles
(`/guide-des-tailles`), nouvelles ; accueil, La Maison, L'Atelier, Contact, collection, boutique et
fiche refaites sur les maquettes et les textes officiels ; CGV et mentions légales officielles.
**À faire** : Le Cercle (page), Points de vente et pop-up, Entretien des matières (quand la Maison les
donne), Glossaire, page de maintenance, Déclaration d'accessibilité, Plan du site, lookbook (après les
shootings). Archives « Pièce adoptée » : à redéfinir avec la Maison (supposait des pièces uniques).
Fiche d'une pièce : **Fait** galerie, loupe, prix, tailles, « Trouver ma taille », traçabilité,
partage, barre d'achat fixe sur mobile, compléter le look, avis, envies ; **En cours** délai de
fabrication, pastille « Nouveau », mention « visuel provisoire » ; **Retiré** numéro d'édition, liste
d'attente, alerte de retour en stock, « Fait main à Paris » ; **À faire** vue 360°.

## 7. E-commerce et logistique

| Point | État |
| --- | --- |
| Panier latéral, tunnel court sans compte, carte, Apple Pay / Google Pay / PayPal, 3 ou 4 fois (simulés) | **Fait** ; suggestions dans le panier et Shop Pay **Fait** |
| Autocomplétion d'adresse | **Fait** (adaptateur et simulation) |
| Création sur demande : aucune quantité, délai de fabrication par pièce, cinq étapes de commande, numéro de création | **En cours** (phase R) ; stocks par taille, liste d'attente, précommande et numéros d'édition **Retiré** |
| Livraison | **Fait** : Colissimo, Chronopost, DHL, Mondial Relay, retrait, droits et taxes calculés à l'avance, date de livraison d'un cadeau. **À vérifier** : les CGV officielles annoncent une livraison en France métropolitaine, sous 5 à 10 jours ouvrés (`LEGAL-A-COMPLETER.md`) |
| Retours et échanges en libre-service avec étiquette | **Fait** |
| Factures PDF, avoirs, export comptable mensuel | **Fait** |
| Emballage cadeau, message, prix masqué sur le bordereau | **Fait** |
| Codes, cartes cadeaux / parrainage | **Fait** / **À faire** |
| Sur mesure | **En partie** : premier rendez-vous sur mesure réservable, rôle « Sur mesure » qui suit les demandes ; devis depuis l'Atelier **À vérifier** |
| Compte cliente | **Fait** ; frise des cinq étapes **En cours** |

## 8. Base clientes

**Fait** : Supabase / démo, comptes e-mail, Google, Apple, profils, tailles, adresses, historique,
envies, consentements, navigation consentie, segments, RGPD, RLS. **En cours** : migration
`20261018000000_creation_sur_demande` (dates des étapes, séquence des numéros de création) ; listes
d'attente **Retiré**. **À faire** : export CSV depuis l'Atelier.

## 9. Certificat, Cercle, avant-premières

**Fait** : certificats, QR, page publique, rattachement au compte, impression avec étiquette. **En
cours** : numéro de création sur le certificat et l'étiquette. **À faire** : génération des QR en lot.
**En partie** : Cercle (adhésion dans le compte ; page, statut visible, invitations à faire).
**En cours** : avant-premières (anciens drops) sans compte à rebours ni rareté : avant-première des
inscrites par lien personnel, présentation privée par mot de passe. **Fait** : rendez-vous
synchronisés à l'agenda de la créatrice (abonnement iCal).

## 10. Assistante IA

**Fait** : assistante (simulée sans clé), garde-fous, transfert à la Maison, mention IA,
connaissances au modèle sur demande (sept pièces, délais, étapes, CGV officielles). **Retiré** :
styliste par photo d'inspiration (aucune fonction de ce nom sur le site ; notice et confidentialité
alignées le 25/10).

## 11. Agents de gestion

**Fait** : six agents, dix-huit rôles du matin relus par le Contrôle, maintenance de nuit, validations
pour l'argent et l'irréversible, journal, tableau de bord à double authentification. **En cours** :
passage au modèle sur demande (« Commandes et confection » au lieu de « Commandes et stock »,
avant-premières, prix, délais et photos provisoires signalés).

## 12. Équipes d'agents

**Fait** : cinquante agents dans `.claude/agents/`, `docs/EQUIPES.md` (organisation, chaîne
d'écriture, travail par lots).

## 13. Cookies

**Fait**. **En cours** : retrait du sujet « retour en stock » des préférences s'il y figure.

## 14. SEO et visibilité IA

**Fait** : balisage, h1 unique, métadonnées, fil d'Ariane, canoniques, sitemap, robots (robots des
IA autorisés), Open Graph, données structurées, llms.txt, flux Merchant / Meta (sans les photos
provisoires), mesure d'audience et pixels après consentement. **En cours** : métadonnées et llms.txt
au modèle sur demande. **À faire** : hreflang EN (pas de version anglaise), LocalBusiness, images de
partage par pièce.

## 15. E-mails

**Fait** : confirmation, bienvenue, panier abandonné, après-achat, demande d'avis, anniversaire,
relance, rendez-vous (confirmation, rappel, annulation), arrivée de la commande. **En cours** :
e-mails des étapes (« Commande reçue », « En confection », « Prête », « Expédiée »), modifiables dans
l'Atelier › E-mails. **Retiré** : retour en stock. **À faire** : navigation abandonnée, invitations
du Cercle, double confirmation de la lettre, liens WhatsApp / message Instagram.

## 16. Sécurité

**Fait** (voir `SECURITE.md`). **À faire par la Maison** : dépôt privé et branche principale protégée
(`ACTIVATION.md`).

## 17. Juridique

**Fait** : pages légales complètes, cases d'acceptation, registre légal. **En cours** : CGV et
mentions légales officielles transcrites mot pour mot, informations connues reportées dans
`content/legal/fields.ts` ; onze informations à fournir et écarts entre les CGV officielles et le
fonctionnement du site listés dans `LEGAL-A-COMPLETER.md`. **À faire** : conditions du Cercle et du
parrainage, déclaration d'accessibilité, validation par un professionnel.

## 18. International, accessibilité, performance

**À faire** : version anglaise et devises affichées (seule la préférence de devise existe),
sélecteur. **En partie** : WCAG 2.1 AA testé, viser 2.2 AA ; sous-titres des vidéos ; images WebP,
préchargement au survol, zéro décalage. **À faire** : budget de poids par page, PWA (manifeste seul).
**Fait** : empreinte écologique dans le pied de page.

## 19. Qualité et tests

**Fait** : tests unitaires, base, Playwright (parcours, accessibilité, responsive, homogénéité),
intégration continue. **À faire** : tests visuels de non-régression, `REVUE.md`. **En partie** :
prévisualisation (Vercel Preview documenté).

## 20. Documentation

**Fait** : `README.md`, `MARQUE.md`, `RESSOURCES.md`, `DESIGN.md`, `DECISIONS.md`, `PLAN.md`,
`JOURNAL.md`, `ACTIVATION.md`, `SECURITE.md`, `LEGAL-A-COMPLETER.md`, `docs/EQUIPES.md`.
**En cours** : `GUIDE-CREATRICE.md`, premier jet complet (24/10) ; passages « à vérifier » à rejouer
sur le serveur local et captures d'écran à ajouter au contrôle de fin.
