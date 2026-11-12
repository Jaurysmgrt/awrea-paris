# Informations légales à compléter — Awrea Paris

> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :
> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère « [À COMPLÉTER : …] ».
> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.
> Les informations déjà renseignées viennent des informations communiquées par la Maison (cahier du 10/11/2026), de ses premières mentions légales et de ses CGV officielles (`ressources-awrea/`).

**8 information(s) à fournir** sur 19.

## Informations de l’entreprise

| Champ | Information attendue | Où la trouver | Pages concernées |
|---|---|---|---|
| `siege` | adresse postale de l’entreprise : la Maison étudie une domiciliation professionnelle (cahier du 10/11/2026) ; l’ancienne adresse n’est plus affichée nulle part sur le site. Une fois le contrat de domiciliation signé : déclarer le transfert de l’adresse sur le guichet unique (formalites.entreprises.gouv.fr), puis renseigner ici l’adresse exacte | Contrat de domiciliation, puis avis de situation au répertoire SIRENE (avis-situation-sirene.insee.fr) à la nouvelle adresse | Mentions légales (`/mentions-legales`), CGV (`/cgv`), CGU (`/cgu`), Confidentialité (`/confidentialite`), Rétractation (`/retractation`) |
| `mediateur` | médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation ; aucun médiateur désigné au 10/11/2026 : adhérer à un médiateur référencé par la CECMC avant la mise en ligne publique, LEGAL-A-COMPLETER.md) | Convention signée avec un médiateur référencé par la CECMC (liste sur economie.gouv.fr) | Mentions légales (`/mentions-legales`) |
| `marque` | numéro et date d’enregistrement de la marque « Awrea Paris » (les mentions officielles la disent déposée : INPI ou EUIPO) | Certificat d’enregistrement INPI (data.inpi.fr) ou EUIPO | Propriété intellectuelle (`/propriete-intellectuelle`) |
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
- `activite` — activité déclarée et code APE (le code 7410Z, « Activités spécialisées de design », ne couvre peut-être pas la vente de vêtements : à vérifier auprès de l’URSSAF ou d’un expert-comptable, LEGAL-A-COMPLETER.md) : Activités spécialisées de design (code APE 7410Z)
- `directricePublication` — nom et prénom de la directrice de la publication : Léane Soubrier
- `email` — adresse e-mail de contact : awrea.contact@gmail.com
- `telephone` — numéro de téléphone : 06 99 55 74 43
- `hebergeur` — hébergeur du site : dénomination et adresse (le site est déployé sur Vercel ; adresse donnée par la politique de confidentialité de Vercel). Aucun numéro de téléphone public trouvé : le site vercel.com est donné comme moyen de contact : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis

### Sans objet

- `capital` — capital social (sans objet pour une entreprise individuelle : aucune mention à publier)
- `tva` — numéro de TVA intracommunautaire : sans objet tant que la Maison relève de la franchise en base, confirmée le 10/11/2026 (mention « TVA non applicable, article 293 B du Code général des impôts. » sur le site, au récapitulatif de commande, dans l’e-mail de confirmation et sur chaque facture). À renseigner seulement si la Maison sort un jour de la franchise : passer alors `shop.vatRegime` à « tva20 » dans content/settings.ts
- `paiementFractionne` — prestataire du paiement en plusieurs fois (sans objet : le site ne le propose pas, l’article 4 des CGV officielles prévoit un paiement comptant, en totalité, à la commande)

## Conditions commerciales à confirmer

Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans la page Livraison et retours :

