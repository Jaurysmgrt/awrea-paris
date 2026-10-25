# Version anglaise des textes du site : compte rendu (équipe International, traduction)

## Ce qui est écrit

Tout est dans `content/site/en/`, rien n’est commité.

- **42 documents**, un par document français de `content/site/fr/`, avec exactement la même structure : mêmes clés dans le même ordre, mêmes tableaux, mêmes adresses de liens et d’images, mêmes repères `{variable}` et `{{champ}}`, mêmes liens `[texte](/chemin)`, mêmes repères `[À COMPLÉTER : …]`.
  - Pages : accueil, la-maison, atelier, sur-commande, guide-des-tailles, contact, collections, boutique, outfits, journal, presse, recherche, avis, introuvable, faq, liste-envies, compte, lettres, rendez-vous, avant-premieres (page « Bientôt », e-mails de l’avant-première, textes de l’Atelier), suivi-commande, coulisses.
  - Textes de l’interface : site, navigation, commerce, catalogue, fiche-piece, certificat, assistante.
  - Pages légales : cgv, mentions-legales, juridique.
  - E-mails : email-commun, email-lettre, email-commande-recue, email-commande-en-confection, email-commande-prete, email-commande-expediee, email-confirmation-rendez-vous, email-rappel-rendez-vous, email-annulation-rendez-vous, email-nouveau-rendez-vous.
- **`catalogue-pieces.json`** : les sept pièces et la collection. J’ai suivi le format attendu par `lib/commerce/translations.ts`, c’est-à-dire `{ "pieces": { <handle>: … }, "collections": { "hypnotic-lace": … } }`. Chaque pièce a ses champs title, tagline, description, details, materials (vide comme en français), care, fit, model (vide), seo, images (textes alternatifs) et detailImage. La collection reprend title, season, lead, intention (texte officiel), seo, cover et moodboard ; elle est marquée `"officiel": true`.
- Les changements du chef de projet et de la créatrice sont repris :
  - le rendez-vous se fait en appel vidéo seulement, `types.essayage` est retiré, et le chapeau est repris dans sa toute dernière version ;
  - le conseil de taille de la fiche ;
  - le bordereau de retour, avec l’envoi du colis à la charge de la cliente ;
  - les exemples des e-mails de rendez-vous et la phrase du rappel ;
  - `navigation.langues` et `site.evitement`/`filAriane`, déjà ajoutés côté anglais par l’autre équipe et vérifiés.
- **`LEGAL-A-COMPLETER.md`** : nouvelle section « Version anglaise » (une ligne). Elle est placée dans la partie tenue à la main, que `npm run legal:todo` garde telle quelle.

## Vérifications

- Les 43 fichiers sont des JSON valides (`JSON.parse`).
- Comparaison des structures avec le français (`scratchpad/outils/compare.mjs`) : 43 documents, 0 problème. Le script contrôle les clés et leur ordre, les types, la longueur des tableaux et les valeurs techniques (href, src, id, type…). Il contrôle aussi les repères `{…}` et `{{…}}`, les liens markdown, les repères À COMPLÉTER et les longueurs maximales de l’éditeur (règles de `lib/edition/guard.ts`). Enfin il cherche les tirets, les points d’exclamation, les emoji, les apostrophes et guillemets droits, les guillemets français, les espaces insécables françaises et les prix au format français.
- Comparaison des pièces avec `data/demo/products.ts` et `collections.ts` (`scratchpad/outils/compare-pieces.mjs`) : 7 pièces, 1 collection, 0 problème.
- `npm run audit:ecriture` : 564 fichiers, 0 erreur. Le script lit bien l’anglais : un chemin en `/en/` est contrôlé avec les règles `BANNED_EN`.
- Contrôle complet de `checkText` en anglais sur les 1 682 textes, **sans** l’exemption des textes officiels et avec les rôles titre et bouton : 0 signalement.
- Orthographe britannique vérifiée : jewellery, centimetres, cheque, authorisation, organisational, Postcode, Surname, Dispatched…

## Choix de vocabulaire

- **Maison** : « the Maison » (M capitale), « atelier » reste « atelier ». Le tableau de bord, lui, s’écrit « the Atelier ».
- **Créatrice** : « the designer ». Signatures : « The Designer » (confirmation de commande), « The designer » (certificat).
- **Pièce** : « piece ». Les noms suivent la forme « The Aura bodysuit », « The Odessa dress », « The Aria dress », « The Sienna dress », « The Gaïa bodysuit » (tréma gardé), « The Evina top », « The Kira top ». « Hypnotic Lace » s’écrit avec deux capitales, comme l’a confirmé la créatrice.
- **Création et délais** : « créée sur demande » devient « made to order » ; le délai de fabrication, « making time » ; la valeur, « Made in {delai} ». La confection se dit « the making », la création « creation », le numéro de création « creation number », et « Création n° 0001 » devient « Creation no. 0001 ».
- **Étapes** (mêmes libellés partout : suivi, sur-commande, FAQ, e-mails) : Order received, In the making, Ready, Dispatched, Delivered.
- **Commerce** :
  - panier : « bag » ;
  - liste d’envies : « wish list », avec Garder / Gardée → Keep / Kept ;
  - offerte : « Complimentary » ;
  - code avantage : « Offer code » ;
  - point relais : « Pick-up point » ;
  - bordereau de retour : « Return slip ».
