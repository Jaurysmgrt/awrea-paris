# Informations légales à compléter — Awrea Paris

> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :
> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère « [À COMPLÉTER : …] ».
> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.
> Les informations déjà renseignées viennent des informations communiquées par la Maison (cahier du 10/11/2026), de ses premières mentions légales et de ses CGV officielles (`ressources-awrea/`).

**7 information(s) à fournir** sur 19.

## Informations de l’entreprise

| Champ | Information attendue | Où la trouver | Pages concernées |
|---|---|---|---|
| `siege` | adresse postale de l’entreprise : domiciliation professionnelle pas encore choisie au 12/11/2026 ; l’ancienne adresse n’est plus affichée nulle part sur le site. Rappelée dans l’Atelier, liste « À faire en priorité », tant que le champ est vide. Une fois le contrat de domiciliation signé : déclarer le transfert de l’adresse sur le guichet unique (formalites.entreprises.gouv.fr), puis renseigner ici l’adresse exacte | Contrat de domiciliation, puis avis de situation au répertoire SIRENE (avis-situation-sirene.insee.fr) à la nouvelle adresse | Mentions légales (`/mentions-legales`), CGV (`/cgv`), CGU (`/cgu`), Confidentialité (`/confidentialite`), Rétractation (`/retractation`) |
| `mediateur` | médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation ; pas encore choisi au 12/11/2026 : adhérer à un médiateur référencé par la CECMC avant la mise en ligne publique, LEGAL-A-COMPLETER.md). Rappelé dans l’Atelier, liste « À faire en priorité », tant que le champ est vide | Convention signée avec un médiateur référencé par la CECMC (liste officielle sur economie.gouv.fr, lien dans l’Atelier) | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `creditsPhotos` | crédits des photographes, vidéastes et mannequins (portrait de la créatrice, futures prises de vue) et étendue des droits cédés | Contrats de cession de droits et autorisations de droit à l’image signés | Propriété intellectuelle (`/propriete-intellectuelle`), Mentions légales (`/mentions-legales`) |
| `regionBase` | région d’hébergement du projet Supabase (base clientes), de préférence dans l’Union européenne (Francfort ou Paris) | Réglages du projet Supabase (Project Settings → General) | Confidentialité (`/confidentialite`) |
| `regionsPrestataires` | régions d’hébergement retenues pour Upstash (stockage technique) et Sentry (suivi des erreurs), de préférence dans l’Union européenne | Réglages des comptes Upstash et Sentry | Confidentialité (`/confidentialite`) |
| `outilEmails` | outil d’e-mails marketing retenu : Brevo (France) ou Klaviyo (États-Unis) | Choix de la maison | Confidentialité (`/confidentialite`) |
| `delaiConservationDevis` | durée de conservation des demandes de rendez-vous et de sur-mesure sans suite (proposé : 3 ans après le dernier échange) | Décision de la maison (à valider) | Confidentialité (`/confidentialite`) |

### Déjà renseignées

- `raisonSociale` — nom de l’entrepreneuse (entreprise individuelle) : Léane Soubrier
- `nomCommercial` — nom commercial sous lequel l’entreprise exerce : Awrea Paris
- `formeJuridique` — forme juridique (la mention « entrepreneur individuel » ou « EI » accompagne le nom sur les documents de l’entreprise, article R526-26 du Code de commerce) : entrepreneuse individuelle (EI, micro-entreprise)
- `immatriculation` — registre d’immatriculation (inscription au RNE le 05/02/2026, début d’activité le 01/04/2026) : registre national des entreprises (RNE)
- `siren` — numéro SIREN : 100 222 926
- `siret` — numéro SIRET (il change avec l’adresse de l’établissement : à mettre à jour après la domiciliation) : 100 222 926 00014
- `activite` — activité déclarée et code APE (code 7410Z confirmé par la créatrice le 12/11/2026 : il couvre son activité) : Activités spécialisées de design (code APE 7410Z)
- `directricePublication` — nom et prénom de la directrice de la publication : Léane Soubrier
- `email` — adresse e-mail de contact : awrea.contact@gmail.com
- `telephone` — numéro de téléphone : 06 99 55 74 43
- `hebergeur` — hébergeur du site : dénomination et adresse (le site est déployé sur Vercel ; adresse donnée par la politique de confidentialité de Vercel). Aucun numéro de téléphone public trouvé : le site vercel.com est donné comme moyen de contact : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
- `marque` — numéro de la marque « Awrea Paris », déposée à l’INPI (communiqué par la créatrice le 12/11/2026 ; la date de dépôt n’a pas été communiquée et n’est pas publiée) : 5225836

