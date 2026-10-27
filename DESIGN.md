# DESIGN — Awrea Paris

Référence visuelle du site pour les équipes (développement, design, contenu). `MARQUE.md` tranche en
cas de doute ; les valeurs exactes vivent dans `styles/tokens.css` (jamais de valeur en dur :
`npm run audit:tokens`) ; l'inventaire et les droits des fichiers de la Maison sont dans
`RESSOURCES.md`.

## Ressources officielles (octobre 2026)

Les ressources de la Maison (`ressources-awrea/`, jamais modifiées) priment sur toute consigne
antérieure. Le design system en tire ses polices, son logo et le langage de ses maquettes
(`ressources-awrea/DA PRÉSENTATION/` : EN-TÊTE DU SITE, BAS DE PAGE, PAGE PRODUIT, FORMULAIRE
CONTACT, NEWSLETTER), étendu à toutes les pages.

### Polices

| Rôle | Police | Fichier du site | Token CSS |
| --- | --- | --- | --- |
| Grands titres (h1 à h3, `.t-h3` à `.t-giant`, `.t-display`), 28 px et plus | Fraunces 120pt Light, 300, droite (choix de la créatrice du 27/10/2026) | `styles/fonts/fraunces-120pt-light-latin.woff2` | `--font-display`, `--font-style-title`, `--font-weight-title` |
| Petits titres (h4, `.t-h4`, questions de la FAQ, lettres, signatures), 25 px | Fraunces 72pt Italic, 400, en italique | `styles/fonts/fraunces-72pt-italic-latin.woff2` | `--font-display`, `--font-style-display` |
| Textes, navigation, boutons, formulaires, prix | Cormorant Garamond Regular, 400 | `styles/fonts/cormorant-garamond-latin-400.woff2` | `--font-body` (ancien nom gardé : `--font-sans`) |

- Chargées par `next/font/local` (`app/fonts.ts`) : les familles s'appellent `fraunces` et
  `cormorant` dans le CSS ; aucun appel extérieur. Licences OFL jointes.
- Deux faces de Fraunces dans une seule famille (le style et la graisse choisissent la face), une
  face de Cormorant : `font-synthesis: none` (`styles/base.css`) interdit au navigateur d'inventer un
  gras ou un italique. Une règle qui pose `--font-style-title`, `--font-weight-title` ou
  `--font-style-display` doit aussi poser `--font-display`, et une règle qui pose `--font-body`
  remet `font-style: normal` : sans cela, un titre composé en étiquette (`<h2 class="t-label">`)
  garderait le style des titres (vérifié par `npm run audit:tokens`).
- Fraunces 72pt est dessinée pour le grand format : à côté de Cormorant, elle paraît trop noire
  sous 25 px. Elle n'est jamais employée plus petit (24 px dans les e-mails, 18 points dans les
  PDF) : en dessous, Cormorant. Les noms de pièces dans les cartes, les lignes du panier et des
  commandes se composent en Cormorant, comme « Le body Aura » sur la maquette PAGE PRODUIT.
- La police du logo (Croisan, licence personnelle) n'est jamais chargée : le logo s'affiche à
  partir des fichiers officiels.
- PDF (factures, étiquettes de retour) : les TTF officiels dans `assets/pdf/`
  (`Fraunces72pt-Italic.ttf`, `CormorantGaramond-Regular.ttf`), lus par pdf-lib, avec le logo
  officiel (`public/brand/awrea-logo.png`) ; `next.config.ts` les joint aux fonctions serveur.
- E-mails : les WOFF2 servis par `public/fonts/`, déclarés dans `lib/email/render.ts` et
  `lib/email/templates.ts`, repli sur `Georgia, serif` (Gmail, Outlook).

### Échelle typographique

Cormorant Garamond a un petit œil : le texte courant est à 20 px, rien ne descend sous 16 px. Les
tailles multiples de 5 px gardent l'interlignage 1,6 sur la grille de 8 px.