- [ ] Zones, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold) : alignés sur l’article 5 des CGV officielles, livraison en France métropolitaine seulement. L’Europe, l’international et le retrait sur rendez-vous ne sont plus proposés tant que les CGV ne les prévoient pas. Tarifs et seuil de la livraison offerte (250 €) à confirmer.
- [ ] Moyens de paiement (content/settings.ts → paymentMethods) : alignés sur l’article 4 des CGV officielles (carte bancaire, Apple Pay, Google Pay, PayPal) ; Shop Pay et le paiement en plusieurs fois ne sont plus proposés. Activer les mêmes moyens dans le compte Stripe de la Maison.
- [ ] Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) ; frais de retour à la charge de la cliente (article 7 des CGV officielles).
- [ ] Délais de fabrication des pièces créées sur demande, indiqués sur chaque fiche, dans le panier et au paiement (provisoires : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines, liste dans `ACTIVATION.md`, étape 4.2 bis), et moment du débit (à la commande, comme le prévoit l’article 4 des CGV officielles).
- [ ] Durée de validité des cartes cadeaux et règles de cumul des codes de réduction (les CGV officielles n’en parlent pas).
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
- [ ] Fabrication sur demande en tailles standard : vérifier avec la juriste que le droit de
  rétractation s’applique (l’exception vise les biens nettement personnalisés) et que les CGV
  officielles l’indiquent.
- [ ] Délai de livraison : le délai annoncé avant la commande (fabrication puis livraison) engage
  la Maison ; vérifier sa cohérence avec l’article des CGV officielles consacré à la livraison.
- [ ] Questions fréquentes (`content/site/fr/faq.json`) : deux réponses portent un repère
  « [À COMPLÉTER : …] », la composition des pièces et les conseils d’entretien de la dentelle, du
  jersey et du satin ; l’assistante transmet ces questions à la créatrice en attendant.

## Écarts entre les CGV officielles et le fonctionnement du site

> Section tenue à la main par l’équipe juridique : `npm run legal:todo` la reprend telle quelle.

Les conditions générales de vente de la créatrice (`ressources-awrea/CONDITION GÉNÉRALES DE VENTE`,
onze images) sont reprises mot pour mot sur la page `/cgv` (`content/site/fr/cgv.json`, articles
marqués officiels). Elles ont été rédigées pour l’ancien site Wix et avant la création sur demande :
elles n’ont **pas** été réécrites pour résoudre les écarts ci-dessous. Chaque point est à trancher
par la créatrice avec une ou un professionnel du droit, puis à reporter dans les CGV (l’éditeur
« Édition » permet de modifier le texte), et à défaut dans le fonctionnement du site. Les autres pages
légales (livraison et retours, rétractation, confidentialité, CGU) suivent les CGV et renvoient à
leurs articles.

### Corrections faites à la transcription (typographie et fautes évidentes seulement)

- Typographie française partout : apostrophes ’, guillemets « » et espaces insécables avant : ; et
  dans les guillemets, points de suspension « … », tiret des titres d’articles en demi-cadratin « – »
  (comme l’article 3 de l’original), majuscule accentuée « À ce titre » (article 5).
- Article 1 : point ajouté après « vêtements pour femmes adultes » ; « toute autre document » → « tout autre document ».
- Article 2 : espace supprimée avant le point (« sur le site . »).
- Article 3 : « 2 jours jours » → « 2 jours ».
- Article 4 : « Paypal », « Apple pay » → « PayPal », « Apple Pay » ; « transactions bancaires réalisée » → « réalisées ».
- Article 8 : « 14 jours jours » → « 14 jours » ; « Non respect » → « Non-respect ».
- Article 9 : « 9.4 limitation » → « 9.4 Limitation » ; « données à caractère personnelles » → « personnel » ;
  « indiqué à l’article 9.3 » → « indiquée » (quatre fois) ; « des informations des informations » → « des informations » ;
  point ajouté après l’adresse e-mail et après « par le Vendeur » ; « Client.. » → « Client. » ;
  « peuvent être exercé » → « exercés » ; « à caractère informatifs et publicitaires » → « informatif et publicitaire ».
- Gardés tels quels, à corriger par la créatrice : le « 3 » isolé de l’article 5 (« transportées. 3 En cas
  de demande… ») ; le paragraphe collé au milieu d’une phrase de l’article 5 (« pour formuler des
  réclamations par Pour toute réclamation… dans les meilleurs délais., accompagnées de tous les
  justificatifs… ») et le repère « [adresse email] » qu’il contient ; les deux adresses de l’ancien
  site (`https://awreaparis.wixsite.com/awrea-paris`, et `…/awreaparis` à l’article 9.1).

### Article par article