- **Collection et matières** : dorure « gilding » (et « gold » quand la phrase le demande), éclat « gleam » ou « brilliance », dentelle pailletée d’or « black lace sequinned with gold », drapé « draping » ou « drape ».
- **Rendez-vous** : rendez-vous « appointment », appel vidéo « video call », sur mesure « made-to-measure ».
- **Lettre** : la lettre de la Maison devient « the Maison’s letter », les inscrites « subscribers ». Avant-première se dit « preview », dévoilement « unveiling », présentation privée « private presentation ».
- **E-mails** :
  - salutation : « Bonjour {prenom}, » devient « Dear {prenom}, » ;
  - signatures : « See you soon, », « Until very soon, », « Until tomorrow, », « With our full attention, » ;
  - l’atelier signe « The Awrea Paris atelier », la Maison « Maison Awrea Paris ».
- **Typographie** :
  - guillemets “ ” et apostrophe ’ ;
  - prix « €100 » dans les filtres de la boutique ;
  - pourcentages « {taux}% », sans espace ;
  - dates d’exemple au format britannique : « Thursday 16 October at 2.30 pm », « 2 November 2026 ».
- **Coordonnées** : le téléphone de la page Contact s’affiche au format international, « +33 6 99 55 74 43 ». Le lien `tel:` est inchangé, et les textes officiels gardent « 06 99 55 74 43 ».

### Textes officiels

Les textes officiels (À propos, collection, teasing, citations de L’Atelier et de Sur commande, CGV, mentions légales) sont traduits phrase par phrase et gardent `"officiel": true`. Une même phrase reçoit la même traduction dans tous les documents.

### Pages légales

- La mention « This English translation is given for information. Only the French version of … is legally binding. » est placée **en tête**, dans le champ `chapeau`. Ce champ n’est pas marqué officiel, et `LegalView` l’affiche déjà sous le titre. Je n’ai donc ajouté aucune clé : en français, le chapeau des mentions légales est vide.
- Le formulaire type de rétractation reprend la formulation anglaise officielle du modèle européen (directive 2011/83/UE, annexe I, B).

## Points à faire valider par la créatrice

1. **Le manifeste « Consommer plus juste »** devient « Consume more fairly » (pied des e-mails, FAQ). Il rime avec « at a fair price » dans la réponse de la FAQ.
2. **Le titre du teasing « Des pièces qui subliment la silhouette »** devient « Pieces that exalt the silhouette ». « Sublimate » a un autre sens en anglais. Autres choix possibles : « enhance », « magnify ».
3. **Les mots du texte À propos et du teasing** :
   - « gardiens d’un savoir-faire précieux » : « guardians of a precious savoir-faire » (le mot français est gardé) ;
   - « affirmée » : « bold » ;
   - « audace » : « daring » ;
   - « l’allure » : « allure » ;
   - « conçue pour traverser le temps » : « designed to stand the test of time ».
4. **La signature « La Créatrice »** devient « The Designer ». Garder le français est possible, comme pour « Maison ».
5. **Le menu « Sur commande »** devient « Made to order ». Sa première entrée, « La commande sur demande », devient « Ordering a piece », et le titre de la page « Made to order ».
6. **Les repères `[À COMPLÉTER : …]` restent en français** : le code les détecte par ce texte (`lib/seo/llms.ts`, `lib/marketing/flows.ts`, `lib/agents/confection.ts`…). Ils s’afficheront donc en français sur les pages anglaises tant que l’information manque : entretien des pièces, compositions, origine des matières, crédit photo de La Maison.
7. **Les textes officiels sont traduits avec leurs défauts**, comme le français les garde :
   - le « 3 » isolé et le paragraphe collé de l’article 5, avec « [email address] » ;
   - « while stocks last » (articles 1 et 3) ;
   - les adresses du site Wix ;
   - « Municipality: Yvelines », « Corporate name: Auto-entrepreneur ».

   Seules adaptations typographiques : le tiret des titres d’articles devient un point (« ARTICLE 1. Scope », « ARTICLE 8. Liability of the Seller, Guarantees »), et les tirets isolés de la citation de l’article L217-5 disparaissent (phrases gardées, séparées par des points-virgules). Raison : la consigne interdit les tirets dans le texte anglais.
8. **Les textes réservés à l’Atelier sont traduits eux aussi** : nom et usage des e-mails, descriptions des variables, partie « atelier » des avant-premières. Si l’Atelier reste en français, ces textes anglais ne gênent pas.

## Pour l’autre équipe (branchement)

- **`{piece}` en milieu de phrase** : le titre commence par une capitale (« The Aura bodysuit »). Mettre « the » en bas de casse dans « See {piece} », « {piece}: keep in my wish list » et « Certificate of authenticity · {piece} ». En tête de phrase (« {piece} is in your bag. »), la capitale est juste.
- **Les dates et heures des repères** ({quand}, {jour} at {heure}, {debut}, {fin}, {date}, {devoilement}, {avantPremiere}) sont écrites pour un format britannique, par exemple « Thursday 16 October at 2.30 pm ». Les phrases portent déjà leur « on » ou « from » : « on {quand} », « from {avantPremiere} ».
- **Les délais** ({delai}, {hauts}, {robes}) attendent des valeurs comme « 2 to 3 weeks », celles de `catalogue.delai`.
- **Les suggestions de recherche** sont traduites (lace, drape, gilding, dress, bodysuit). Il faut vérifier que la recherche anglaise trouve ces mots.
- **Hors périmètre, restés en français** : les textes en TypeScript de `content/fr/`. Cela comprend `legal.ts` (CGU, confidentialité, cookies, livraison et retours, rétractation, propriété intellectuelle, notice de l’assistante IA), `journal.ts` (deux articles), `faq.ts`, `account.ts` et `cookies.ts`. Ils sont à prévoir dans un second temps.
- **Le compte rendu** n’est pas déposé dans `docs/equipes/international/` : le cahier des charges limite mes écritures à `content/site/en/` et à `LEGAL-A-COMPLETER.md`. Il pourra y être copié.
