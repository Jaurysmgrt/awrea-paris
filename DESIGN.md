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
| Titres (h1 à h4, `.t-h1` à `.t-giant`, `.t-display`) | Fraunces 72pt Italic, 400, en italique | `styles/fonts/fraunces-72pt-italic-latin.woff2` | `--font-display`, `--font-style-display` |
| Textes, navigation, boutons, formulaires, prix | Cormorant Garamond Regular, 400 | `styles/fonts/cormorant-garamond-latin-400.woff2` | `--font-body` (ancien nom gardé : `--font-sans`) |

- Chargées par `next/font/local` (`app/fonts.ts`) : les familles s'appellent `fraunces` et
  `cormorant` dans le CSS ; aucun appel extérieur. Licences OFL jointes.
- Une seule face par police : `font-synthesis: none` (`styles/base.css`) interdit au navigateur
  d'inventer un gras ou un italique. L'italique n'existe que pour les titres ; une règle qui pose
  `--font-style-display` doit aussi poser `--font-display` (vérifié par `npm run audit:tokens`).
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
| `--text-step--1` | notes, aides et libellés des champs, tableaux, options | 18 px | 1,6 |
| `--text-step-0` | texte courant, navigation, liens, boutons, champs, prix | 20 px | 32 px |
| `--text-step-1` | chapeaux (`.t-lead`), petits titres (`.t-h4`) | 25 px | 40 px |
| `--text-step-2` à `--text-step-6` | titres en Fraunces (`.t-h3` à `.t-giant`) | 24 à 144 px selon l'écran | serré, multiples de 8 (`--lh-step-*`) |

| Titre | Téléphone | Tablette | Portable | Ordinateur (1440 px) |
| --- | --- | --- | --- | --- |
| `.t-display` (en-têtes de page) | 48 / 56 | 64 / 72 | 80 / 88 | 96 / 104 |
| `.t-giant` (pages éditoriales) | 56 / 64 | 80 / 88 | 112 / 120 | 144 / 152 |
| `.t-h1` | 40 / 48 | 56 / 64 | 72 / 80 | 88 / 96 |
| `.t-h2` | 32 / 40 | 40 / 48 | 48 / 56 | 56 / 64 |

- Mesure : `--measure: 24.5em`, soit 65 caractères de Cormorant (chasse moyenne d'un texte
  français : 0,378 em) ; `--container-text: 31rem` (496 px). Paragraphes justifiés, césure
  française ; la justification régulière (`components/typography/Justification.tsx`) mesure l'espace
  naturel dans la police réelle du paragraphe.
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
| Bouton « Submit » (contact, lettre) | `.btn` | noir plein en pilule, texte blanc cassé 20 px ; au survol un aplat clair monte et il devient un filet ; mode Nuit et fond noir : inversé. `.btn--block` pleine largeur ; `.btn--outline` action secondaire (filet noir en pilule) ; `.btn--link` lien souligné. `.btn--solid` : ancien nom, identique à `.btn` |
| Champs « Prénom * », « E-mail * » | `.field`, `.field__label`, `.field__input`, `.field-row` | sans cadre, étiquette au-dessus en bas de casse, un filet dessous (taupe foncé, 3:1 au moins) ; focus : filet noir doublé, sans décalage ; erreur : filet en tirets et message `.field__error` écrit sous le champ ; `.field-row` met deux champs côte à côte dès 768 px |
| Case « Je souhaite m'inscrire » | `.check` | carré au filet, anneau de focus de 2 px |
| Pastille « Nouveau » | `.badge` | noire en pilule, texte blanc cassé 16 px ; `.badge--outline` filet seul |
| Filet du pied de page | `.rule--center` | filet noir centré (blanc cassé en mode Nuit) ; `.rule--ink` pleine largeur ; `.rule` séparateur discret |
| Cartes de la page collection | `.media--card`, `.product-card__media` | photo aux angles arrondis (16 px) ; `.media--soft` pour les vignettes (8 px) |
| Titres « Contact », « Collection Hypnotic Lace » | `PageHeader` (`.page-head--center`) | très grand titre en Fraunces italique, centré ; `align="left"` quand une photo ou un formulaire l'accompagne ; `giant` pour les pages éditoriales |
| Filtres « Catégorie + », « Prix + » | `.disclosure` | intitulé en bas de casse, filet fin dessous, « + » fermé, « − » ouvert |
| Navigation « Accueil », « Collections ⌄ » | `.link`, `.t-nav` | Cormorant 20 px en bas de casse ; la page en cours reste soulignée, `.link--quiet` ne se souligne qu'au survol |
| Intitulés « LA MARQUE », « SERVICE CLIENT » | `.t-label`, `.eyebrow` | capitales 16 px, interlettrage mesuré |
| Tailles, options | `.chip`, `.segmented` | pilules au filet, pleines une fois choisies |
| Prix « 70,00 € » | `.price` | 20 px, chiffres alignés |
| Logo | `components/brand/Logo.tsx`, `.logo-mask` | fichier officiel en masque, couleur du texte ; proportions du fichier (708:293 pour le logo entier, 380:325 pour le monogramme) ; le conteneur fixe la hauteur ou la largeur ; nom accessible « Awrea Paris » |

Chaque primitive suit le mode Nuit par les rôles de couleur (`--fg`, `--bg`, `--fg-soft`, `--line`)
et les animations apaisées par la durée unique (`--dur`).

### Contrôles automatiques

- `npm run audit:tokens` : valeurs en dur, italique hors de la police des titres, polices
  retirées (Instrument Serif, Inter Tight, General Sans) et police du logo, arrondis hors des
  tokens `--radius-*`, tailles de texte sous 16 px, fichiers de `styles/fonts`.
- `tests/e2e/homogeneite.spec.ts` (avec `tests/e2e/design-audit.ts`) : sur téléphone, tablette et
  ordinateur, seulement les familles `fraunces` et `cormorant`, l'italique réservé aux titres en
  Fraunces, aucun texte sous 16 px, interlignage 1,6 des paragraphes en Cormorant, grille de 8 px,
  justification sans trous et 45 à 75 caractères par ligne.

## Propositions de design antérieures

Les trois directions artistiques d'octobre 2026 (dentelle, atelier, édition) restent documentées
dans `docs/equipes/design/` avec leurs captures dans `docs/design/`. Leur laboratoire (`app/(lab)`)
a été retiré du site à l'arrivée des ressources officielles ; il est conservé sur la branche
`archive/avant-ressources-officielles`.