### Sans objet

- `capital` — capital social (sans objet pour une entreprise individuelle : aucune mention à publier)
- `tva` — numéro de TVA intracommunautaire : sans objet tant que la Maison relève de la franchise en base, confirmée par la créatrice le 10/11 puis le 12/11/2026, sans chiffre d’affaires à ce jour (mention « TVA non applicable, article 293 B du Code général des impôts. » sur le site, à l’article 2 des CGV, au récapitulatif de commande, dans l’e-mail de confirmation et sur chaque facture). Seuil surveillé : 85 000 € de ventes par an (`shop.franchiseThreshold`, alerte de l’agent de comptabilité à 80 %). À renseigner seulement si la Maison sort un jour de la franchise : passer alors `shop.vatRegime` à « tva20 » dans content/settings.ts
- `paiementFractionne` — prestataire du paiement en plusieurs fois (sans objet : le site ne le propose pas, l’article 4 des CGV prévoit un paiement comptant, en totalité, à la commande)

## Conditions commerciales à confirmer

Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans la page Livraison et retours :

- [ ] Zones, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold) : alignés sur l’article 5 des CGV, livraison en France métropolitaine seulement. L’Europe, l’international et le retrait sur rendez-vous ne sont plus proposés tant que les CGV ne les prévoient pas. Tarifs et seuil de la livraison offerte (250 €) à confirmer.
- [ ] Moyens de paiement (content/settings.ts → paymentMethods) : alignés sur l’article 4 des CGV (carte bancaire, Apple Pay, Google Pay, PayPal, par le prestataire Stripe) ; Shop Pay et le paiement en plusieurs fois ne sont plus proposés. Activer les mêmes moyens dans le compte Stripe de la Maison.
- [ ] Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) ; frais de retour à la charge de la cliente (article 7 des CGV).
- [ ] Délais de fabrication des pièces créées sur demande, indiqués sur chaque fiche, dans le panier et au paiement (provisoires : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines, liste dans `ACTIVATION.md`, étape 4.2 bis), puis 5 à 10 jours ouvrés de livraison (article 5 des CGV), et moment du débit (à la commande, article 4 des CGV).
- [ ] Durée de validité des cartes cadeaux et règles de cumul des codes de réduction (les CGV n’en parlent pas).
- [ ] Prix de l’emballage cadeau (content/settings.ts → giftWrapPrice).

## Pièces de la collection Hypnotic Lace

> Section tenue à la main : `npm run legal:todo` la reprend telle quelle (`scripts/legal-todo.ts`),
> comme tout ce qui suit.

Aucune matière, composition, doublure, consigne d’entretien ni mesure n’a été inventée : les fiches
ne décrivent que ce que montrent les photos. Tant qu’elles manquent, les fiches affichent
« [À COMPLÉTER : …] » (entretien, composition) ou masquent le champ (doublure, taille portée par le
mannequin). À renseigner dans le catalogue de départ du site (`data/demo/products.ts`), par la
personne qui s’occupe du site : l’Atelier ne les règle pas encore (`ACTIVATION.md`, étape 4.2).