| Article des CGV officielles | Ce que fait le site | Question à faire valider |
|---|---|---|
| 1. Champ d’application | Site `www.awreaparis.com` ; pièces créées sur demande, sans stock ; case à cocher des CGV avant le paiement (version enregistrée avec la commande). | Remplacer l’adresse du site Wix par `www.awreaparis.com`. Remplacer « dans la limite des stocks disponibles » par la création sur demande et son délai de fabrication. Ajouter l’adresse postale (l’article 7 renvoie aux « coordonnées postales » de l’article 1, qui n’en donne pas), le nom commercial Awrea Paris et la mention « entrepreneur individuel » ou « EI » ; préciser que le « numéro d’immatriculation » cité est le SIRET. |
| 2. Prix | Prix affichés = prix payés (« 70,00 € »), sans TVA : franchise en base (réglage `shop.vatRegime`, mention de l’article 293 B au récapitulatif, dans l’e-mail de confirmation et sur les factures) ; frais de livraison calculés avant le paiement, livraison offerte dès 250 € en France ; emballage cadeau payant ; codes de réduction et cartes cadeaux acceptés au panier ; facture PDF émise au paiement. | Situation de TVA confirmée par la Maison le 10/11/2026 : franchise en base. L’article dit « Les prix sont exprimés en Euros, HT et TTC » : à remplacer par « TVA non applicable, article 293 B du Code général des impôts. » (la Maison avait d’abord indiqué, le 25/10/2026, facturer la TVA à 20 %). Mentionner l’emballage cadeau, les cartes cadeaux (durée de validité) et les codes de réduction (cumul). Moment de remise de la facture (l’article dit « lors de la livraison »). |
| 3. Commandes | Confirmation par e-mail ; suivi en cinq étapes (« Commande reçue », « En confection », « Prête », « Expédiée », « Livrée ») sur `/suivi` et dans le compte ; aucun bouton d’annulation en ligne (demande par e-mail ou contact). | Retirer « dans la limite des stocks disponibles ». Dire quand la commande est « acceptée par le Vendeur » (point de départ des deux jours d’annulation) et ce que devient une annulation quand la confection a commencé. Prévoir ou non une annulation en ligne. |
| 4. Conditions de paiement | Paiement intégral à la commande, par Stripe Checkout (choix de la créatrice, en cours d’intégration : d’ici là, le site en ligne ne prend aucune commande payée), avec les moyens de l’article : carte bancaire, Apple Pay, Google Pay, PayPal (`content/settings.ts` → `paymentMethods`, aligné le 25/10/2026 ; le paiement en plusieurs fois n’est plus proposé). | Activer exactement ces moyens dans le compte Stripe de la Maison. L’article cite « Stripe » parmi les moyens de paiement : c’est le prestataire qui encaisse, pas un moyen de paiement ; formulation à revoir. |
| 5. Livraisons | Délai de fabrication de 2 à 4 semaines selon la pièce (provisoire, réglable dans l’Atelier), puis transport ; livraison en France métropolitaine seulement, comme l’article (`content/settings.ts`, aligné le 25/10/2026 : l’Europe, l’international et le retrait à l’atelier ne sont plus proposés) ; réclamations à `awrea.contact@gmail.com`. | Le délai « 5 à 10 jours ouvrés » ignore la fabrication : indiquer le délai total (fabrication et livraison) ou renvoyer au délai affiché sur la fiche, qui engage la Maison. Pour livrer hors de France ou proposer un retrait sur rendez-vous, étendre d’abord l’article, puis rétablir ces tarifs dans `content/settings.ts`. Réécrire le paragraphe collé et compléter « [adresse email] ». Vérifier la clause « réputés conformes » après 48 heures ou 14 jours : elle ne peut pas écarter la garantie légale de conformité de deux ans. Vérifier les références « L 216-2, L 216-3 et L241-4 » (numérotation modifiée depuis 2021). |
| 6. Transfert de propriété | Paiement à la commande : la propriété est transférée avant la confection. | Aucun écart relevé. |
| 7. Droit de rétractation | Rétractation en ligne en deux étapes (`/retractation`, « Se rétracter du contrat ici ») avec accusé de réception, formulaire type en annexe de `/cgv` ; 14 jours après la réception ; frais de retour à la charge de la cliente, comme l’article (décision de la créatrice du 25/10/2026) : elle reçoit un bordereau avec l’adresse de l’atelier (`lib/labels.ts`, `shop.returnLabelPrepaid` dans `content/settings.ts` pour offrir un jour l’étiquette Colissimo prépayée). | L’article cite la règle des livraisons régulières (abonnements) mais n’énonce ni le délai de 14 jours ni son point de départ : à compléter. Le remboursement « dans les 14 jours à compter de la réception » des pièces : la loi compte 14 jours à partir de la demande (report possible jusqu’à la réception) et inclut les frais de livraison initiaux. « Échange sous réserve de disponibilité » : sans stock, un échange est une nouvelle création, avec son délai. Pièces créées sur demande dans les tailles du guide : la rétractation s’applique (le site le dit) ; pièces sur mesure : exception de l’article L221-28, 3°, que les pages du site citent mais que les CGV ne mentionnent pas. « Ne sont pas repris » pour une pièce abîmée : la loi prévoit plutôt une retenue pour dépréciation. |
| 8. Responsabilité du Vendeur, garanties | Les pages du site rappellent la garantie légale de conformité et des vices cachés de deux ans. | Les articles cités (L217-4, L217-5, L217-12, L217-16) sont dans leur rédaction d’avant 2022 : mettre à jour et ajouter l’encadré d’information obligatoire sur la garantie légale de conformité (décret n° 2022-424 du 25 mars 2022), présent dans les anciennes CGV du site. La limitation « au remplacement ou au remboursement » écarte la réparation, la réduction du prix et la résolution prévues par la loi. Les photographies « non contractuelles » : les visuels des pièces sont aujourd’hui provisoires et générés, signalés « visuel provisoire ». |
| 9. Données personnelles | Paiement par Stripe (en cours d’intégration) : la carte se saisit chez Stripe, le site n’enregistre aucune donnée bancaire ; données du compte, de la liste d’envies, des rendez-vous, de l’assistante IA, des avis, des lettres (avec consentement) et des cookies ; prestataires et durées détaillés sur `/confidentialite` (factures gardées 10 ans, obligation comptable). | 9.1 : « celui-ci enregistre des données financières » est inexact pour ce site. 9.1 et 9.2 : la collecte et les destinataires ne couvrent que la commande (ajouter compte, rendez-vous, assistante, lettres, cookies, hébergeurs, prestataire de paiement et transferts hors de l’Union européenne, ou renvoyer à la politique de confidentialité). 9.3 : ajouter les coordonnées du responsable (les droits de 9.7 renvoient à une adresse que 9.3 ne donne pas). 9.4 : les e-mails après achat (conseils d’entretien, demande d’avis) reposent sur l’intérêt légitime, à confirmer. 9.5 : durée unique de 5 ans, alors que les factures se gardent 10 ans et que d’autres données ont des durées plus courtes. |
| 10. Propriété intellectuelle | Page `/propriete-intellectuelle` cohérente. | Remplacer l’adresse du site Wix. |
| 11. Droit applicable, langue | Aucun médiateur renseigné. | Les CGV ne nomment aucun médiateur de la consommation : adhésion obligatoire et coordonnées à indiquer dans les CGV et sur le site (champ `mediateur`, affiché pour l’instant « À COMPLÉTER » dans la rubrique « Réclamation et médiation » des mentions légales ; marche à suivre plus bas). Vérifier aussi qu’aucun lien vers l’ancienne plateforme européenne de règlement en ligne des litiges n’est encore attendu (fermée en juillet 2025, à confirmer). |

