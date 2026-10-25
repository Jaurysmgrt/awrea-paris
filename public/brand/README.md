# Logo Awrea Paris

Fichiers **officiels** (ressources-awrea/LOGO), préparés par `npm run ressources` :

- `awrea-logo.png` : logo complet, « AWREA » et « PARIS » espacé dessous (LOGO ENTIER) ;
- `awrea-logo-blanc.png` : le même logo en blanc cassé, pour les bandes noires des e-mails (les
  messageries ignorent les masques CSS) ;
- `awrea-monogramme.png` : monogramme « AW » et « PARIS » dessous (LOGO MINI) ;
- `awrea-aw.png` : monogramme « AW » seul, pour les petites tailles.

Fond transparent, dessin noir (sauf la version blanc cassé) : le site les affiche en masque CSS, ils
prennent la couleur du texte (mode Nuit compris). Les icônes `app/icon.png` et `app/apple-icon.png`
en sont tirées. Les e-mails les chargent par l'adresse publique du site (`/brand/…`), y compris le
gabarit du code de connexion de Supabase (`supabase/templates/code-de-connexion.html`).

L'image de partage par défaut (`app/opengraph-image.png`, 1 200 × 630) compose le logo officiel,
« Hypnotic Lace » en Fraunces 72pt Italic et une ligne du texte de collection en Cormorant Garamond
sur le blanc cassé de la Maison. La refaire quand le logo ou la collection change.

Le logo provisoire d'avant les ressources officielles (« AW » en Instrument Serif : `logo*.svg`,
`monogram*.svg` et leurs tracés `content/brand/logo-paths.ts`) est supprimé. La police du logo
(Croisan, licence personnelle) n'est jamais chargée par le site.

**À fournir par la Maison** : le logo en SVG (vectoriel). Le déposer ici puis indiquer son chemin dans
`content/brand/assets.ts`.