| Token | Usage | Taille | Interlignage |
| --- | --- | --- | --- |
| `--text-step--2` | étiquettes en capitales, fil d'Ariane, pastilles | 16 px (minimum) | 24 px |
| `--text-step--1` | notes, aides et libellés des champs, tableaux, options | 18 px | 32 px (`--leading-note`, la ligne du texte courant) ; 24 px sur une seule ligne (`--leading-label`) |
| `--text-step-0` | texte courant, navigation, liens, boutons, champs, prix | 20 px | 32 px |
| `--text-step-1` | chapeaux (`.t-lead`) ; petits titres en Fraunces (`.t-h4`, questions de la FAQ) | 25 px | 40 px (chapeaux) ; 32 px (`--lh-step-1`, titres) |
| `--text-step-2` à `--text-step-6` | titres en Fraunces (`.t-h3` à `.t-giant`) | 28 à 144 px selon l'écran | serré, multiples de 8 (`--lh-step-*`) |

| Titre | Téléphone | Tablette | Portable | Ordinateur (1440 px) |
| --- | --- | --- | --- | --- |
| `.t-display` (en-têtes de page) | 48 / 56 | 64 / 72 | 80 / 88 | 96 / 104 |
| `.t-giant` (pages éditoriales) | 56 / 64 | 80 / 88 | 112 / 120 | 144 / 152 |
| `.t-h1` | 40 / 48 | 56 / 64 | 72 / 80 | 88 / 96 |
| `.t-h2` | 32 / 40 | 40 / 48 | 48 / 56 | 56 / 64 |
| `.t-h3` | 28 / 32 | 32 / 40 | 32 / 40 | 32 / 40 |
| `.t-h4` | 25 / 32 | 25 / 32 | 25 / 32 | 25 / 32 |

- Interlignages toujours sur la grille de 8 px : 18 × 1,6 = 28,8 px en sortirait, les notes prennent
  donc la ligne du texte courant (32 px). `--leading-tight` et `--leading-snug` (titres de taille
  libre, h1 à h4 sans classe) arrondissent leur rapport au multiple de 8 px supérieur ; les titres
  du design system utilisent les `--lh-step-*` de leur palier.

- Mesure : `--measure: 24.5em`, soit 65 caractères de Cormorant (chasse moyenne d'un texte
  français : 0,378 em) ; `--container-text: 31rem` (496 px). Corps de texte (`p.t-body`, textes
  des pages `.prose`) justifiés sur tablette et ordinateur, avec césure automatique et dernière ligne
  au fer à gauche ; alignés à gauche sur téléphone (choix de la créatrice du 27/10/2026). Chapeaux,
  notes, textes centrés et lignes courtes (`.t-left`) jamais justifiés.
- Justification sans trou (`components/ui/Justification.tsx`, `lib/typo/cesure.ts`) : sur tablette
  et ordinateur, après l'affichage, les mots de 7 lettres et plus reçoivent leurs coupures possibles
  (motifs de césure du paquet `hyphen`, français ou anglais britannique, trois lettres au moins de
  chaque côté, jamais une majuscule, une adresse, un lien ou un chiffre) ; puis chaque paragraphe
  essaie de très légères variations d'interlettrage (±0,015 em) et d'espace entre les mots (−0,04 em)
  et garde celle dont le plus grand espace est le plus petit. Une colonne de moins de 50 caractères
  par ligne, ou un paragraphe dont un espace dépasse encore 2 fois l'espace normal, passe au fer à
  gauche (`data-justif="gauche"`). Rien sur téléphone ni dans l'Édition. Mesure du 27/10 sur
  15 pages et 3 largeurs : plus grand espace médian 1,18 fois l'espace normal (1,68 avant), 90 %
  sous 1,5 (3,02 avant), aucun au-delà de 2 (11,6 avant).
- Interlettrage : titres `-0,01 em` ; navigation, liens et boutons en bas de casse `0,02 em`
  (`--tracking-snug`) ; capitales `0,08 em` (`--tracking-label`).
- Chiffres : Cormorant a des chiffres elzéviriens, gardés dans le texte ; les prix et les tableaux
  passent en chiffres alignés (« 70,00 € »).

### Couleurs

Inchangées : noir `#0A0A0A`, blanc cassé `#F7F6F3`, gris pierre `#E4E2DD`, gris taupe `#8C8780`.
La dorure fait partie de l'identité dans les mots, les photos et les bijoux, jamais comme couleur de
l'interface.

