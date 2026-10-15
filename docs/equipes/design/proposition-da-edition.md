# Proposition du directeur artistique 3, angle « édition »

> Équipe Design, 15 octobre 2026. Proposition séparée, à juger par `critique-design` et `gardien-marque`. Aucune livraison sans le feu vert du chef de projet. Laboratoire `app/(lab)/lab/da-edition/` ; accueil sur `/lab/da-edition`, fiche de la Robe Odessa sur `/lab/da-edition/piece`.

## Le concept en cinq lignes

**Le Numéro.** Awrea se lit comme une revue imprimée. La collection en cours est un numéro, chaque pièce un sujet, la série numérotée son tirage.

Le folio d’une pièce, c’est son numéro d’édition. Il est composé en très grand, comme le titre de la page.

L’imprimerie et l’atelier parlent la même langue, et la mise en page le montre. La piqûre relie les cahiers comme une ligne de points, les traits de coupe bordent la feuille du croquis, un feston à picots tient lieu de filet.

La composition vient du gabarit d’un magazine (douze colonnes, doubles pages, pli central, fond perdu, légendes de mode, sommaire, ours), jamais d’un décalage décoratif.

L’achat reste immédiat. Prix, exemplaire et taille sont visibles dès l’ouverture de la fiche, sans un clic.

## Les principes

**La grille.** Douze colonnes et les marges du site (`--spacing-gutter`). Chaque section est une page, et une double page sur ordinateur : colonnes 1 à 6 à gauche, 7 à 12 à droite, le pli au milieu. Deux pistes vides encadrent la grille pour qu’une photographie aille jusqu’au bord de l’écran tout en restant calée sur les colonnes. Une seule distance entre deux pages (`--space-section`) ; le folio ferme chaque page. Tous les espacements sont des multiples de 8 px.

**La typographie.** Un jeu d’échelle sans demi-mesure. Instrument Serif immense pour ce qui se compte (« N° 3 / 5 », « 31 h »), Instrument Serif moyen pour les titres, Inter Tight léger et justifié pour le texte, petites capitales pour les étiquettes, les folios et les boutons. La typographie géante n’apparaît jamais sans un numéro d’édition ou une mesure d’atelier (arbitrage 3d). Sur ordinateur, le texte de l’article court sur deux colonnes justifiées, une par page, chacune à la mesure de la Maison. Aucune colonne étroite.

**Les images.** Seulement les vraies photographies de la Maison, traitées comme des pages de magazine. Elles vont à fond perdu du côté extérieur de la page, avec une légende de mode écrite d’après les données réelles (pièce, matière, prix, collection), comme en presse : « En couverture », « Ci-contre » sur ordinateur, « Ci-dessus » sur téléphone. Le croquis attend dans une feuille réservée.

**Le mouvement.** La page est immobile. Trois gestes seulement, tous sur `--dur` et `--ease` : le monogramme qui se dessine à la première visite, le halo de l’édito noir, la dentelle qui apparaît dans un numéro d’édition au survol de sa page. Aucune apparition au défilement, aucune parallaxe. En animations apaisées, tout est déjà en place.

## L’angle sur l’accueil

Le numéro se lit dans l’ordre d’une revue, une idée et un appel par page.

**La une.** Une couverture, pas une affiche. La photographie de la Robe Odessa part du bord gauche, sa légende « En couverture » donne la matière et le prix. En face, le titre du numéro, « Lace is more », un chapeau de deux lignes et un seul bouton, « Voir la robe Odessa ». Le `h1` (« Awrea Paris, prêt-à-porter féminin fait main à Paris ») est posé comme la devise sous le titre d’une revue.

**Le sommaire face à l’édito.** Page de gauche, le sommaire. Chaque pièce y figure avec son numéro d’édition et son prix, les chiffres romains renvoient aux folios des pages suivantes (ancres, navigables au clavier). Page de droite, en noir, l’édito de la créatrice : « Consommer plus juste », sa phrase fondatrice citée telle quelle, et le halo qui révèle la dentelle cachée dans le fond.

**Une double page par pièce.** La photographie à fond perdu sur la page extérieure, à gauche puis à droite, comme un recto et un verso. En face, le numéro d’édition en très grand, le nom, l’accroche, la légende de mode avec le prix, et un lien concret (« Voir la robe », « Voir le body », « Voir le top »). Au centre, la piqûre du pli.

**Le reportage.** La photographie de l’atelier sur toute la double page, puis « 31 h » de travail à la main pour une Robe Odessa, deux paragraphes justifiés et « Entrer dans l’atelier ».

**La lettre et le courrier.** À gauche, la lettre de saison. À droite, « Le courrier », l’accès à l’assistante de la Maison, comme la rubrique des lettres d’une revue.

**L’ours.** Ce que dit l’ours d’un magazine : qui l’a fait, où, en combien d’exemplaires. Le détail inattendu de l’accueil y est posé (voir plus bas).

## L’angle sur la fiche

