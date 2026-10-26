# Proposition « dentelle » — DA 1 : « le réseau et le jour »

> **Archive.** La typographie et les règles décrites ici sont remplacées par les ressources
> officielles de la Maison (`RESSOURCES.md` : polices Fraunces 72pt Italic et Cormorant Garamond,
> logo officiel, langage des maquettes), puis par `MARQUE.md` et `DESIGN.md`. Les séries numérotées,
> le stock et les anciennes collections cités plus bas n'existent plus (pièces créées sur demande).
> Le laboratoire cité (`app/(lab)`) est retiré du site ; il reste sur la branche
> `archive/avant-ressources-officielles`. Document gardé pour l'historique, sans mise à jour.

> Directeur artistique 1, équipe Design, 13 et 14 octobre 2026. Laboratoire :
> `/lab/da-dentelle` (accueil) et `/lab/da-dentelle/piece` (robe Odessa), code dans
> `app/(lab)/lab/da-dentelle/`. Référence : `MARQUE.md`, `liste-noire.md`, `arbitrages.md`.
> **À juger** par `critique-design` et `gardien-marque` ; aucune livraison sans le feu vert du chef de projet.

## 1. Le concept en cinq lignes

1. Une page Awrea se lit comme une dentelle : un **réseau** régulier (la grille de 12 colonnes au pas de 8 px), des **motifs** pleins (les pièces, les mots) et des **jours** (le blanc).
2. Le blanc n'est pas un vide : c'est le jour de la dentelle, au moins 40 % de chaque page.
3. Le réseau se voit à peine : douze **picots** sous l'en-tête, un picot au bout de chaque **fil** (filet de 1 px).
4. Un seul verbe de mouvement, **ajourer** : une image de dentelle se lève derrière un tulle dont les nœuds se défont.
5. Seules les bandes noires ont un bord **festonné** (la phrase de la créatrice, le pied de page) : la dentelle signe, elle ne décore pas.

## 2. Principes