### Langage des maquettes : les primitives

| Maquette | Primitive | Détail |
| --- | --- | --- |
| Bouton « Submit » (contact, lettre) | `.btn` | noir plein en pilule, texte blanc cassé 20 px ; au survol un aplat clair monte et il devient un filet ; mode Nuit et fond noir : inversé. `.btn--block` pleine largeur ; `.btn--outline` action secondaire (filet noir en pilule) ; `.btn--link` lien souligné. `.btn--solid` : ancien nom, identique à `.btn`. Un seul bouton plein par groupe : avant les ressources officielles, `.btn` seul était l'action secondaire, ces usages passent en `.btn btn--outline`. Paiement express (`.express__btn`) : au filet, plein une fois choisi |
| Champs « Prénom * », « E-mail * » | `.field`, `.field__label`, `.field__input`, `.field-row` | sans cadre, étiquette au-dessus en bas de casse, un filet dessous (taupe foncé, 3:1 au moins) ; focus : filet noir doublé, sans décalage, et un contour transparent qui devient l'anneau de focus en contraste forcé ; erreur : filet en tirets et message `.field__error` écrit sous le champ ; `.field-row` met deux champs côte à côte dès 768 px |
| Case « Je souhaite m'inscrire » | `.check` | carré au filet, anneau de focus de 2 px |
| Pastille « Nouveau » | `.badge` | noire en pilule, texte blanc cassé 16 px ; `.badge--outline` filet seul |
| Filet du pied de page | `.rule--center` | filet noir centré (blanc cassé en mode Nuit), précédé du logo simplifié « AW » (monogramme officiel, `.site-footer__mark`, 27/10/2026) ; `.rule--ink` pleine largeur ; `.rule` séparateur discret |
| Liens du pied de page | `.link.link--quiet` | sans soulignement, un filet n'apparaît qu'au survol (27/10/2026) |
| Envies sur les photos | `WishlistButton`, `.wish__mark` | petit cœur au fil en haut à droite de la photo, plein une fois gardé (le cœur remplace le losange le 27/10/2026) |
| Panier latéral | `CartDrawer`, `.drawer`, `.cart-line` | photo, nom et prix ; taille et « Retirer » sur une ligne ; délai ; « Quantité » écrit en clair devant − 1 + ; détail des montants dans la zone qui défile, le pied ne garde que le total et « Commander » ; la pièce ajoutée est amenée à l'écran |
| Fondu entre les pages | `PageTransition`, `.page-fade` | voile blanc cassé (noir de la nuit en mode Nuit) : couvre en 0,35 × `--dur`, s'efface en 0,6 × `--dur` ; navigation immédiate en animations apaisées |
| Sommaire des pages légales | `LegalView`, `.legal__toc` | deux niveaux (rubriques numérotées quand les titres ne le sont pas, intertitres en retrait) ; à gauche du texte et toujours visible sur ordinateur, au-dessus sur téléphone |
| Cartes de la page collection | `.media--card`, `.product-card__media` | photo aux angles arrondis (16 px) ; `.media--soft` pour les vignettes (8 px) |
| Carte « Le body Aura, 70,00 € » | `components/commerce/ProductCard.tsx`, `.product-card__body` | sous la photo, au fer à gauche : la pastille « Nouveau », le nom en Cormorant 20 px (`.t-body`), le prix à la ligne, puis le délai de fabrication (`.product-card__lead`) |
| Mention « visuel provisoire » | `ProvisionalNote`, `.visuel-provisoire` | note de 18 px en texte secondaire, sur sa ligne, juste sous la photo provisoire, jamais en surimpression ; `Media` l'ajoute avec la prop `provisoire` |
| Titres « Contact », « Collection Hypnotic Lace » | `PageHeader` (`.page-head--center`) | très grand titre en Fraunces 120pt Light, centré ; `align="left"` quand une photo ou un formulaire l'accompagne ; `giant` pour les pages éditoriales |
| Filtres « Catégorie + », « Prix + » | `.disclosure` | intitulé en bas de casse, filet fin dessous, « + » fermé, « − » ouvert ; `.disclosure--question` (FAQ) : question en Fraunces 25 / 32 px |
| Navigation « Accueil », « Collections ⌄ » | `.link`, `.t-nav` | Cormorant 20 px en bas de casse ; la page en cours reste soulignée, `.link--quiet` ne se souligne qu'au survol |
| En-tête du site | `components/layout/Header.tsx`, `Menu.tsx` (`HeaderBar`) | collant : le logo entier centré au-dessus des cinq entrées centrées, puis, au défilement, une bande compacte avec le monogramme et la même navigation ; navigation visible dès 768 px, menu plein écran (`<dialog>`) sur téléphone ; entrées dans `content/site/fr/navigation.json` |
| Chevron « ⌄ » des menus | `components/ui/Chevron.tsx`, `.chevron` | le signe n'existe dans aucune des deux polices : trait fin en SVG, à la couleur du texte, décoratif (l'état est porté par `aria-expanded`) |
| Lettre « Suivez-nous » (maquette NEWSLETTER) | `NewsletterBlock`, `NewsletterForm` (`components/ui/NewsletterForm.tsx`) | surtitre, titre et formulaire complet (Nom, Prénom, E-mail, Téléphone facultatif, consentement, `.btn--block`) ; version compacte (`compact`) : e-mail et consentement, dans le pied de page ; textes dans `content/site/fr/site.json` (clé `lettre`) |
| Intitulés « LA MARQUE », « SERVICE CLIENT » | `.t-label`, `.eyebrow` | capitales 16 px, interlettrage mesuré |
| Tailles, options | `.chip`, `.segmented` | pilules au filet, pleines une fois choisies |
| Prix « 70,00 € » | `.price` | 20 px, chiffres alignés |
| Nom de pièce « Le body Aura » (cartes, lignes) | `.t-body` ou la classe de la carte | Cormorant 20 px, comme la maquette ; jamais Fraunces sous 25 px |
| Logo | `components/brand/Logo.tsx`, `.logo-mask` | fichier officiel en masque, couleur du texte ; proportions du fichier (708:293 pour le logo entier, 380:325 pour le monogramme) ; le conteneur fixe la hauteur (`--logo-h` : `--size-logo`, 48 px, dans l'Atelier, le bon de livraison et le pied de page ; jamais moins, sinon « PARIS » devient illisible) ; nom accessible « Awrea Paris » ; e-mails : le fichier PNG (`awrea-logo-blanc.png` sur la bande noire), jamais une police |

Chaque primitive suit le mode Nuit par les rôles de couleur (`--fg`, `--bg`, `--fg-soft`, `--line`)
et les animations apaisées par la durée unique (`--dur`).

### Contrôles automatiques

- `npm run audit:tokens` : valeurs en dur, italique hors de la police des titres, police des
  textes sans style droit, Fraunces sous 25 px, notes de 18 px à 1,6, polices retirées
  (Instrument Serif, Inter Tight, General Sans) et police du logo (code, contenus, gabarits
  d'e-mails de Supabase), arrondis hors des tokens `--radius-*`, tailles de texte sous 16 px,
  interlignages des tokens hors de la grille, fichiers de `styles/fonts`.
- `tests/e2e/homogeneite.spec.ts` (avec `tests/e2e/design-audit.ts`) : sur téléphone, tablette et
  ordinateur, seulement les familles `fraunces` et `cormorant`, l'italique réservé aux titres en
  Fraunces, aucun texte sous 16 px, interlignage 1,6 des paragraphes en Cormorant (notes de 18 px
  sur 32 px), grille de 8 px, paragraphes alignés à gauche sur téléphone, justifiés au-delà
  seulement sans espace de plus de 2 fois l'espace normal et avec 50 caractères par ligne au moins,
  75 caractères par ligne au plus, et
  chaque texte aligné sur le bord de son titre (2 px près).

## Propositions de design antérieures

Les trois directions artistiques d'octobre 2026 (dentelle, atelier, édition) restent documentées
dans `docs/equipes/design/` avec leurs captures dans `docs/design/`. Leur laboratoire (`app/(lab)`)
a été retiré du site à l'arrivée des ressources officielles ; il est conservé sur la branche
`archive/avant-ressources-officielles`.
