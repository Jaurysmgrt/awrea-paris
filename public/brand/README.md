# Logo Awrea Paris — emplacements

Logo **provisoire** (généré par `scripts/build-logo.py` à partir des polices du site) :

- `logo-noir.svg`, `logo-blanc.svg` — monogramme « AW » et « PARIS » dessous ;
- `monogramme-noir.svg`, `monogramme-blanc.svg` — monogramme seul ;
- `logo.svg`, `monogram.svg` — versions utilisées par le site en masque (elles prennent la couleur
  du texte).

Pour mettre les fichiers **officiels** : les déposer ici (SVG monochromes, fond transparent) sous les
noms `logo.svg`, `monogram.svg` et éventuellement `wordmark.svg` (logotype horizontal), puis indiquer
leurs chemins dans `content/brand/assets.ts` (ex. `src: "/brand/logo.svg"`). Le favicon se remplace
dans `app/icon.svg` et `app/apple-icon.png`.