- **Grille.** Tout tombe sur les 12 colonnes (`--spacing-gutter`). La lisière (en-tête) pose un picot au centre de chaque colonne. La collection se place **en quinconce**, comme les mailles d'un tulle : mailles de trois colonnes, une sur deux porte une pièce, chaque rang décalé d'une maille. C'est une règle, pas un décalage décoratif (arbitrage 3f). Les espacements passent tous par les tokens et respectent la grille de 8 px (audit vérifié).
- **Typographie.** Instrument Serif très grand **seulement pour les nombres et les mesures** (arbitrage 3d) : « N° 3 / 5 », « 30 cm », « Quatre pièces, vingt-neuf exemplaires numérotés » (nombres calculés, en toutes lettres et insécables). Inter Tight 300 justifié à la mesure de la Maison ; petites capitales 400 pour la navigation, les boutons, les étiquettes et les intitulés des notes de patronage. Aucun italique.
- **Images.** Noir et blanc d'origine, traitées en œuvres : un **cordonnet** (le fil qui cerne les motifs d'une dentelle de Calais) à 8 px de l'image et une étiquette d'échantillon tirée des vraies données (« Échantillon · Réf. AW-ODS · Dentelle de coton et polyamide · N° 3 / 5 »). Aucun effet sur les photographies, hormis l'ajour d'arrivée.
- **Mouvement.** `var(--dur)` et `var(--ease)` uniquement ; les séquences enchaînent la même durée. Ouverture (première visite) : le médaillon se trace (1 durée), puis le voile s'ajoure (1 durée), soit 1,6 s, jamais bloquant. Titre **piqué** : un fil avance sous « Lace is more », les lettres paraissent au passage de l'aiguille (arbitrage 3a). Ajour sur **trois images de dentelle seulement** (échantillon d'accueil, photo de la fiche, détail de matière). Vidéo des vignettes au survol, révélée en ajour (arbitrage 3c). Le reste de la page est immobile. Tout est coupé en animations apaisées (CSS et JS).

## 3. L'angle sur l'accueil : un récit en cinq temps

1. **L'échantillon.** « Lace is more » piqué sur un fil, le chapeau, un seul bouton plein (« Découvrir la collection », magnétique faible). À droite, le détail d'Odessa s'ajoure dans son cordonnet, légendé comme dans un livre d'échantillons de dentellier.
2. **Le rapport.** La collection comme un ensemble fini : « Quatre pièces, vingt-neuf exemplaires numérotés », puis les quatre pièces en quinconce. Chaque vignette porte son numéro, sa **série en picots** et son prix. Une maille vide est habitée : c'est le mot dans le jour (§ 5).
3. **Le galon.** Une bande noire festonnée porte la phrase fondatrice de la créatrice ; le halo (`LightHalo`) y révèle la dentelle cachée : la lumière révèle l'essentiel, comme le dit la phrase.
4. **L'atelier.** Le geste filmé (découpe des motifs) et une seule phrase : « La dentelle se découpe motif par motif ».
5. **La lettre.** Sur un papier filigrané (médaillon AW très léger), sans remise.

Le pied de page est l'**ourlet** : bord festonné, halo, « Consommer plus juste. », réglages Jour, Nuit, Auto et animations apaisées.

## 4. L'angle sur la fiche : le dossier d'une pièce

- **La pièce et l'achat** (non collant). Photo ajourée et cordonnet, avec l'accroche en légende. À droite : « Robe Odessa », puis **N° 3 / 5** en très grand et le prix sur la même ligne, la série en picots (●●◎○○, « Série de 5 pièces · 3 à venir »). Vient ensuite la **taille par ses mesures** : un tableau à choix unique (XS 34 · 80 / 62 / 88 cm · sur commande, etc.) qui intègre le guide des tailles, sans fenêtre. Le délai n'est dit qu'une fois ; un seul bouton, « Ajouter au panier » ou « Précommander » ; « Garder » ; l'état est annoncé aux lecteurs d'écran ; l'accès « Demander conseil à l'atelier » sert d'entrée « Conseil » (arbitrage 9). Le bouton est visible dès l'ouverture en 1440 × 900.
- **Le patron.** Le croquis d'Odessa de dos, au trait, avec six notes de patronage reliées par des **brides** terminées d'un picot (manches, bustier doublé, laçage, ligne, dentelle, traîne). Toutes les notes viennent de la fiche. La mesure géante « 30 cm » est la traîne ; la description suit, justifiée.
- **La matière.** La loupe dentelle (`LaceLoupe`) s'ajoure à son arrivée ; la composition se lit entre des filets.
- **Le carnet.** Coupe et taille, entretien, livraison et retours, certificat : tout se lit sans clic, avec les intitulés dans la marge (aucun accordéon). Les phrases restent sobres (« Pour cette pièce, la livraison suivie vous est offerte… »).
- **La silhouette.** « La nuit d'Odessa » (silhouette réelle) et le lien vers le body Gaïa : prolonger par le sens, sans carrousel.
- **La barre d'achat** paraît une fois le bouton dépassé (téléphone et ordinateur). Elle garde la taille choisie, et « Choisir ma taille » ramène au tableau.

## 5. Les touches propres à Awrea

- **Motif de dentelle** : picots (réseau, fils, séries), festons (galon, ourlet), tulle (ajour, point d'esprit), dentelle cachée sous le halo.
- **Croquis et annotations** : croquis provisoire d'Odessa, à remplacer par les croquis scannés de la créatrice (arbitrage 8).
- **Monogramme AW** décliné en **médaillon**, c'est-à-dire le monogramme de la Maison (`Logo`) serti de 24 picots. Il sert de logo de la lisière, de curseur (uniquement au-dessus des images de dentelle et des galeries, à côté du pointeur système, absent au tactile et en mode apaisé), d'écran d'ouverture (tracé le long de `monogramPaths`, première visite, témoin de session) et de filigranes. Je le propose aussi en favicon.
- **Numéros d'édition** : « N° 3 / 5 » très grand et la série en picots sur un fil, dans les vignettes, l'échantillon et la barre d'achat (`editionInfo`).
- **Un détail inattendu par page** : à l'accueil, le **mot dans le jour** (au survol, au clavier ou au toucher : « La dentelle dit tout en cachant presque tout », tiré de l'intention de la collection) ; sur la fiche, une **chute de dentelle épinglée** (« À l'atelier, les chutes deviennent des accessoires »).

## 6. La liste noire, évitée

| Code | Réponse de la direction |
| --- | --- |
| A1, A2, A3 | Pas de héros plein écran : un échantillon légendé. Un récit en cinq temps, un message et un appel par temps. Un ensemble fini de quatre pièces, sans carrousel. |
| A4, G1, G3 | Un seul lien @awrea.paris ; la lettre vient en fin de récit, sans remise ; aucun pictogramme ni étoile. |
| A6, B1, B4 | Quinconce du tulle (règle) au lieu d'une grille de catalogue ou d'un magazine asymétrique ; aucune image de campagne intercalée. |
| B2, B3, B6 | Première image qui montre la matière. Survol réservé à la vidéo en ajour (rien n'en dépend). Ni ajout rapide ni pastille : le numéro est une information. |
| C1, C2, C3 | Pas de galerie empilée ni de colonne collante ; pas d'accordéon ; la taille se choisit par ses mesures, guide intégré. |
| C4, C5, C6 | La silhouette réelle plutôt que « Vous aimerez aussi » ; ni points cliquables ni pictogrammes de réassurance. |
| D1 à D4 | Médaillon à gauche, cinq mots visibles alignés sur les colonnes, en-tête opaque ; ni mégamenu ni bandeau. |
| E1, E4 | Monogramme en médaillon (pas de capitales sans empattement) ; seuls des numéros vrais (édition, référence, mesures). |
| E2, E3 | Maintenus (`MARQUE.md`), mais l'usage les singularise : le serif porte les nombres et la phrase de la créatrice, les petites capitales les notes de patronage. |
| F1 à F6 | Aucune apparition générique au défilement. Un seul verbe sur trois images. Curseur à côté du pointeur système. Ouverture en moins de 2 s, sans rideau, sans parallaxe, sans WebGL ajouté. |
| G2, H | « Demander conseil » dans le bloc d'achat plutôt qu'une bulle ; aucun verre dépoli. |

## 7. Ce qu'il faudrait changer dans les composants partagés

1. `components/layout/Header.tsx` → la **lisière** : médaillon à gauche, entrées sur les colonnes 4 à 12, réseau de picots ; cinq entrées (Les pièces, L'atelier, La Maison, Rechercher, Panier), « Compte » au pied de page. `Footer.tsx` → l'**ourlet** festonné, avec le filigrane dans un calque rogné.
2. Nouveaux éléments du design system, aujourd'hui privés au laboratoire : `Fil` et `Reseau`, `Feston`, `Ajour`, `Edition` et `Serie` (qui remplacent le cartouche de `EditionNumber`), `Medaillon`, ainsi que les tokens `--fil`, `--picot`, `--maille` (16 px), `--feston` et `--feston-l`.
3. `components/motion/RevealObserver` et `.reveal-img` : à retirer des pages (F2), l'ajour des seules images de dentelle prenant le relais.
4. `components/commerce/ProductForm.tsx` : adopter la **taille par mesures** et dire le délai une fois. La barre fixe (`stickyBar`) paraît aujourd'hui dès que le bouton est hors de l'écran, y compris au chargement ; je propose qu'elle ne paraisse qu'une fois le bouton dépassé, pour que rien ne recouvre la page à l'arrivée.
5. `components/signature/LaceLoupe.tsx` : `cursor: none` masque le pointeur système, contraire à l'arbitrage 1 ; garder le pointeur et accepter `loading` / `priority`.
6. `LaceReveal` : l'aligner sur le voile ajouré (tulle fin, une durée). `DrapeTransition` : ourler le pan noir d'un feston bordé du fil blanc.
7. `components/brand/Logo.tsx` : variante « médaillon » ; favicon en médaillon.
8. `components/assistant` : ouvrir `AssistantPanel` depuis « Demander conseil » et supprimer la bulle.
9. Croquis : un champ par pièce (scan ou tracé, notes) dans les données Shopify, au lieu des notes en dur de `Croquis.tsx`.
10. `scripts/lab-capture.mjs` : poser un témoin de consentement valide (la valeur « lab » cause un décalage d'hydratation) et décoder les images (`img.decode()`) avant la capture pleine page.
11. Proposition pour `MARQUE.md` § 3 : consigner le vocabulaire « réseau, jour, picot, fil, feston, cordonnet, bride », le verbe unique « ajourer » et les festons réservés aux bandes noires.

## 8. Captures (`docs/design/da-dentelle/`)

- Script du dépôt (`scripts/lab-capture.mjs`), pleine page : `accueil-ordinateur.jpg`, `accueil-mobile.jpg`, `piece-ordinateur.jpg`, `piece-mobile.jpg`. Dans les deux captures de la fiche, la loupe paraît grise : l'image, déjà en cache depuis l'accueil, n'est pas décodée au moment de la capture pleine page (aucun défaut pour la visiteuse). Voir `detail-fiche-matiere-ordinateur.jpg`.
- Détails : `detail-ouverture-premiere-visite.jpg` (médaillon tracé, voile ajouré), `detail-ajour-image.jpg` (quatre instants), `detail-mode-nuit.jpg`, `detail-fiche-matiere-ordinateur.jpg`, `detail-fiche-barre-achat-mobile.jpg`, `detail-accueil-mot-dans-le-jour.jpg`, `detail-curseur-monogramme.jpg`.

## 9. Compte rendu

- **Fait** : deux pages et 14 composants privés, un module CSS entièrement en tokens (une durée, une courbe). Vérifications : `tsc` et `eslint` sans erreur sur le dossier ; `npm run audit:tokens` sans écart, et les mêmes règles appliquées au module ; l'audit d'homogénéité du projet (`tests/e2e/design-audit.ts`) et axe appliqués à mes pages en 360, 768 et 1440 px sont sans écart (espacements, interlignage 1,6, justification, mesure, contrastes, 0 violation WCAG 2.1 AA). Mode Nuit, clavier, toucher, animations apaisées et 1920 px contrôlés. Quatre passes d'amélioration sur captures.
- **Reste** : les vrais croquis et le monogramme officiel ; la vidéo au survol n'a pu être vue en capture (le Chromium de test ne lit pas le H.264) ; le témoin de session `awrea_ouverture` (non personnel) est à valider avec le registre des témoins ; en production, l'en-tête et le pied doivent sortir de `<main>` (repères banner et contentinfo).
- **Problèmes relevés, hors de mon dossier** : décalage d'hydratation du `ConsentProvider` sur toutes les pages, y compris l'accueil du site, qui relance les animations et, avec le script de capture, provoque parfois une erreur `insertBefore`. Les polices locales sont nommées `interTight` et `instrument`, que le test d'homogénéité signale sur tout le site. Le magasin de démonstration contient une pièce de test e2e (« Top Test 8kni ») rattachée à Lace is more, que j'ai filtrée dans le laboratoire.
