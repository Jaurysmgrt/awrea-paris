# Veille design 2026 — sites de mode et de luxe primés

> **Archive.** La typographie et les règles décrites ici sont remplacées par les ressources
> officielles de la Maison (`RESSOURCES.md` : polices Fraunces 72pt Italic et Cormorant Garamond,
> logo officiel, langage des maquettes), puis par `MARQUE.md` et `DESIGN.md`. Les séries numérotées,
> le stock et les anciennes collections cités plus bas n'existent plus (pièces créées sur demande).
> Document gardé pour l'historique, sans mise à jour.

> **Mise à jour du 13/10/2026** : la direction artistique a changé (`MARQUE.md`) — aucun doré,
> Instrument Serif et Inter Tight. Les mentions « noir et or », Bodoni ou calligraphie ci-dessous
> sont historiques ; les arbitrages de la deuxième veille sont dans `docs/equipes/design/arbitrages.md`.

> Réalisée le 13 octobre 2026 pour Awrea Paris, avant la finalisation du design.
> Sources consultées : listes et palmarès Awwwards (catégories Fashion et Luxury, Sites of the Day),
> articles de presse spécialisée. SiteInspire et Godly n'étaient pas accessibles depuis l'environnement
> de travail (accès réseau refusé) : leurs sélections n'ont pas pu être vérifiées directement.

## Ce qui a été primé en 2026 (mode et luxe)

| Site | Distinction | Ce qu'il propose |
|---|---|---|
| Max Mara — *The Jacket Circle* (Adoratorio Studio) | Awwwards Site of the Day, 16 avril 2026 | Jeu 3D en WebGL autour de la veste Olimpia, ludification |
| Detroit Paris (Thomas Carré) | Awwwards Site of the Day, 27 avril 2026 | — (fiche détaillée non consultable) |
| Gucci — *La Famiglia : Mystery Unfolds* (MONOGRID) | Awwwards Site of the Day, 17 juin 2026 | Enquête interactive autour des personnages du lookbook |
| Miu Miu — *A House that we shaped* | Awwwards (mention, juillet 2026) | On explore une maison et ses objets pour découvrir les sacs |
| Lacoste — *Polo Factory* | Awwwards Site of the Day, 21 juillet 2026 | Expérience de fabrication du polo |
| Brunello Cucinelli — boutique « Callimacus » | Lancée en janvier 2026, très commentée | Pas de pages classiques : l'intelligence artificielle suit l'intention de la cliente et compose l'expérience en temps réel |

Observations complémentaires relevées dans la presse et les études de tendances 2026 : boutique
pensée comme une galerie plutôt qu'un catalogue (Bottega Veneta), retenue du « quiet luxury »,
récit éditorial, vidéo sur les fiches produits, accès réservés aux clientes privilégiées, tunnel
d'achat mobile court.

## Ce que nous en retenons pour Awrea Paris

| Tendance | Décision | Où |
|---|---|---|
| Quiet luxury | Le monogramme n'apparaît qu'à trois endroits : en-tête, pied de page, écran d'ouverture (première visite). Il quitte la transition entre les pages. | `Header`, `Footer`, `OpeningScreen` |
| Esprit galerie | Grands vides, grilles asymétriques, légendes discrètes sous les images (« Fig. », matière, numéro) | `Media` (`caption`), pages éditoriales |
| Typographie géante | Titres d'ouverture à l'échelle de l'écran, contraste serif géant / petites capitales espacées, apparition lettre à lettre au chargement | `SplitTitle`, `.t-giant` |
| Vidéo qui a du sens | Vidéo de tombé sur chaque fiche ; vignette vidéo au survol dans la boutique (seulement sur ordinateur, chargée à l'approche) | `ProductCard`, `ProductGallery` |
| Mode sombre assumé | Version noire complète (noir et blanc cassé, aucun doré depuis le 13/10/2026), automatique selon le réglage du téléphone, interrupteur élégant | `ModeToggle`, `tokens.css` |
| Coulisses | Croquis, essayages et gestes de l'atelier sur l'accueil, les collections, les fiches, le panier et la confirmation | `AtelierNote`, fiches |
| Micro-interactions natives | Retour visuel immédiat, boutons magnétiques discrets, squelettes ivoire au chargement | `Magnetic`, `.skeleton` |
| Rythme lent | Animations amples (durées longues), achat toujours en peu d'étapes | jetons `--dur-*` |
| Personnalisation invisible | L'ordre des pièces s'adapte (avec accord) sans bandeau « recommandé pour vous » | accueil, boutique |
| Éco-conception | Pages légères, vidéos compressées, deux familles de polices par page au plus, région de calcul bas carbone, empreinte affichée dans le pied de page | `Footer`, `vercel.json` |

## Ce que nous écartons

Les expériences 3D ludifiées des grandes maisons (jeux, enquêtes) font l'événement mais pèsent lourd et
détournent du vêtement : à l'échelle d'Awrea Paris, la matière et le geste suffisent. Couleurs saturées,
esthétique Y2K, brutalisme, néomorphisme, claymorphisme, collages et effets gadgets sont exclus : ils ne
correspondent pas à l'ADN de la marque.

## Deuxième veille — liste noire (pour le processus de design multi-agents)

> Agent Veille, 13/10/2026. Détail, sources et sites : [`equipes/design/liste-noire.md`](equipes/design/liste-noire.md).

- **Méthode** : 25 sites examinés ; aucune page n'a pu être chargée (outil de lecture en échec DNS) :
  sources indirectes datées (agences, presse, Awwwards, Baymard) et souvenirs signalés comme non
  revérifiés. Godly et SiteInspire restent inaccessibles.
- **Codes les plus répandus** : héros plein écran à titre centré, logo centré et quatre pictogrammes,
  accueil en modules empilés, grille de 3 à 4 colonnes avec seconde image au survol, fiche « galerie
  à gauche, colonne collante à droite », accordéons, carrousels de recommandation, petites capitales
  espacées, bandeau d'annonce et remise de bienvenue, mouvements des sites primés.
- **Codes à garder** : prix visible, achat à portée sur téléphone, mesures et guide des tailles,
  informations complètes avant paiement, tunnel court, navigation visible, pages rapides, accessibilité.
- **À arbitrer** : des choix retenus plus haut figurent dans la liste noire (apparition lettre à lettre,
  boutons magnétiques, vidéo au survol, typographie géante, légendes « Fig. », grilles asymétriques) ;
  la « version noir et or » contredit `MARQUE.md` (aucun doré). Autres points : section 6 de la liste.
