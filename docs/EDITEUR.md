# L’éditeur « Édition »

Ce document décrit le fonctionnement de l’éditeur visuel du site, pour le guide de la créatrice
(`GUIDE-CREATRICE.md`) et pour l’équipe qui le fait vivre. L’éditeur s’ouvre depuis l’Atelier ›
**Pages** › **Modifier** : la page s’affiche telle que le public la voit, avec la barre « Édition »
en bas. Tout ce qui change reste en brouillon jusqu’à **Publier**.

## Photos provisoires

### Pour la créatrice

En attendant les prises de vue de la collection, certaines photos du site sont des visuels
d’attente : les photos des pièces générées à partir des modèles, et le visuel des sacs de la page
Contact, découpé dans une maquette. Sur le site, chacune porte la mention discrète « visuel
provisoire », juste sous la photo. Le portrait de la créatrice, lui, est une photographie
officielle : il n’est pas provisoire.

**Les repérer.** En mode Édition, une pastille noire « Provisoire » est posée sur chaque visuel
d’attente de la page. Le bouton **Photos provisoires** de la barre d’édition les liste tous, avec
la page où chacun paraît : ceux de la page ouverte d’abord (bouton **Remplacer**), puis ceux des
autres pages (bouton **Ouvrir la page**, qui reste en mode Édition). La même liste se retrouve dans
l’Atelier › **Pages** › **Voir les photos provisoires**, ou **Photos** › filtre **Photos
provisoires à remplacer**.

**Les remplacer.**

1. Cliquez sur la photo (ou sur **Remplacer** dans la liste), puis **Choisir une photo** ; vous
   pouvez aussi glisser la photo depuis votre ordinateur sur l’image de la page.
2. La nouvelle photo n’est plus provisoire : la case **Photo provisoire** se décoche toute seule,
   et la pastille disparaît.
3. Si la nouvelle photo est encore un visuel d’attente, cochez la case **Photo provisoire** avant
   d’enregistrer.
4. Écrivez ce que montre la photo, pour les personnes qui ne la voient pas, puis **Enregistrer**.
   Le public garde l’ancienne photo et sa mention tant que vous n’avez pas appuyé sur **Publier**.
   Dans la liste, la photo apparaît alors comme « Remplacée dans le brouillon, en ligne après
   « Publier » ».

**Une photo de la Maison déjà en place mais encore marquée provisoire** : cliquez dessus, décochez
**Photo provisoire**, enregistrez, puis publiez. La mention « visuel provisoire » quitte le site.

**Les photos des pièces et des collections** viennent du catalogue Shopify : elles se remplacent
dans la fiche de la pièce (ou de la collection) sur Shopify, où l’on décoche ensuite la case
« Visuels provisoires » (métachamp `awrea.visuels_provisoires`, `ACTIVATION.md`). La liste des
photos provisoires les montre aussi, avec leur page, pour n’en oublier aucune.

### Pour l’équipe

Un seul marqueur, `provisoire: true`, sur toute image :

| Où | Type | Fichier |
| --- | --- | --- |
| Catalogue (pièces, collections) | `Image` | `lib/commerce/types.ts` (Shopify : `awrea.visuels_provisoires`) |
| Documents de contenu, blocs, photos déposées | `Img` | `lib/edition/blocks.ts`, `lib/edition/medias.ts` |

Le marqueur n’est écrit que s’il vaut vrai (jamais `provisoire: false` dans un fichier) ; il n’est
jamais traité comme un texte par le mode Édition. Règles, textes de l’éditeur et types partagés :
`lib/edition/provisoires.ts` (module pur). Recensement de toutes les photos du site avec leur page
(documents, brouillons compris, dans chaque langue ; pièces ; collections) : `lib/edition/photos.ts`.

Remplacement : une photo choisie par un envoi (ou reprise de la médiathèque) n’est plus provisoire,
sauf si la créatrice a coché la case elle-même (`provisionalAfterReplace`). L’API du brouillon
(`app/api/gestion/edition/brouillon`) enregistre la case cochée ou décochée telle quelle (Zod :
`provisoire` booléen facultatif) et la reporte sur la photo de la médiathèque. L’API des photos
(`app/api/gestion/edition/medias`) accepte `provisoire=1` à l’envoi et, en lecture,
`?filtre=provisoires` pour la liste des photos à remplacer.

Rendu public : `components/ui/Media.tsx` reçoit une prop facultative `provisoire` qui ajoute la
mention « visuel provisoire » sous la photo (`components/commerce/ProvisionalNote.tsx`, texte
`visuelProvisoire` du document `catalogue`). Les composants qui affichent déjà la mention
(`components/home/Visuel.tsx`, cartes et galerie des pièces, panier, paiement, avant-premières,
liste des collections) ne la passent pas, pour ne pas la doubler. Les blocs de l’éditeur
(`components/edition/Blocks.tsx`) l’affichent pour chacune de leurs photos.

Éditeur : pastille sur les photos de la page (`components/edition/EditionMode.tsx`, classe
`.marque` posée sur le cadre `.media`), dans le panneau de la photo et la médiathèque
(`ImagePanel.tsx`), sur le texte d’une photo provisoire (`FieldPanel.tsx`), liste
« Photos provisoires à remplacer » (`Dialogs.tsx`). Atelier : `app/gestion/pages/photos` (filtre),
résumé dans `app/gestion/pages`.

Tests : `tests/unit/edition.test.ts` (marqueur, remplacement, états, visuels du dépôt marqués) et
`tests/e2e/edition.spec.ts` (pastille, filtre, remplacement par un envoi, brouillon invisible du
public).
