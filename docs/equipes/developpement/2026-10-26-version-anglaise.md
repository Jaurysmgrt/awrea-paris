# Compte rendu · Version anglaise du site (/en) · architecte · 26/10/2026

## Fait

1. **Adresses /en** (`proxy.ts`, `lib/i18n/routing.ts`, `lib/i18n/server.ts`) : le proxy réécrit `/en/…` vers la même page et pose l'en-tête interne `x-awrea-locale` sur **chaque** requête. Une valeur envoyée par le navigateur est donc écrasée. Les pages lisent la langue avec `getLocale()` (`headers()`, `cache` de React, `unstable_rethrow`). Sous /en, l'API, l'Atelier (interne et adresse secrète) et les fichiers (sitemap, llms.txt, images) répondent 404. Rien d'autre ne change : CSP à nonce, CSRF, Atelier secret, session cliente de `/compte` (aussi sous `/en/compte`), en-têtes du mode Édition.
2. **getDoc / findDoc** (`lib/edition/read.ts`) : la langue par défaut est maintenant celle de la requête. Nouvelle surcharge `getDoc(doc, { plain: true })`. Les pages publiques qui passaient `"fr"` utilisent cette surcharge (environ 30 appels). L'Atelier, `app/api/contact` et les fichiers servis sans page (flux, llms.txt, plan du site) passent `"fr"` explicitement, ce qui les garde statiques. Le repli sur le français existait déjà (`readDoc` puis `withFallback`).
3. **Liens internes** :
   - `components/ui/Link.tsx` devient un composant client qui préfixe `href` (chaîne ou objet) grâce à `useLocale()` (`components/providers/LocaleProvider.tsx`, posé dans `app/layout.tsx`).
   - Navigations côté client localisées par `useLocalize()` : recherche (overlay et formulaire), filtres, suivi de commande, confirmation de commande.
   - Redirections serveur localisées : `collections/[handle]` et `bientot/[slug]/acces`.
   - La transition drapée ramène sous /en toute adresse sans préfixe et compare les chemins sans préfixe.
4. **`<html lang>`** vaut `en` sous /en. `pageMetadata` (devenue asynchrone) donne la canonique dans la langue, `alternates.languages` (fr-FR, en, x-default) et l'Open Graph `en_GB`. Les sept pages légales du code passent à `generateMetadata`. Le sitemap liste chaque page dans les deux langues avec leurs hreflang. Le JSON-LD (fil d'Ariane, pièce, collection) pointe vers les adresses /en.
5. **Sélecteur « FR · EN »** (`components/layout/LanguageSwitch.tsx`) :
   - dans l'en-tête, à droite de la navigation dès 48 rem, et en bas du menu du téléphone ;
   - lien ordinaire `data-no-transition` : la page se recharge, donc en-tête, pied de page et textes arrivent dans la nouvelle langue ;
   - garde la requête et l'ancre de la page (utile pour le suivi de commande, la recherche, les filtres) ;
   - langue en cours marquée `aria-current`, `lang` et `hreflang` sur chaque lien ;
   - libellés dans la clé `langues` de `content/site/fr/navigation.json` et `content/site/en/navigation.json` ;
   - styles minimaux dans `styles/layout.css`, avec les tokens existants.
6. **Pièces** (`lib/commerce/translations.ts`, module pur, et `lib/commerce/index.ts`) :
   - `getProducts`, `getProduct`, `getProductsByHandles`, `getPublicProducts`, `getCollections`, `getCollection` et `getCurrentCollection` traduisent selon la langue de la requête, ou selon celle qu'on leur passe ;
   - les traductions viennent de `content/site/en/catalogue-pieces.json` (`pieces` et `collections` ; textes, textes alternatifs, SEO), avec repli champ par champ sur le français ;
   - prix, tailles, délais et photos ne changent jamais ;
   - `getAllProducts` reste la source brute en français (Atelier, agents, panier) ;
   - `/api/products?langue=en` sert la liste d'envies ;
   - une ligne sur Translate & Adapt est ajoutée dans `ACTIVATION.md` (4.2, point 5 bis).
7. **Formats** (`lib/format.ts`) : `formatPrice`, `formatDate` et `formatMonth` acceptent une langue (`en-GB`, toujours en EUR). Elle est passée par `Price`, devenu composant client, par le panier, le paiement, la fiche, le compte, la frise, le certificat, les avis, le Journal, la presse, le suivi, la confirmation et la recherche.
8. **Tests** :
   - `tests/e2e/anglais.spec.ts`, 8 tests : /en, `lang`, 404 Atelier et API sous /en, aller-retour du sélecteur entre /boutique et /en/boutique, liens internes sous /en avant et après une navigation, hreflang et canonique, axe sur /en, /en/boutique/body-aura et /en/cgu, sélecteur du menu téléphone ;
   - `tests/unit/anglais.test.ts`, 6 tests.
   - Aucun test existant n'a été désactivé ni modifié.

**Les quatre points de l'équipe traduction :**

- **« The »** : `fill()` (`lib/edition/fill.ts`) met en bas de casse un « The » de début de valeur quand il ne commence pas la phrase, ce qui donne « See the Aura bodysuit ». En tête de texte ou après un point, la capitale reste.
- **Dates et délais** :
  - `parisDate(iso, now, "en")` écrit « Friday 16 October » et « 2.30 pm » ou « 6 pm » ; l'information arrive jusqu'aux avant-premières (`dropDateText`, `dropVars`, `DropView`, `DropGate`) ;
  - la prise de rendez-vous affiche les jours en anglais et les heures au format « 2.30 pm » ;
  - les délais de la FAQ (`faqVars`) suivent les modèles du document « catalogue » de la langue (« 2 to 3 weeks »). Ceux des fiches et cartes les suivaient déjà.
