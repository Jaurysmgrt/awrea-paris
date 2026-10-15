# Proposition « atelier » du directeur artistique 2

14 octobre 2026. Proposition à juger par le critique design et le gardien de la marque, sans livraison avant le feu vert du chef de projet. Pages du laboratoire `/lab/da-atelier` (accueil) et `/lab/da-atelier/piece` (robe Odessa). Code dans `app/(lab)/lab/da-atelier/`.

## Le concept en cinq lignes

La page est une table de coupe. On y lit les signes que la créatrice trace sur ses patrons, du trait de coupe au feston de la dentelle, et chaque signe garde un seul sens, rappelé par la légende du patron au pied de la page. Les photographies de la Maison y sont posées comme des pièces de patron, avec leurs crans, leur droit-fil et leurs cotes. La grande typographie est réservée aux chiffres de l’atelier, le numéro d’édition, les heures de façon, les centimètres. Rien n’est dessiné à la place de la créatrice, une feuille vide attend ses croquis.

## Principes

**Grille.** Douze colonnes et la grille de 8 px du design system. Sur grand écran, la première colonne est la valeur de couture. Elle ne reçoit que des signes, droit-fil et crans, jamais de texte. L’asymétrie vient de cette règle de patronage et non d’un décalage décoratif (arbitrage 3f). Sous l’en-tête, un mètre ruban rend la grille visible, un trait tous les 8 px.

**Typographie.** Instrument Serif pour les titres, le numéro d’édition et les mesures. Le très grand corps ne sert qu’aux chiffres réels, N° 3 / 5 ou 31 h (arbitrage 3d). Inter Tight pour le texte, les notes de patronage et les étiquettes. Les paragraphes justifiés tiennent 65 à 67 caractères par ligne sur ordinateur, et leurs espaces ne dépassent jamais 1,63 fois la largeur naturelle. Le titre principal est bâti. Ses lettres se posent une à une le long d’un fil et chacune laisse sous elle un point de couture (arbitrage 3a).

**Images.** Seulement les photographies de la Maison, dans `public/media`. Chacune est cernée d’un trait de coupe à 8 px, avec un cran simple pour une vue de devant et un cran double pour une vue de dos, comme sur un patron. Les annotations sont de petits renvois lettrés posés sur la pièce et expliqués dans la légende. L’image reste une œuvre, rien ne la traverse. Aucune illustration de remplacement, la place du croquis est une feuille prête pour le scan (règle 6 de la créatrice).

**Mouvement.** Une seule durée et une seule courbe, trois mouvements en tout et une page immobile autour d’eux. Le titre bâti au chargement. La vidéo de la pièce, révélée à travers une dentelle au survol d’une ligne du registre, en deux temps de la même durée (arbitrage 3c). Le halo, sur les sections noires et à la souris seulement (arbitrage 1). Pendant un chargement, le monogramme se dessine d’un trait. Le mode apaisé coupe tout.

## L’accueil en quatre temps

1. **Le trait.** Le titre bâti « Du premier trait au dernier point, fait main à Paris. », un court texte sur le chemin d’une pièce et un seul bouton plein, « Voir la robe Odessa ». À côté, la robe Odessa photographiée de dos, en pièce de patron, avec son droit-fil, le renvoi du laçage et la cote de la traîne. Dessous, N° 3 / 5 en très grand et la série en crans.
2. **La coupe.** Le registre des éditions remplace la grille de vignettes. Une ligne par pièce, avec sa photographie, sa matière, son numéro, sa série et son prix. Au survol, le mouvement de la pièce apparaît à travers la dentelle.
3. **Le point.** Une section noire avec le halo. Des mains épinglent une toile, et le temps de façon d’Odessa s’écrit en très grand, 31 h du croquis aux finitions, puis en une phrase étape par étape.
4. **Le numéro.** Le manifeste « Consommer plus juste » et la phrase de la créatrice citée telle quelle, signée du monogramme au trait.