**L’ouverture.** La photographie à fond perdu sur la page de gauche. En face, la rubrique, le nom de la pièce en `h1`, l’accroche et le bon de commande : prix, « Exemplaire N° 3 sur 5. Il en reste 3 à l’atelier. », tailles, guide des tailles, « Ajouter au panier » et « Garder ». À 1440 × 900, le bouton tombe dans le premier écran (vers 825 px). Au bas de la page, le numéro d’édition en très grand sert de folio. Sur téléphone, la barre d’achat fixe n’apparaît qu’une fois le bon de commande dépassé : elle ne cache jamais le titre.

**L’article.** Le titre face à l’exergue, puis la description sur deux colonnes, de part et d’autre du pli. Deux images ensuite : la pièce (le dos lacé) et le geste (une dentelle découpée aux ciseaux à broder, photographie de l’atelier, légendée comme telle).

**La planche d’atelier.** Une feuille réservée au croquis, aux traits de coupe, qui attend le scan de la créatrice ; aucun dessin inventé. En dessous, les notes de patronage en Inter Tight, tirées de la fiche (laçage, manches, traîne, doublure). En face, la fiche d’atelier : « 31 h » de travail, matière, doublure, coupe, mannequin, étapes et heures.

**Le pratique.** Entretien, livraison et retours en phrases complètes, lisibles sans clic, puis « Prendre rendez-vous » pour un essayage.

**La page suivante.** À la place de « Vous aimerez aussi », la pièce suivante du même numéro, avec son propre numéro d’édition.

## Les touches propres à Awrea

**La dentelle.** Un feston à picots (un fil d’un pixel et une petite boucle tous les 8 px) borde les folios et l’ours ; le halo de l’édito révèle la dentelle du fond ; au survol d’une page de pièce, la dentelle apparaît dans le numéro d’édition. Le curseur monogramme ne vit qu’au-dessus des photographies de dentelle.

**Les croquis et annotations.** Feuille réservée, traits de coupe, notes de patronage en texte. Rien n’est dessiné à la place de la créatrice.

**Le monogramme.** Chargement : il se dessine d’un trait fin dans la manchette à la première visite, puis l’encre le remplit (deux fois `--dur`, 1,6 s, rien ne bloque la page). Curseur : seulement au-dessus des photographies, à la souris, jamais au tactile ni en animations apaisées. Filigrane : dans le bon de commande, l’ours et la feuille réservée.

**Les numéros d’édition.** En titre géant sur chaque page de pièce, en folio au pied des pages de la fiche, dans le sommaire à la place des numéros de page.

**Un détail inattendu par page.** Sur l’accueil, l’ours donne le tirage du numéro : « Tirage de ce numéro : 29 pièces, numérotées à la main. Il en reste 8 à l’atelier. » Le mot de l’imprimerie dit exactement le nombre de pièces cousues. Sur la fiche, l’ours compare deux temps : « Lecture de cette page : 1 minute. Façon de cette robe : 31 heures, à la main. » Les deux sont calculés d’après le catalogue.

## Comment la proposition évite la liste noire

Le risque propre à mon angle est le code A6, la mise en page « magazine » générique. Je l’écarte par une règle fixe : chaque décalage vient de la double page (recto, verso, pli), chaque numéro numérote une chose vraie (rubrique du sommaire, édition, heures de façon), et l’achat n’est jamais replié derrière l’éditorial.

| Code | Ce que fait la proposition |
| --- | --- |
| A1 héros plein écran | Une couverture légendée, sans vidéo ni titre centré sur l’image ; un bouton concret. |
| A2 modules empilés | Un récit en rubriques, une idée et un appel par page. |
| A3, B1 carrousels et grilles | Aucun carrousel ni grille : chaque pièce a sa double page, entière, avec son numéro. |
| C1 galerie et colonne collante | Ouverture en double page ; le bon de commande est dans la page, à la mesure du texte. |
| C2 accordéons | Rien n’est replié : la matière, la façon et le pratique se lisent sans clic. |
| C4 recommandations | La page suivante du même numéro. |
| C6, G3 pictogrammes | Des phrases au vouvoiement. |
| D1, D2 en-tête | Monogramme à gauche, numéro en cours, cinq rubriques en mots, outils en mots ; sur téléphone, un sommaire clair au lieu du rideau noir. |
| E2, E3 typographie partagée | Les petites capitales ne servent qu’aux fonctions ; la voix passe par le texte justifié et les numéros. |
| E4 tics de studio | Pas de « (01) » ni de « Fig. » : chaque chiffre est une donnée. |
| F2 apparitions | Aucune ; la page est immobile. |
| F3 curseur, boutons magnétiques | Curseur limité aux photographies ; seul l’appel principal de l’accueil est magnétique (le bouton d’achat, pleine largeur, reste immobile). |
| F5 préchargeur | Le monogramme se dessine en place, dans la manchette, sans écran d’attente. |
| G2 bulle flottante | « Courrier », un mot dans la manchette et une page de la revue. |

## Ce qu’il faudrait changer dans les composants partagés