- **Recherche anglaise** : la page `/en/recherche` utilise l'index anglais. La recherche plein écran charge `/api/search/en`, une nouvelle route statique (`generateStaticParams`, revalidation toutes les 5 minutes) ; `/api/search` reste statique en français. Les titres des pages de la Maison viennent de leurs documents. Vérifié : lace donne 12 résultats, drape 5, gilding 2, dress 7, bodysuit 2, Hypnotic Lace 11.
- **Textes TypeScript restés en français** : sous /en, ils s'affichent en français et sont marqués `lang="fr"` (lecteurs d'écran, césure). Sont concernés :
  - les pages légales du code (titre, chapeau, sommaire, corps) ;
  - les articles du Journal ;
  - l'espace cliente ;
  - le bandeau cookies.
  Rien ne casse : axe sur /en/cgu est vert.

Textes en dur visibles sous /en, déplacés dans le document « site » (clés `evitement` et `filAriane`, en français et en anglais) : « Aller au contenu », ainsi que « Accueil » et « Fil d'Ariane » du fil d'Ariane.

## Choix

- J'ai gardé la réécriture par le proxy et la langue en en-tête, sans segment `[lang]` : aucune page n'a été déplacée. Le changement de langue recharge la page, pour que les gabarits partagés (en-tête, pied de page) ne restent jamais dans l'ancienne langue lors d'une navigation côté client.
- Le format des traductions de pièces est un document de contenu, que l'équipe traduction remplit sans toucher au code. Je n'ai pas ajouté de champs `title_en` dans les données de démonstration.
- `lib/seo/metadata.ts` reste pur : `getLocale` y est chargé à la demande, parce que les tests unitaires importent `lib/seo/schema.ts` (correctif de l'échec `next/headers`).

## Reste à faire

- **Textes à traduire** :
  - dans `content/fr/legal.ts` : CGU, confidentialité, cookies, livraison et retours, rétractation, propriété intellectuelle, notice de l'assistante IA ;
  - `content/fr/journal.ts`, `faq.ts` (index de recherche, assistante), `account.ts`, `cookies.ts` ;
  - le bandeau cookies, écrit en dur dans `components/consent/CookieBanner.tsx`.
- **Textes encore en dur, en français** :
  - les propriétés « Fabrication » et « Délai de fabrication » du JSON-LD des pièces ;
  - les pages de service de l'index de recherche (« Questions fréquentes »…) ;
  - le titre et la description par défaut (`siteDefaults`) des pages sans métadonnées propres ;
  - `websiteSchema` en `inLanguage: fr-FR`.
- **Commerce et e-mails** :
  - les titres des lignes du panier restent en français (enregistrés par l'API panier) ;
  - messages d'erreur des API, e-mails, réponses de l'assistante et paiement Shopify sont sans langue ;
  - le retour après connexion OAuth (`next=/compte`) se fait en français.
- **Shopify** : brancher `@inContext(language: EN)` dans `lib/shopify/storefront.ts` une fois Translate & Adapt installé.
- **Éditeur** : `catalogue-pieces` n'est déclaré dans aucun registre (il n'a pas de base française). À décider avec l'équipe Édition.
- **CSP_MODE=static** : toutes les pages lisent maintenant la langue de la requête, donc elles sont rendues à chaque visite même dans ce mode. Le mode strict, celui par défaut, ne change pas. Retrouver le cache CDN demanderait un segment `[lang]`.
- **Décision SEO** : faut-il indexer sous /en les pages qui retombent sur le français ?
- La suite Playwright complète reste à lancer, par le chef de projet.

## Problèmes

- `npm run test:unit` échouait sur `next/headers`, importé par `lib/seo/schema.ts` → `metadata.ts`. Corrigé par l'import à la demande.
- Le 16 octobre 2026 est un vendredi : l'exemple de l'équipe traduction (« Thursday 16 October ») ne correspond pas à cette date.
- Plusieurs fichiers ont été modifiés en parallèle par d'autres équipes (BookingForm, page rendez-vous, CGU…). J'ai toujours repris leur état sur le disque.
- J'ai recompilé `.next` deux fois, comme demandé. Je n'ai pas touché au serveur du port 3200, mais s'il sert le `.next` de ce dépôt, il faudra peut-être le relancer.

## Résultats

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 0 erreur, 0 avertissement.
- `npm run audit:tokens` : aucun écart.
- `npm run audit:ecriture` : 565 fichiers, 0 erreur.
- `npm run test:unit` : 84 tests, 84 réussis, dont les 6 de `tests/unit/anglais.test.ts`.
- `npx next build` : réussi deux fois (code de sortie 0). `/api/search`, le sitemap, les flux et llms.txt restent statiques ; `/api/search/en` est prérendu.
- `npx playwright test anglais`, serveur de production sur le port 3300 : 8 réussis sur 8.
- Contrôles ciblés sans régression : `navigation` 13 sur 13, `acces-atelier` 3 sur 3.
- Serveurs du port 3300 arrêtés par leur numéro de processus (2015, puis 3734). Aucun commit.