Suivent les lettres de l’atelier, une invitation sans remise, et le pied de page avec la légende du patron.

## La fiche, dossier de la pièce

Le premier écran tient tout l’achat. Le titre bâti, la phrase d’accroche, l’échantillon de dentelle épinglé qui mène à la matière, la photographie en pièce de patron, N° 3 / 5 avec le prix sur la même ligne, la taille et « Ajouter au panier ». Sur un écran de 1440 × 900, le bouton se place entre 745 et 795 px. Dès qu’il quitte l’écran, la barre d’achat partagée devient une étiquette en bas à droite. Sur téléphone, c’est la barre habituelle.

Quatre planches suivent, chacune avec un message et une action. D’abord le dos, annoté de renvois tirés de la fiche, à côté de la feuille réservée au croquis. Puis la matière, avec la dentelle de près agrandie au clic, le bas de l’image découpé en feston, la vidéo du tombé et une notice d’entretien numérotée. Dans la mesure, le guide des tailles devient trois mètres rubans qui ne montrent que les tailles de la pièce, puis invite à l’essayage à l’atelier. Enfin la façon, en noir, avec une chaîne de cotes proportionnelles aux heures de travail. La silhouette « La nuit d’Odessa », avec le body Gaïa, ferme la fiche. Le conseil passe par un lien sobre, « Demander à l’atelier », à la place d’une bulle (arbitrage 9).

## Les touches propres à Awrea

1. **La dentelle.** Un feston sépare les grands temps de la page. Le bas de l’image de détail est découpé en feston. La vidéo du registre apparaît à travers une dentelle, et le halo révèle la dentelle cachée des sections noires.
2. **Les croquis et annotations.** Renvois lettrés, notes de patronage en Inter Tight, cotes, crans, droit-fil, et la feuille qui recevra le croquis scanné. Aucun dessin ne prend sa place en attendant.
3. **Le monogramme.** Curseur au-dessus de la dentelle et des pièces seulement, le pointeur système reste partout ailleurs, au tactile et en mode apaisé. Le AW se dessine pendant le chargement, signe le manifeste et filigrane le pied de page.
4. **Le numéro d’édition.** N° 3 / 5 en très grand, puis la série en crans. Pleins pour les exemplaires attribués, soulignés d’un point pour le prochain, ouverts pour les suivants. La phrase dit le fait sans presser, « Cinq exemplaires. Deux ont déjà trouvé leur place. »
5. **Le détail inattendu.** À l’accueil, un reste de la dentelle d’Odessa au pied de page, avec sa note « À l’atelier, les chutes deviennent des accessoires. ». Sur la fiche, une épingle plantée dans la dentelle du dos. Au survol, au clavier ou au toucher, elle déplie un mot du carnet de la créatrice, « La dentelle dit tout en cachant presque tout. »

## La liste noire, évitée

Pas de héros plein écran (A1), mais une pièce épinglée et légendée, avec ses chiffres. Ni modules empilés ni carrousel (A2, A3), mais quatre temps et un registre. La grille de vignettes (B1) et la seconde image au survol (B2) disparaissent, la photographie montre déjà la matière. Sans galerie empilée, colonne collante ni accordéons (C1, C2), la valeur se lit sans clic. Le tableau des tailles générique (C3) cède la place aux mètres rubans. Au lieu de « Vous aimerez aussi » (C4), la silhouette composée avec Odessa. L’en-tête n’a aucun pictogramme, le logo est à gauche et cinq mots suffisent (D1, D2). Aucun numéro ne numérote rien (E4), car renvois, crans et heures sont des données. Une seule apparition animée (F2), un curseur limité (F3), aucune bulle (G2). Et aucune illustration dessinée (H).

## À changer dans les composants partagés pour tout le site