### Ce que les CGV officielles ne disent pas

- La création sur demande, sans stock, par des artisans français, et le délai de fabrication indiqué
  sur chaque fiche (`content/site/fr/sur-commande.json`, `content/site/fr/catalogue.json`).
- Le certificat d’authenticité et son numéro de création.
- Le Cercle Awrea, les avant-premières, la liste d’envies partagée, l’assistante IA (encadrés par les
  CGU, `/cgu`).
- Les cartes cadeaux, l’emballage cadeau et les codes de réduction.

### Mentions légales réécrites (cahier du 10/11/2026)

Les mentions légales de `/mentions-legales` (`content/site/fr/mentions-legales.json`, version anglaise
pour information) sont désormais un texte de la Maison, réécrit à la demande de la créatrice : il n’est
plus marqué officiel et suit les règles d’écriture. Il remplace le premier texte de la créatrice
(`ressources-awrea/MENTIONS LÉGALES`), qui annonçait encore Wix comme hébergeur et l’ancienne adresse.
Ce qui relève des mentions légales (éditrice, directrice de la publication, hébergeur, TVA, propriété
intellectuelle, médiation) y figure ; les règles de vente restent dans les CGV, auxquelles la page
renvoie, comme aux pages Livraison et retours, Rétractation, Confidentialité et Cookies.