**`components/commerce/ProductForm.tsx`.** Le message d’état affiché après le choix d’une taille met un tiret long devant « expédiée sous » (ligne 86) ; la barre d’achat fixe est visible dès l’ouverture sur téléphone et masque le titre. Le bon de commande du laboratoire corrige les deux (textes sans tiret, barre affichée seulement après le bouton, même quand on remonte d’un coup).

**`components/commerce/WishlistButton.tsx`.** Le texte pour lecteur d’écran « : Robe Odessa, liste d’envies » met une espace ordinaire avant les deux-points (seul écart relevé par les règles d’écriture sur mes pages).

**En-tête, menu, pied de page.** `Header` et `Menu` deviendraient la manchette (`_components/Manchette.tsx`) ; `Footer` deviendrait l’ours (`_components/Ours.tsx`), avec l’interrupteur Jour, Nuit, Auto.

**`components/assistant/Assistant.tsx`.** Retirer la pastille `assistant-launcher` et ouvrir `AssistantPanel` depuis « Courrier » (`_components/Courrier.tsx`, un seul panneau monté par page).

**Nouveaux éléments partagés.** La rangée « double page » (`.double`, quatorze pistes, pli) dans `styles/layout.css` ; `Folio`, `FiletPicot` et `ChiffreEdition` dans `components/signature/` ; le tracé du monogramme et le curseur monogramme. Le marqueur de première visite irait dans le script de `<head>` du site (`lib/prefs.ts`) plutôt que dans la page.

**`components/atelier/Sketchbook.tsx`.** Il dessine des croquis provisoires inventés, contraires à la nouvelle règle de la créatrice ; la feuille réservée de la planche le remplacerait.

**Contenus.** `_components/textes.ts` devient des documents `content/site/fr/`. Il faut aussi un champ « exergue » par pièce (métachamp Shopify) et des légendes par photographie.

**`MARQUE.md` (proposition au chef de projet).** Inscrire la règle « le folio d’une pièce est son numéro d’édition ». Nommer l’accès à l’assistante « Courrier », et la première rubrique « Les pièces » plutôt que « Boutique ».

## Captures

Pleine page, dans `docs/design/da-edition/` : `accueil-ordinateur.jpg` (1440 px), `accueil-mobile.jpg` (390 px), `piece-ordinateur.jpg` (1440 px), `piece-mobile.jpg` (390 px). En complément : `accueil-nuit-ordinateur.jpg` et `piece-nuit-ordinateur.jpg` (mode Nuit), `detail-survol-dentelle-ordinateur.jpg` (dentelle dans le numéro et curseur monogramme), `detail-monogramme-trace.jpg` (le monogramme en train de se dessiner). La pastille « N » en bas à gauche est l’indicateur du serveur de développement, absent du site.

## Compte rendu

**Date.** 14 et 15 octobre 2026.

**Fait.** Accueil et fiche en code dans le laboratoire, avec les vraies pièces et les services du site (panier, liste d’envies, assistante, préférences d’affichage). Contrôles passés sur mes pages : `npx tsc --noEmit` et `npx eslint "app/(lab)/lab/da-edition"` propres ; `npm run audit:tokens` sans écart, et les mêmes règles appliquées à mon module CSS sans écart. L’audit d’homogénéité du site (`tests/e2e/design-audit.ts`) a tourné sur mes deux pages à 360, 768 et 1440 px, en Jour et en Nuit : deux familles, aucun italique, aucun doré, grille de 8 px, interlignage 1,6, mesure de 45 à 75 caractères, espaces des paragraphes justifiés au plus 1,61 fois l’espace naturel. Axe (WCAG 2.1 AA) ne relève aucune violation, chaque page a un seul `h1`. Les règles d’écriture tournent sur le texte rendu (`lib/writing/rules.ts`) avec un seul écart, venu du composant partagé cité plus haut. Les parcours ont été vérifiés : taille, ajout au panier, barre d’achat, sommaire au clavier, courrier. Trois séries de captures, avec des corrections entre chaque.

**Reste.** Le jugement du critique design et du gardien de la marque. Les vrais croquis scannés, à poser dans la feuille réservée. Une seconde photographie de face ou de détail pour chaque pièce (toutes les photographies d’Odessa montrent le dos). La confirmation des heures de façon, encore provisoires dans le catalogue de démonstration. L’ajout éventuel des pages du laboratoire à `tests/e2e/homogeneite.spec.ts` si la direction est retenue.

**Problèmes.** Le serveur de développement s’est arrêté deux fois (dont un redémarrage provoqué par une modification de `next.config.ts` par une autre équipe) ; je l’ai relancé sur le port 3100 comme le prévoit le brief. Le magasin local de démonstration (`.data/store.json`) contient une pièce de test, « Top Test 8kni », rattachée à Lace is more ; elle apparaît aussi sur l’accueil du site en développement. Je l’écarte dans le laboratoire, mais il faudrait nettoyer ce magasin ou isoler celui des tests. Des fichiers partagés ont changé pendant mon travail (`Media`, types, contenus) ; je n’ai rien modifié hors de mon dossier et de mes livrables. Aucun commit.
