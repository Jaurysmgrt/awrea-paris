# Ressources officielles d'Awrea Paris

Le dossier `ressources-awrea/` est la copie du Google Drive de la Maison
(https://drive.google.com/drive/folders/1KR2evCx44ig9soiDKOAyn1KstTaglI_k), rapatriée le 15 octobre 2026.
Ces ressources priment sur toute consigne antérieure de typographie, de textes, de produits ou de mise
en page. Les originaux ne sont jamais modifiés : `npm run ressources` (scripts/ressources.py) prépare
les versions du site (polices WOFF2, logo, photos déclinées). Relancer la commande après avoir remplacé
un fichier.

## Inventaire

### TYPO

| Fichier | Contenu | Usage sur le site | Droits d'usage web |
| --- | --- | --- | --- |
| `POLICE TITRES.ttf` | Fraunces 72pt Italic, graisse 400 (Undercase Type), 683 glyphes | Les petits titres de 25 px (`--font-display`, `--font-style-display`). WOFF2 réduit aux alphabets latins : `styles/fonts/fraunces-72pt-italic-latin.woff2` (26 Ko) | SIL Open Font License 1.1 : usage web, incorporation et réduction autorisés, sans vente de la police seule ; licence jointe (`styles/fonts/OFL-fraunces.txt`). Aucun nom réservé. |
| `POLICE GRANDS TITRES.ttf` | Fraunces 120pt Light, graisse 300, droite (Undercase Type) : face statique tirée le 27/10/2026 de la police variable Fraunces de Google Fonts (taille optique 120, graisse 300, SOFT 0, WONK 1), à la demande de la créatrice (« Fraunces 120 Light ») | Les grands titres de 28 px et plus (`--font-display`, `--font-style-title`, `--font-weight-title`). WOFF2 réduit aux alphabets latins : `styles/fonts/fraunces-120pt-light-latin.woff2` (20 Ko), mêmes caractères que la police des titres | SIL Open Font License 1.1, comme la police des titres (`styles/fonts/OFL-fraunces.txt`). Aucun nom réservé. |
| `POLICE TEXTES.ttf` | Cormorant Garamond Regular, graisse 400 (Christian Thalmann, Catharsis Fonts), 2 818 glyphes | Police des textes jusqu'au 22/11/2026, remplacée par Avenir Next (choix de la créatrice du 23/11, ci-dessous). **Plus chargée par aucune page** ni aucun e-mail. Ses fichiers restent : TTF des factures et étiquettes PDF (`assets/pdf/CormorantGaramond-Regular.ttf`, intégré au PDF), WOFF2 de `public/fonts` pour les e-mails déjà envoyés, WOFF2 de `styles/fonts` | SIL Open Font License 1.1, mêmes libertés ; licence jointe (`styles/fonts/OFL-cormorant-garamond.txt`). |
| `POLICE LOGO.otf` | Croisan, édition « Personal Use » (Hishand Studio, Putu Dody Permana, 2024) | Réservée au logo et au monogramme. **Non chargée par le site** : le logo s'affiche à partir des fichiers officiels du dossier LOGO | Le fichier fourni est l'édition « Personal Use » ; la créatrice indique le 25/10/2026 avoir acheté la licence commerciale de Hishand Studio (https://hishandstudio.com/license) : garder la facture. Une licence de bureau ne couvre pas toujours l'usage en police web : le site continue de ne pas la charger. Le fichier n'est pas publié dans ce dépôt public (`.gitignore`) ; une version WOFF2 est préparée hors du site (`ressources-awrea/TYPO/web/`, ignorée par Git) pour le jour où la licence sera achetée. Le logo lui-même semble dessiné avec cette police : à vérifier avec l'éditeur. |

Les polices provisoires Instrument Serif, General Sans et Inter Tight sont retirées du site.

### Police des textes : Avenir Next (choix de la créatrice du 23/11/2026)

La créatrice veut Avenir Next Regular pour les textes, la navigation, les menus, les boutons, les
formulaires et les petits textes ; Fraunces reste pour les titres.

| Police | Où elle s'affiche | Fichier dans le projet | Droits d'usage web |
| --- | --- | --- | --- |
| Avenir Next Regular, graisse 400 (Adrian Frutiger et Akira Kobayashi, Linotype, aujourd'hui Monotype) | iPhone, iPad et Mac, où elle est installée d'origine : la pile des textes l'appelle par son nom (`"Avenir Next"`, puis `"Avenir"`, `--font-body`), sans fichier ni `@font-face` | **Aucun.** Elle n'est pas dans `ressources-awrea/` ni dans le dépôt, et la Maison n'a rien acheté | Police commerciale. L'appeler par son nom sur un appareil qui l'a déjà ne demande aucune licence. La servir à tous (Windows, Android) demande une **licence web** auprès de Monotype (MyFonts ou Monotype Fonts), à acheter par la Maison si elle le souhaite |
| Mulish Regular, graisse 400 (The Mulish Project Authors), police libre proche, sous son vrai nom | Windows, Android, Linux : partout où Avenir Next manque. Le navigateur ne la télécharge que dans ce cas (`preload: false`, `unicode-range`) | `styles/fonts/mulish-latin-400.woff2` (13 Ko), sous-ensemble latin de Google Fonts, pris dans le paquet npm `@fontsource/mulish` 5.3.0 (version 3.603 de la police), sans l'ajouter aux dépendances | SIL Open Font License 1.1 : usage web, incorporation et réduction autorisés ; licence jointe (`styles/fonts/OFL-mulish.txt`). Aucun nom réservé |

- Aucune police ne prend le nom d'Avenir : Mulish garde le sien (`mulish` dans le CSS), et
  `npm run audit:tokens` refuse tout `@font-face` au nom d'Avenir.
- **Emplacement prévu pour Avenir Next sous licence web**, si la Maison en achète une : ses fichiers
  WOFF2 dans `styles/fonts/avenir-next-*.woff2` et sa licence dans `styles/fonts/LICENCE-avenir-next.*`
  (noms déjà admis par `npm run audit:tokens`), déclarés dans `app/fonts.ts` comme Mulish (une
  constante `avenirNext`, sa variable CSS en tête de `--font-body`, avant `"Avenir Next"`). Tant
  qu'ils n'existent pas, rien ne les référence : aucune adresse ne répond 404.
- Mesures : Mulish, mesurée sur son fichier, a une hauteur d'x de 0,50 em et une chasse moyenne de
  0,453 em sur les textes français du site. Avenir Next n'a pas pu être mesurée (aucun fichier, et
  aucune donnée publiée sous une forme vérifiable n'a été trouvée sans télécharger la police) : sa
  hauteur d'x est un peu plus petite, de l'ordre de 0,47 em. Les tailles (18 px pour le texte, 16 px
  au plus petit) et la mesure (29 em, 64 caractères de Mulish) valent pour les deux : une chasse
  d'Avenir Next jusqu'à 7 % plus étroite ou plus large que celle de Mulish donne encore 60 à 70
  caractères par ligne. À vérifier à l'œil sur un iPhone ou un Mac.
- Caractères absents de Mulish (sous-ensemble latin) : le trait d'union insécable (U+2011, absent
  aussi de Cormorant Garamond : il ne peut donc pas retenir « e-mail » sur une ligne), le trait
  d'union U+2010, l'espace fine insécable (U+202F) et la flèche → (U+2192). Seule l'espace fine paraît
  sur le site (quelques messages du paiement, `content/site/fr/commerce.json`) : le navigateur la
  prend alors dans la police suivante de la pile (Arial), sans différence visible pour une espace.
- E-mails : aucun fichier téléchargé pour le texte (les messageries ignorent souvent les polices) ;
  la pile « Avenir Next », Avenir, « Helvetica Neue », Helvetica, Arial (`fontStacks.text`,
  `styles/tokens.ts`). Factures et étiquettes PDF : inchangées, elles intègrent le TTF de Cormorant
  Garamond, faute de fichier Avenir Next.

### LOGO

| Fichier | Contenu | Usage sur le site |
| --- | --- | --- |
| `LOGO ENTIER.png` (848 × 448) | « AWREA » et « PARIS » espacé dessous, noir sur blanc | En-tête (centré au-dessus de la navigation, maquette EN-TÊTE DU SITE), pied de page, e-mails, factures. Préparé en `public/brand/awrea-logo.png` (fond transparent, affiché en masque : noir sur fond clair, blanc cassé en mode Nuit) et en `public/brand/awrea-logo-blanc.png` (même dessin en blanc cassé, pour les e-mails sur fond noir et en mode sombre, où le masque CSS n'existe pas) |
| `LOGO MINI.png` (564 × 548) | Monogramme « AW » et « PARIS » dessous | En-tête compact au défilement, certificat, cachet de l'enveloppe. `public/brand/awrea-monogramme.png` ; le « AW » seul (`awrea-aw.png`) donne les icônes `app/icon.png` et `app/apple-icon.png` |

À fournir : le logo en SVG (un tracé automatique déformait les déliés, il n'a pas été retenu).

### DA PRÉSENTATION (maquettes de référence)

| Fichier | Ce qu'il fixe | Où |
| --- | --- | --- |
| `EN-TÊTE DU SITE.png` | Logo centré, navigation centrée dessous : Accueil (souligné quand actif), Sur commande ⌄, Collections ⌄, Contact, Mon Panier ⌄ ; textes en Cormorant Garamond (en Avenir Next depuis le 23/11) | `components/layout/Header.tsx`, `Menu.tsx`, `content/site/fr/navigation.json` |
| `BAS DE PAGE.png` | Filet fin centré, quatre colonnes : LA MARQUE (Contact, À propos), SERVICE CLIENT (Guide des tailles, Livraison & retours), LÉGAL (Mentions légales, CGV), NOUS SUIVRE (Instagram, pastille noire) ; « © Awrea Paris 2026 » centré dessous | `components/layout/Footer.tsx` |
| `PAGE PRODUIT.png` | Collection « Hypnotic Lace » : grand titre centré, colonne « Filtrer par » (Catégorie : Tout, Robes, Bodys ; Prix ; Taille ; Collection), filets fins entre les filtres, cartes à photo aux angles arrondis, pastille noire « Nouveau », nom (« Le body Aura ») et prix (« 70,00 € ») | Pages collection et boutique, `components/commerce/ProductCard.tsx`, filtres ; langage repris sur la fiche produit |
| `FORMULAIRE CONTACT.png` | Titre « Contact », photo à gauche (sacs à l'effigie de la Maison), formulaire à droite : champs soulignés d'un filet (Prénom *, Nom, E-mail *, Adresse, Téléphone, Informations complémentaires), bouton noir arrondi pleine largeur | Page `/contact`. Le visuel des sacs est découpé dans la maquette (`public/media/img/contact-sacs`, provisoire) |
| `NEWSLETTER.png` | « Suivez-nous », grand titre « Soyez informé avant tout le monde » en italique, champs Nom *, Prénom *, E-mail *, Téléphone, case « Oui je souhaite m'inscrire à la Newsletter * », bouton noir arrondi | Bloc lettre de la Maison (accueil et pied de page) |

Les maquettes ne sont pas publiées : ce sont des références. Leur langage (filets fins, champs soulignés,
boutons noirs arrondis, pastilles, titres très grands) est étendu à toutes les pages.

### TEXTES (écrits par la créatrice, repris mot pour mot)

| Fichier | Contenu | Où |
| --- | --- | --- |
| `À PROPOS AWREA.pdf` | « La délicatesse rencontre la force. L'élégance devient une signature. » puis l'histoire de la Maison (contrastes, dentelle et drapés, la dorure, les femmes qui embrassent leurs contrastes) | Page La Maison (`/la-maison`), en entier |
| `TEXTE DE COLLECTION.pdf` | « Hypnotic lace », « La délicatesse, le pouvoir de l'or. » et le texte de collection | Page de la collection Hypnotic Lace, bloc collection de l'accueil |
| `TEASING MARQUE.png` | « Des pièces qui subliment la silhouette » : création sur demande, sans stock, artisans français, conditions de travail, environnement, « Porter Awrea, c'est choisir une pièce d'exception… » | Accueil (présentation de la Maison) ; décliné dans la page L'Atelier |

Seules corrections permises : typographie française (guillemets « », apostrophe ’, espaces insécables) et
fautes évidentes. Le contrôle d'écriture (`npm run audit:ecriture`) ne s'applique pas à ces textes :
ils sont marqués comme officiels dans leurs documents de contenu.

### PHOTOS IA EN ATTENDANT (provisoires)

| Fichier | Pièce | Version du site |
| --- | --- | --- |
| `BODY AURA.png` | Body Aura : dentelle pailletée d'or, drapé noué sur le buste, manches longues | `aura-1`, `aura-detail` |
| `ROBE ODESSA.png` | Robe Odessa : bretelles, bustier noir, taille en dentelle, jupe longue | `odessa-1`, `odessa-detail` |
| `ROBE ARIA.jpg` | Robe Aria : sans manches, dentelle et drapé froncé avec anneau doré, jupe sirène en satin froncé | `aria-1`, `aria-detail` |
| `ROBE SIENNA.png` | Robe Sienna : col montant dos nu, dentelle noire et or, taille froncée en pointe | `sienna-1`, `sienna-detail` |
| `BODY GAÏA.png` | Body Gaïa : jersey noir, manches longues, bandes de dentelle en biais | `gaia-1`, `gaia-detail` |
| `TOP EVINA.png` | Top Evina : blanc, col en V profond, manches amples, drapé froncé à la taille | `evina-1` |
| `TOP KIRA.jpg` | Top Kira : noir, col en V, manches amples, taille en dentelle | `kira-1` |

Recadrées en 2:3, déclinées en 480, 960 et 1 600 px (WebP) dans `public/media/img/`. Deux fichiers
(Body Gaïa, Robe Aria) portaient le filigrane de l'outil de génération : le recadrage l'écarte. Chaque
photo est marquée « provisoire » dans le catalogue et dans l'éditeur visuel, pour être repérée et
remplacée dès les vrais shootings ; une mention discrète « visuel provisoire » l'accompagne sur le site
(transparence sur les images générées, à faire valider : LEGAL-A-COMPLETER.md). Cette exception
remplace la règle « aucune image générée » jusqu'à leur remplacement.

### Autres fichiers

| Fichier | Contenu | Où |
| --- | --- | --- |
| `PHOTO À PROPOS.png` | Portrait en noir et blanc de la créatrice, en dentelle | Page La Maison (`creatrice-portrait`). Crédit du photographe : [À COMPLÉTER] |
| `CONDITION GÉNÉRALES DE VENTE/` | CGV officielles en images, articles 1 à 11 (onze fichiers) | Transcrites mot pour mot dans la page `/cgv` ; incohérences avec le fonctionnement du site notées dans LEGAL-A-COMPLETER.md |
| `MENTIONS LÉGALES/` | Mentions légales en trois images (éditrice, identité, hébergement, propriété intellectuelle, données personnelles) | Transcrites dans la page `/mentions-legales` ; informations reportées dans le registre légal (`content/legal/fields.ts`) |

## Ce qui reste à fournir

- Les vraies photographies des pièces (shootings) pour remplacer les visuels provisoires.
- Le logo en SVG : la créatrice en a un, pas encore à disposition (25/10/2026) ; à déposer dans
  `ressources-awrea/LOGO/`. En attendant, le site affiche les PNG officiels.
- Les vidéos des coulisses : la créatrice indique les avoir tournées (25/10/2026). Les fichiers en
  place (`public/media/video/atelier-1` à `atelier-4`) sont des montages faits au début du projet à
  partir de photos : à remplacer par ses propres vidéos si ce ne sont pas les siennes.
- Le crédit du portrait de la créatrice.
- Les prix définitifs des pièces dont le prix est provisoire (ACTIVATION.md) et les délais de
  fabrication de chaque pièce.
- Les compositions des matières et les conseils d'entretien de chaque pièce.
- La validation par un professionnel des points juridiques listés dans LEGAL-A-COMPLETER.md.