À faire avant la mise en ligne publique :

- [ ] **Adresse de domiciliation** (champ `siege`) : la page, les CGU, la confidentialité, la
  rétractation, le formulaire type de rétractation et chaque facture affichent « [À COMPLÉTER :
  adresse de domiciliation] ». L’ancienne adresse n’est plus publiée nulle part (pages, factures,
  données structurées). Une fois la domiciliation choisie : déclarer le transfert de l’adresse sur le
  guichet unique (formalites.entreprises.gouv.fr), renseigner `siege` dans `content/legal/fields.ts`
  et `legalAddress` dans `content/brand/identity.ts`, puis mettre à jour le SIRET s’il change (un
  nouvel établissement reçoit un nouveau numéro). L’adresse figure sur chaque facture : la renseigner
  avant de prendre des commandes payées.
- [ ] **Médiateur de la consommation** (champ `mediateur`) : la rubrique « Réclamation et médiation »
  affiche « [À COMPLÉTER : médiateur de la consommation] ». Toute entreprise qui vend à des
  consommateurs doit leur offrir le recours gratuit à un médiateur (articles L612-1 et suivants du
  Code de la consommation). Il faut choisir un médiateur référencé par la Commission d’évaluation et
  de contrôle de la médiation de la consommation (CECMC), dont la liste est publiée sur
  economie.gouv.fr (rubrique « Médiation de la consommation »), et y adhérer avant la mise en ligne
  publique (cotisation et frais par dossier propres à chaque médiateur). Renseigner ensuite son nom,
  son adresse postale et son site dans le champ `mediateur`, et les reporter à l’article 11 des CGV.
- [ ] **Code APE 7410Z** (champ `activite`) : « Activités spécialisées de design » décrit une activité
  de services de création ; il ne couvre peut-être pas la fabrication et la vente de vêtements. À
  vérifier auprès de l’URSSAF ou d’un expert-comptable, qui dira s’il faut déclarer une modification
  de l’activité. La nature de l’activité (ventes de marchandises ou prestations de services) compte
  aussi pour le seuil de la franchise de TVA et pour les cotisations de la micro-entreprise.
- [ ] **Hébergeur** (champ `hebergeur`) : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
  États-Unis, adresse donnée par la politique de confidentialité de Vercel (le site est déployé sur
  Vercel). Aucun numéro de téléphone public n’a été trouvé : le site vercel.com est indiqué comme
  moyen de contact. La loi demande en principe le téléphone de l’hébergeur : vérifier s’il figure
  dans le contrat ou le compte Vercel de la Maison.
- [ ] **Franchise en base de TVA** : confirmée par la Maison le 10/11/2026 (elle avait indiqué le 25/10
  facturer la TVA à 20 %). Le réglage unique `shop.vatRegime` (`content/settings.ts`) vaut
  « franchise » : mention « TVA non applicable, article 293 B du Code général des impôts. » dans les
  mentions légales, au récapitulatif de commande, dans l’e-mail « Commande reçue » et en bas de chaque
  facture, qui n’a plus ni colonne ni ligne de TVA. Faire confirmer par l’expert-comptable que ce
  régime correspond à la situation fiscale de la Maison avant publication. L’agent de comptabilité
  prévient à 80 % du seuil de la franchise (`shop.franchiseThreshold` : 85 000 € pour des ventes de
  marchandises, valeur à faire confirmer chaque année). Si la Maison sort de la franchise : passer
  `shop.vatRegime` à « tva20 », renseigner le numéro de TVA intracommunautaire (champ `tva`) et
  récrire la rubrique « TVA » des mentions légales.