1. `ProductForm` affiche un tiret de ponctuation dans le message de disponibilité, et le guide des tailles de sa fenêtre garde un deux-points sans espace insécable. `SizeFinder` fait de même avant un point-virgule, `CartDrawer` contient deux tirets, et `VideoLazy` nomme son bouton « Lire : … » sans espace insécable.
2. `ProductForm` gagnerait une option d’étiquette d’achat sur grand écran. Le laboratoire la montre par une surcharge CSS. Sa marge basse de 10 % impose de garder le bouton principal au-dessus de 810 px sur un écran de 900 px.
3. `LightHalo` suit le doigt au tactile, alors que l’arbitrage 1 l’en retire. Le laboratoire l’enveloppe dans `HaloDesktop`, à reprendre dans le composant.
4. En-tête et pied de page du site à aligner sur cette direction, avec le mètre ruban, les cinq mots, la légende du patron et le lien d’évitement.
5. Composants à verser au design system, `PatronPhoto`, `EditionSerie`, `MetreRuban`, `FaconChain`, `Cote`, `Feston`, `Swatch`, `SecretPin`, `Stitch`, ainsi que le curseur monogramme construit depuis `styles/tokens.ts`.
6. Les textes vivent déjà dans un seul module, `_components/textes.ts`, prêt à devenir des documents de l’éditeur Édition (`content/site/fr/`).
7. Le filtre `phrase()` du laboratoire ôte les deux-points des textes du catalogue à l’affichage. L’équipe Contenu doit plutôt reprendre ces textes à la source.
8. Le contrôle d’écriture en mode `--site` remplace les espaces insécables par des espaces ordinaires avant de vérifier (motif `\s+`), ce qui produit de faux signalements. À corriger par l’équipe Qualité.
9. À demander à la Maison, les croquis et patrons scannés, les mesures réelles de chaque pièce pour les cotes, les heures de façon et l’origine des matières.

## Mise à jour proposée pour MARQUE.md

MARQUE.md § 3 et l’arbitrage 8 prévoient des croquis provisoires dessinés au trait. La règle 6 de la créatrice interdit désormais toute image générée. Je propose d’écrire au § 3 qu’en attendant les scans, la place du croquis reste une feuille vide légendée, et que le site ne trace que les signes du patron (traits, cotes, crans, droit-fil).

## Captures

Dans `docs/design/da-atelier/`, `accueil-ordinateur.jpg` et `accueil-mobile.jpg`, `piece-ordinateur.jpg` et `piece-mobile.jpg` (pleine page, 1440 et 390 px), `accueil-nuit-ordinateur.jpg` et `piece-nuit-ordinateur.jpg` (premier écran en mode Nuit), `detail-epingle-ordinateur.jpg` (la note de la créatrice ouverte), `detail-etiquette-ordinateur.jpg` (l’étiquette d’achat) et `detail-menu-mobile.jpg`. Sur les captures pleine page de la fiche mobile, la barre d’achat apparaît au milieu, parce qu’elle est fixée en bas du premier écran.

## Vérifications faites

Types et lint sans erreur pour le dossier. Audit des tokens sans écart, et mêmes règles appliquées au module CSS, que le script officiel ne parcourt pas. Contrôle d’écriture sur les sources du dossier sans erreur ni conseil. Homogénéité conforme sur les deux pages à 360, 768 et 1440 px. Aucune violation axe en mode Jour, en mode Nuit et sur téléphone. Achat, panier, menu, épingle et dentelle agrandie essayés au clavier et à la souris.

## Compte rendu

**Fait.** Accueil et fiche construits avec les données réelles, captures, contrôles ci-dessus. Les dessins à plat d’Odessa, codés avant la règle 6, ont été retirés au profit des vraies photographies annotées et de la feuille réservée au croquis.

**Reste.** Jugement du critique design et du gardien de la marque, puis arbitrage du chef de projet. Scans des croquis et mesures des pièces à obtenir de la Maison.

**Problèmes.** Les écarts d’écriture restants sur les pages rendues viennent des composants partagés (point 1) ou du mode `--site` du contrôle (point 8). Une compilation de production tournait dans le même dossier pendant le travail, aucune n’a été lancée d’ici.