| Pièce | Composition exacte des matières | Doublure | Conseils d’entretien | Taille portée par le mannequin |
|---|---|---|---|---|
| Le body Aura (`body-aura`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| La robe Odessa (`robe-odessa`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| La robe Aria (`robe-aria`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| La robe Sienna (`robe-sienna`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| Le body Gaïa (`body-gaia`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| Le top Evina (`top-evina`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |
| Le top Kira (`top-kira`) | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] | [À COMPLÉTER] |

- [ ] Composition en pourcentage de chaque matière : mention obligatoire pour un textile vendu
  (règlement (UE) n° 1007/2011), à reporter aussi sur l’étiquette cousue.
- [ ] Origine des matières et lieu de confection de chaque pièce (« artisans français ») pour la
  rubrique Fabrication de la fiche (champ `trace` de la pièce, `data/demo/products.ts`).
- [ ] Mention « visuel provisoire » sous chaque photo générée en attendant les prises de vue : à
  faire valider (transparence sur les images générées).
- [ ] Images générées hors du site : elles ne sont envoyées ni à Google ni à Meta (flux produits,
  données structurées), faute de pouvoir y porter la mention « visuel provisoire », et parce que
  ces plateformes encadrent les images produites par IA (Google Merchant Center demande de garder
  les métadonnées IPTC qui les signalent, « trainedAlgorithmicMedia »). À faire vérifier avant de
  les utiliser ailleurs, par exemple en publicité ou sur Instagram : règles de chaque plateforme,
  conditions d’utilisation de l’outil qui les a produites (`RESSOURCES.md`), et mention
  « image générée » conservée dans le fichier.
- [x] Fabrication sur demande en tailles standard : le droit de rétractation s’applique
  (l’exception vise les seules créations personnalisées) ; l’article 7 des CGV corrigées le
  12/11/2026 le dit.
- [x] Délai de livraison : le délai annoncé avant la commande (fabrication puis livraison) engage
  la Maison ; l’article 5 des CGV corrigées le dit (délai de fabrication de la fiche, puis 5 à 10
  jours ouvrés après la fin de la fabrication).
- [ ] Questions fréquentes (`content/site/fr/faq.json`) : deux réponses portent un repère
  « [À COMPLÉTER : …] », la composition des pièces et les conseils d’entretien de la dentelle, du
  jersey et du satin ; l’assistante transmet ces questions à la créatrice en attendant.

## CGV corrigées le 12/11/2026 (version 2026-11), à relire par la créatrice avant publication

> Section tenue à la main par l’équipe juridique : `npm run legal:todo` la reprend telle quelle.

À la demande de la créatrice (réponse 11 du 12/11/2026), les conditions générales de vente
(`content/site/fr/cgv.json`, page `/cgv`) ont été corrigées pour suivre le fonctionnement réel de la
Maison : modèles standards fabriqués après la commande, sans stock ; franchise en base de TVA ;
rétractation de quatorze jours maintenue ; médiation. Elles gardent la structure en onze articles et
les tournures de la créatrice ; seules les phrases fausses ou contradictoires ont changé. Ce n’est
plus un texte officiel repris mot pour mot : il n’est plus marqué `officiel` et le contrôle
d’écriture s’y applique (d’où les titres « ARTICLE 1. Champ d’application », sans tiret). La version
des CGV enregistrée avec chaque commande passe de 2026-10 à 2026-11 (`content/legal-versions.ts`).
La version anglaise (`content/site/en/cgv.json`, pour information) suit les mêmes articles.

**Cette version est à relire par la créatrice avant publication**, puis idéalement par une ou un
juriste. Dans l’Atelier, la page Pages › Pages légales la présente comme « corrigées le 12/11/2026, à
relire par la créatrice avant publication ». Le texte d’origine reste dans l’historique git
(`content/site/fr/cgv.json` avant le 12/11/2026) et dans `ressources-awrea/`.

### Article par article

| Article | Ce qui a changé | Pourquoi |
|---|---|---|
| 1. Champ d’application | Adresse du site Wix remplacée par `www.awreaparis.com` (aussi aux articles 3, 4, 9 et 10). « Dans la limite des stocks disponibles » remplacé par : modèles standards, dans les tailles du guide, ni fabriqués à l’avance ni tenus en stock, fabriqués par des artisans français après la validation de la commande, dans le délai indiqué sur la fiche. Délai de fabrication ajouté aux caractéristiques présentées. Coordonnées tirées du registre légal : nom et mention « entrepreneuse individuelle (EI) », nom commercial, adresse `[À COMPLÉTER]`, numéro SIRET (au lieu de « numéro d’immatriculation »), e-mail, téléphone. | Aucun stock (MARQUE.md § 1) ; ancien site ; l’article 7 renvoyait à des « coordonnées postales » que l’article 1 ne donnait pas ; mention EI (article R526-26 du Code de commerce) ; identité et coordonnées du professionnel (articles L111-1 et L221-5 du Code de la consommation). |
| 2. Prix | « HT et TTC » remplacé par « toutes taxes comprises » et la mention « TVA non applicable, article 293 B du Code général des impôts. » : le prix affiché est le prix payé. « Frais de traitement » retirés (le site n’en facture pas). Facture émise dès le paiement, jointe à l’e-mail de confirmation et disponible sur la page de suivi (au lieu de « remise lors de la livraison »). | Franchise en base confirmée par la créatrice (10/11 et 12/11/2026) ; fonctionnement réel (`lib/commerce/finalisation.ts`, `lib/invoices`). |
| 3. Commandes | « Dans la limite des stocks disponibles » retiré : chaque taille proposée se commande, la commande effective lance la fabrication. La confirmation rappelle le délai de fabrication ; le suivi se fait à chaque étape. | Aucun stock ; e-mail « Commande reçue » et suivi en cinq étapes. |
| 4. Conditions de paiement | « Stripe » n’est plus cité comme un moyen de paiement mais comme le prestataire par lequel passent la carte, PayPal, Google Pay et Apple Pay. | Stripe encaisse, ce n’est pas un moyen de paiement. |
| 5. Livraisons | Le délai annoncé comprend le délai de fabrication de la fiche, puis 5 à 10 jours ouvrés à compter de la fin de la fabrication ; « date indicative » devient « date de livraison annoncée » et « meilleurs efforts » un engagement. Livraison en une fois quand le dernier Produit est prêt (au lieu de « sauf indisponibilité »). Références « L 216-2, L 216-3 » remplacées par « L216-1 et suivants » (numérotation modifiée par l’ordonnance n° 2021-1247). « À l’exclusion de toute indemnisation ou retenue » devient « sans aucune retenue ». Le « 3 » isolé, le paragraphe collé au milieu d’une phrase et le repère « [adresse email] » sont réécrits : réclamations à l’e-mail du registre, 48 heures (colis abîmé) et 14 jours (problème sur la pièce). « Passé ce délai, les Produits seront réputés conformes » retiré : ces délais ne réduisent pas les garanties légales. Renvoi aux articles L217-3 et suivants et à l’article 8. | Le délai annoncé engage la Maison (article L216-1) ; aucun stock ; clause qui supprimerait le droit à réparation du consommateur interdite (article R212-1, 6°) ; les garanties légales sont d’ordre public et durent deux ans (articles L217-3 et suivants) ; clarté des clauses (article L211-1). |
| 6. Transfert de propriété | Inchangé. | Aucun écart. |
| 7. Droit de rétractation | La citation sur les livraisons régulières (abonnements) est remplacée par la règle qui s’applique : quatorze jours à compter de la réception, sans motif (article L221-18). Rétractation maintenue pour les modèles standards fabriqués après la commande ; seule une création réellement personnalisée (mesures ou demandes particulières) en est exclue, et la Maison le dit avant la commande (article L221-28, 3° et L221-5). Accusé de réception d’une demande en ligne (article L221-21). Renvoi sous quatorze jours après la demande (article L221-23). « Les Produits endommagés, salis ou incomplets ne sont pas repris » et « recommercialisation à l’état neuf » remplacés par : essai comme en boutique, seule la perte de valeur peut être retenue (article L221-23). Remboursement de la totalité, frais de livraison compris (sauf supplément d’un mode plus cher choisi), au plus tard quatorze jours après la demande, différé possible jusqu’au retour de la pièce ou à la preuve de son envoi, sur le même moyen de paiement (article L221-24), au lieu de « 14 jours à compter de la réception ». « Échange (sous réserve de disponibilité) » devient un échange de taille confectionné dans son délai. « Restant » corrigé en « restent ». | Réponse 11 de la créatrice ; articles L221-18, L221-21, L221-23, L221-24, L221-28 du Code de la consommation ; aucun stock. |
| 8. Garanties | Les articles L217-4, L217-5, L217-12 et L217-16, cités dans leur rédaction d’avant 2022, sont remplacés par le renvoi aux articles L217-3 et suivants et par l’encadré d’information sur les garanties légales (décret n° 2022-424 du 25 mars 2022, texte repris des anciennes CGV du site). Citations des articles 1641 et 1648 du Code civil gardées. Réparation ou remplacement, sinon réduction du prix ou remboursement ; au plus tard 14 jours après la constatation, et 30 jours après la demande pour une réparation ou un remplacement ; remboursement sur le moyen de paiement de la commande (au lieu de « virement ou chèque »). « Photographies non contractuelles » remplacé par la mention des visuels provisoires signalés. « Garantie limitée au remplacement ou au remboursement » retiré. | Ordonnance n° 2021-1247 et décret n° 2022-424 ; la limitation écartait la réparation, la réduction du prix et la résolution prévues par la loi ; visuels provisoires générés (RESSOURCES.md). |
| 9. Données personnelles | Adresse du site (deux formes de l’adresse Wix). 9.1 : les données de paiement sont saisies chez Stripe, le Vendeur n’y a jamais accès (au lieu de « le site enregistre des données financières »). Renvoi à la politique de confidentialité pour tous les traitements. 9.3 : contact du responsable (e-mail du registre, adresse de l’article 1), auquel 9.7 renvoyait. 9.5 : factures conservées dix ans. | Fonctionnement réel (Stripe Checkout, aucune donnée bancaire sur le site) ; cohérence avec `/confidentialite`. |
| 10. Propriété intellectuelle | Adresse du site. | Ancien site. |
| 11. Droit applicable, langue, médiation | Ajout de la médiation : réclamation écrite d’abord, puis recours gratuit au médiateur de la consommation dans l’année, `[À COMPLÉTER : médiateur de la consommation]`. | Articles L612-1 et suivants et L111-1, 6° du Code de la consommation ; médiateur pas encore choisi (réponse 7 de la créatrice). |

### Ce qui reste à valider

- [ ] **Relecture de la créatrice** de toute la version 2026-11, avant publication, puis d’une ou
  un juriste si possible.
- [ ] **Atelier › Retours, bouton « Refuser »** (pièce revenue portée ou sans certificat) : il
  refuse tout remboursement, alors que l’article 7 corrigé ne permet de retenir que la perte de
  valeur de la pièce. À aligner (montant retenu sur le remboursement) par l’équipe de développement,
  après décision de la créatrice.
- [ ] **Références à vérifier sur Légifrance** (la vérification en ligne n’était pas possible depuis
  l’environnement de travail) : « L216-1 et suivants » et « L241-4 » (article 5), « L. 242-18-1 »
  (amende civile de l’encadré, article 8), texte exact de l’encadré du décret n° 2022-424.
- [ ] **Mode de livraison « standard »** pour le remboursement des frais en cas de rétractation
  (Colissimo, point relais ou Chronopost express) : à préciser si la créatrice le souhaite.
- [ ] **Annulation sous deux jours** (article 3) : dire quand la commande est « acceptée par le
  Vendeur » (par exemple à l’envoi de l’e-mail « Commande reçue »).
- [ ] **Médiateur** (article 11) et **adresse** (article 1) : `[À COMPLÉTER]`, rappelés dans
  l’Atelier (liste « À faire en priorité ») tant que le registre légal ne les a pas.

### Ce que les CGV ne disent pas encore

- Le certificat d’authenticité et son numéro de création.
- Le Cercle Awrea, les avant-premières, la liste d’envies partagée, l’assistante IA (encadrés par les
  CGU, `/cgu`).
- Les cartes cadeaux (durée de validité), l’emballage cadeau et les codes de réduction, dont l’offre
  de bienvenue de 10 % (cumul, durée, une fois par adresse e-mail).

## Mentions légales réécrites (cahier du 10/11/2026, réponses du 12/11/2026)

Les mentions légales de `/mentions-legales` (`content/site/fr/mentions-legales.json`, version anglaise
pour information) sont un texte de la Maison, réécrit à la demande de la créatrice : il n’est plus
marqué officiel et suit les règles d’écriture. Il remplace le premier texte de la créatrice
(`ressources-awrea/MENTIONS LÉGALES`), qui annonçait encore Wix comme hébergeur et l’ancienne adresse.
Ce qui relève des mentions légales (éditrice, directrice de la publication, hébergeur, TVA, propriété
intellectuelle, médiation) y figure ; les règles de vente restent dans les CGV, auxquelles la page
renvoie, comme aux pages Livraison et retours, Rétractation, Confidentialité et Cookies.

À faire avant la mise en ligne publique :

- [ ] **Adresse de domiciliation** (champ `siege`) : pas encore choisie (réponse 6 de la créatrice,
  12/11/2026). La page, les CGV (article 1), les CGU, la confidentialité, la rétractation, le
  formulaire type de rétractation et chaque facture affichent « [À COMPLÉTER : adresse de
  domiciliation] ». L’ancienne adresse n’est plus publiée nulle part (pages, factures, données
  structurées). Tant que le champ est vide, l’Atelier la rappelle dans la liste « À faire en
  priorité » de la Vue d’ensemble (« Choisir l’adresse de la Maison »). Une fois la domiciliation
  choisie : déclarer le transfert de l’adresse sur le guichet unique (formalites.entreprises.gouv.fr),
  renseigner `siege` dans `content/legal/fields.ts` et `legalAddress` dans `content/brand/identity.ts`,
  puis mettre à jour le SIRET s’il change (un nouvel établissement reçoit un nouveau numéro).
  L’adresse figure sur chaque facture : la renseigner avant de prendre des commandes payées.
- [ ] **Médiateur de la consommation** (champ `mediateur`) : pas encore choisi (réponse 7 de la
  créatrice). La rubrique « Réclamation et médiation » des mentions légales et l’article 11 des CGV
  affichent « [À COMPLÉTER : médiateur de la consommation] ». Toute entreprise qui vend à des
  consommateurs doit leur offrir le recours gratuit à un médiateur (articles L612-1 et suivants du
  Code de la consommation). Il faut choisir un médiateur référencé par la Commission d’évaluation et
  de contrôle de la médiation de la consommation (CECMC), dont la liste officielle est publiée sur
  economie.gouv.fr (https://www.economie.gouv.fr/mediation-conso/mediateurs-references, adresse à
  confirmer : elle n’a pas pu être ouverte depuis l’environnement de travail), et y adhérer avant la
  mise en ligne publique (cotisation et frais par dossier propres à chaque médiateur). L’Atelier le
  rappelle dans « À faire en priorité » (« Choisir un médiateur de la consommation »), avec le lien
  de cette liste. Renseigner ensuite son nom, son adresse postale et son site dans le champ
  `mediateur` : il s’affiche aussitôt dans les mentions légales et dans l’article 11 des CGV.
- [x] **Code APE 7410Z** (champ `activite`) : confirmé par la créatrice le 12/11/2026, il couvre son
  activité. Plus aucune mention « à vérifier ».
- [ ] **Hébergeur** (champ `hebergeur`) : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
  États-Unis, adresse donnée par la politique de confidentialité de Vercel (le site est déployé sur
  Vercel). Aucun numéro de téléphone public n’a été trouvé : le site vercel.com est indiqué comme
  moyen de contact. La loi demande en principe le téléphone de l’hébergeur : vérifier s’il figure
  dans le contrat ou le compte Vercel de la Maison.
- [x] **Franchise en base de TVA** : confirmée par la créatrice le 10/11 puis le 12/11/2026 (aucun
  chiffre d’affaires encore). Le réglage unique `shop.vatRegime` (`content/settings.ts`) vaut
  « franchise » : mention « TVA non applicable, article 293 B du Code général des impôts. » dans les
  mentions légales, à l’article 2 des CGV, au récapitulatif de commande, dans l’e-mail « Commande
  reçue » et en bas de chaque facture, qui n’a ni colonne ni ligne de TVA.
- [ ] **Seuil de la franchise, surveillé** : 85 000 € de ventes de marchandises par an
  (`shop.franchiseThreshold`, valeur à faire confirmer chaque année). L’agent de comptabilité
  prévient à 80 % du seuil. Si la Maison sort de la franchise : passer `shop.vatRegime` à « tva20 »,
  renseigner le numéro de TVA intracommunautaire (champ `tva`), récrire la rubrique « TVA » des
  mentions légales et l’article 2 des CGV.
- [x] **Marque** (champ `marque`) : « Awrea Paris » est déposée à l’INPI sous le numéro 5225836
  (réponse 10 de la créatrice, 12/11/2026). Le numéro figure dans les mentions légales (propriété
  intellectuelle, français et anglais) et sur la page Propriété intellectuelle. La date de dépôt n’a
  pas été communiquée : elle n’est pas publiée.
- [x] **Fabrication à la commande et rétractation** : les mentions légales et l’article 7 des CGV
  corrigées disent que les modèles standards, fabriqués après la commande dans les tailles du guide,
  ouvrent droit à la rétractation de quatorze jours, et que seule une création réellement
  personnalisée (mesures ou demandes particulières de la cliente) en est exclue (article L221-28,
  3°), ce que la Maison annonce avant la confirmation de la commande.
- [ ] Retirés du premier texte, car inexacts ou sans objet : « Société » et « Raison sociale » (une
  entreprise individuelle n’en a pas), « Commune : Yvelines », catégorie « Industrie du textile, du
  cuir et de l’habillement » (remplacée par l’activité déclarée communiquée), dates d’inscription au
  RNE et de début d’activité (gardées dans le registre légal, non publiées), lien vers une « Charte
  de Protection des Données Personnelles » (la page s’appelle « Politique de confidentialité »).

## Version anglaise

- [ ] Traduction anglaise des CGV (mise à jour avec la version corrigée du 12/11/2026), des mentions légales et du formulaire type de rétractation (`content/site/en/cgv.json`, `mentions-legales.json`, `juridique.json`), avec en tête la mention « seule la version française fait foi » (champ `chapeau`, non officiel) : traduction et mention à faire valider par une ou un professionnel du droit.

## Autres informations à confirmer

- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », adresse citée par les mentions légales et, depuis le 12/11/2026, par les CGV).
- [ ] Adresse e-mail de contact : « awrea.contact@gmail.com » (mentions légales officielles), reprise dans `content/brand/identity.ts` → `email`. Les e-mails du site partent de `EMAIL_FROM` : une adresse Gmail ne peut pas servir d’expéditrice vérifiée (Resend) ; prévoir une adresse du domaine pour l’envoi.
- [ ] Adresse de l’atelier où la créatrice reçoit sur rendez-vous et lieu du retrait des commandes (publiés seulement s’ils sont renseignés) : `content/brand/identity.ts` → `address` (ville « Paris » par défaut, à confirmer) ; l’adresse de l’entreprise attend sa domiciliation (`legalAddress`, champ `siege`).
- [ ] Année de création de la Maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`. L’entreprise est inscrite au RNE depuis le 05/02/2026, début d’activité le 01/04/2026.
- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).

## Avant la mise en ligne

- [ ] Faire relire par la créatrice les CGV corrigées le 12/11/2026 (version 2026-11, tableau plus haut), puis l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste.
- [ ] Les CGV et les mentions légales se modifient dans l’éditeur « Édition » (documents « Conditions générales de vente » et « Mentions légales ») ; toute modification substantielle des CGV fait monter leur version dans `content/legal-versions.ts`.
- [ ] Signer la convention avec un médiateur de la consommation référencé par la CECMC et renseigner le champ `mediateur`.
- [ ] Renseigner l’adresse de domiciliation (champ `siege`) avant de prendre des commandes payées : elle figure sur chaque facture.
- [x] Franchise en base de TVA et code APE 7410Z : confirmés par la créatrice le 12/11/2026. Seuil de 85 000 € toujours surveillé par l’agent de comptabilité.
- [ ] Vérifier dans le compte Stripe de la Maison les moyens de paiement activés (article 4 des CGV), sans paiement en plusieurs fois, et les zones de livraison du site (article 5, `content/settings.ts`).
- [ ] Atelier › Retours : aligner le bouton « Refuser » sur l’article 7 corrigé (retenir la perte de valeur plutôt que refuser tout remboursement), après décision de la créatrice.
- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.
- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.