- [ ] **Marque** (champ `marque`) : la page dit « Awrea Paris est une marque déposée », phrase reprise
  du premier texte de la créatrice : numéro et date d’enregistrement à fournir, ou phrase à retirer
  si la marque n’est pas enregistrée.
- [ ] **Fabrication à la commande et rétractation** : la page explique que les modèles standards,
  fabriqués après la commande dans les tailles du guide, ouvrent droit à la rétractation de quatorze
  jours, et que seule une création réellement personnalisée (mesures ou demandes particulières de la
  cliente) peut en être exclue (article L221-28, 3°), ce que la Maison annonce avant la confirmation
  de la commande. L’article 7 des CGV officielles ne le dit pas (tableau plus haut) : à y ajouter.
- [ ] Retirés du premier texte, car inexacts ou sans objet : « Société » et « Raison sociale » (une
  entreprise individuelle n’en a pas), « Commune : Yvelines », catégorie « Industrie du textile, du
  cuir et de l’habillement » (remplacée par l’activité déclarée communiquée), dates d’inscription au
  RNE et de début d’activité (gardées dans le registre légal, non publiées), lien vers une « Charte
  de Protection des Données Personnelles » (la page s’appelle « Politique de confidentialité »).

## Version anglaise

- [ ] Traduction anglaise des CGV, des mentions légales et du formulaire type de rétractation (`content/site/en/cgv.json`, `mentions-legales.json`, `juridique.json`), avec en tête la mention « seule la version française fait foi » (champ `chapeau`, non officiel) : traduction et mention à faire valider par une ou un professionnel du droit.

## Autres informations à confirmer

- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », adresse citée par les mentions légales officielles ; les CGV officielles citent encore l’adresse du site Wix).
- [ ] Adresse e-mail de contact : « awrea.contact@gmail.com » (mentions légales officielles), reprise dans `content/brand/identity.ts` → `email`. Les e-mails du site partent de `EMAIL_FROM` : une adresse Gmail ne peut pas servir d’expéditrice vérifiée (Resend) ; prévoir une adresse du domaine pour l’envoi.
- [ ] Adresse de l’atelier où la créatrice reçoit sur rendez-vous et lieu du retrait des commandes (publiés seulement s’ils sont renseignés) : `content/brand/identity.ts` → `address` (ville « Paris » par défaut, à confirmer) ; l’adresse de l’entreprise attend sa domiciliation (`legalAddress`, champ `siege`).
- [ ] Année de création de la Maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`. L’entreprise est inscrite au RNE depuis le 05/02/2026, début d’activité le 01/04/2026.
- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).

## Avant la mise en ligne

- [ ] Faire relire l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste, en commençant par les écarts listés plus haut.
- [ ] Mettre à jour les CGV officielles (adresse du site, création sur demande, délais, rétractation, garanties, médiation, mention de TVA de la franchise), puis les reporter mot pour mot dans l’éditeur « Édition » (document « Conditions générales de vente »). Les mentions légales, réécrites le 11/11/2026, se modifient dans le même éditeur (document « Mentions légales »).
- [ ] Signer la convention avec un médiateur de la consommation référencé par la CECMC et renseigner le champ `mediateur`.
- [ ] Renseigner l’adresse de domiciliation (champ `siege`) avant de prendre des commandes payées : elle figure sur chaque facture.
- [ ] Faire confirmer la franchise en base de TVA et le code APE par l’expert-comptable.
- [ ] Vérifier dans le compte Stripe de la Maison les moyens de paiement activés (article 4 des CGV), sans paiement en plusieurs fois, et les zones de livraison du site (article 5, `content/settings.ts`).
- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.
- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.
