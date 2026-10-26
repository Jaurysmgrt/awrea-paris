# Informations légales à compléter — Awrea Paris

> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :
> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère « [À COMPLÉTER : …] ».
> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.
> Les informations déjà renseignées viennent des mentions légales et des CGV officielles de la créatrice (`ressources-awrea/`).

**10 information(s) à fournir** sur 19.

## Informations de l’entreprise

| Champ | Information attendue | Où la trouver | Pages concernées |
|---|---|---|---|
| `tva` | numéro de TVA intracommunautaire (la créatrice a confirmé le 25/10/2026 que la Maison facture la TVA : prix TTC, TVA à 20 % détaillée sur les factures) | Espace professionnel impots.gouv.fr | Mentions légales (`/mentions-legales`) |
| `directricePublication` | nom et prénom de la directrice de la publication (les mentions officielles ne la nomment pas ; pour une entreprise individuelle, c’est en principe l’entrepreneuse elle-même, Léane Soubrier : à confirmer) | Représentante légale de l’entreprise | Mentions légales (`/mentions-legales`) |
| `mediateur` | médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation ; ni les CGV ni les mentions officielles n’en nomment ; aucune adhésion au 25/10/2026 : démarche à faire avant la mise en ligne) | Convention signée avec un médiateur référencé par la CECMC (liste sur economie.gouv.fr) | Mentions légales (`/mentions-legales`) |
| `hebergeur` | hébergeur du nouveau site : dénomination, adresse et téléphone (les mentions officielles nomment Wix Online Platform Limited, hébergeur du site Wix ; le nouveau site est prévu sur Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis) | Contrat d’hébergement (vercel.com/legal), puis mise à jour des mentions légales officielles | Mentions légales (`/mentions-legales`) |
| `marque` | numéro et date d’enregistrement de la marque « Awrea Paris » (les mentions officielles la disent déposée : INPI ou EUIPO) | Certificat d’enregistrement INPI (data.inpi.fr) ou EUIPO | Propriété intellectuelle (`/propriete-intellectuelle`) |
| `creditsPhotos` | crédits des photographes, vidéastes et mannequins (portrait de la créatrice, futures prises de vue) et étendue des droits cédés | Contrats de cession de droits et autorisations de droit à l’image signés | Propriété intellectuelle (`/propriete-intellectuelle`), Mentions légales (`/mentions-legales`) |
| `regionBase` | région d’hébergement du projet Supabase (base clientes), de préférence dans l’Union européenne (Francfort ou Paris) | Réglages du projet Supabase (Project Settings → General) | Confidentialité (`/confidentialite`) |
| `regionsPrestataires` | régions d’hébergement retenues pour Upstash (stockage technique) et Sentry (suivi des erreurs), de préférence dans l’Union européenne | Réglages des comptes Upstash et Sentry | Confidentialité (`/confidentialite`) |
| `outilEmails` | outil d’e-mails marketing retenu : Brevo (France) ou Klaviyo (États-Unis) | Choix de la maison | Confidentialité (`/confidentialite`) |
| `delaiConservationDevis` | durée de conservation des demandes de rendez-vous et de sur-mesure sans suite (proposé : 3 ans après le dernier échange) | Décision de la maison (à valider) | Confidentialité (`/confidentialite`) |

### Déjà renseignées

- `raisonSociale` — nom de l’entrepreneuse (entreprise individuelle) : Léane Soubrier
- `nomCommercial` — nom commercial sous lequel l’entreprise exerce : Awrea Paris
- `formeJuridique` — forme juridique : entrepreneur individuel (micro-entreprise)
- `siege` — adresse postale de l’entreprise : 46 rue Paul Déroulède, 78290 Croissy-sur-Seine, France
- `immatriculation` — registre d’immatriculation (inscription au RNE le 05/02/2026, début d’activité le 01/04/2026) : registre national des entreprises (RNE)
- `siren` — numéro SIREN : 100 222 926
- `siret` — numéro SIRET : 100 222 926 00014
- `email` — adresse e-mail de contact : awrea.contact@gmail.com
- `telephone` — numéro de téléphone : 06 99 55 74 43

### Sans objet

- `capital` — capital social (sans objet pour une entreprise individuelle : aucune mention à publier)
- `paiementFractionne` — prestataire du paiement en plusieurs fois (sans objet : le site ne le propose pas, l’article 4 des CGV officielles prévoit un paiement comptant, en totalité, à la commande)

## Conditions commerciales à confirmer

Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans la page Livraison et retours :

- [ ] Zones, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold) : alignés sur l’article 5 des CGV officielles, livraison en France métropolitaine seulement. L’Europe, l’international et le retrait sur rendez-vous ne sont plus proposés tant que les CGV ne les prévoient pas. Tarifs et seuil de la livraison offerte (250 €) à confirmer.
- [ ] Moyens de paiement (content/settings.ts → paymentMethods) : alignés sur l’article 4 des CGV officielles (carte bancaire, Apple Pay, Google Pay, PayPal) ; Shop Pay et le paiement en plusieurs fois ne sont plus proposés. Activer les mêmes moyens dans Shopify.
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
mannequin). À renseigner dans Shopify (métachamps `awrea.*`, `ACTIVATION.md`, étape 4.2) ou, en
démonstration, dans `data/demo/products.ts`.

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
  rubrique Fabrication de la fiche (métachamp `awrea.traceability`).
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
| 2. Prix | Prix affichés TTC (« 70,00 € ») ; frais de livraison calculés avant le paiement, livraison offerte dès 250 € en France ; emballage cadeau payant ; codes de réduction et cartes cadeaux acceptés au panier ; facture PDF émise au paiement. | Situation de TVA tranchée par la créatrice le 25/10/2026 : la Maison facture la TVA (prix TTC, TVA à 20 % détaillée sur les factures, déjà le fonctionnement du site) ; préciser dans l’article que les prix affichés sont TTC et ajouter le numéro de TVA intracommunautaire aux mentions légales. Mentionner l’emballage cadeau, les cartes cadeaux (durée de validité) et les codes de réduction (cumul). Moment de remise de la facture (l’article dit « lors de la livraison »). |
| 3. Commandes | Confirmation par e-mail ; suivi en cinq étapes (« Commande reçue », « En confection », « Prête », « Expédiée », « Livrée ») sur `/suivi` et dans le compte ; aucun bouton d’annulation en ligne (demande par e-mail ou contact). | Retirer « dans la limite des stocks disponibles ». Dire quand la commande est « acceptée par le Vendeur » (point de départ des deux jours d’annulation) et ce que devient une annulation quand la confection a commencé. Prévoir ou non une annulation en ligne. |
| 4. Conditions de paiement | Paiement intégral à la commande par Shopify, avec les moyens de l’article : carte bancaire, Apple Pay, Google Pay, PayPal (`content/settings.ts` → `paymentMethods`, aligné le 25/10/2026 ; Shop Pay et le paiement en plusieurs fois ne sont plus proposés). | Activer exactement ces moyens dans Shopify. « Stripe » est le prestataire derrière la carte bancaire plutôt qu’un moyen de paiement : formulation à revoir. |
| 5. Livraisons | Délai de fabrication de 2 à 4 semaines selon la pièce (provisoire, réglable dans l’Atelier), puis transport ; livraison en France métropolitaine seulement, comme l’article (`content/settings.ts`, aligné le 25/10/2026 : l’Europe, l’international et le retrait à l’atelier ne sont plus proposés) ; réclamations à `awrea.contact@gmail.com`. | Le délai « 5 à 10 jours ouvrés » ignore la fabrication : indiquer le délai total (fabrication et livraison) ou renvoyer au délai affiché sur la fiche, qui engage la Maison. Pour livrer hors de France ou proposer un retrait sur rendez-vous, étendre d’abord l’article, puis rétablir ces tarifs dans `content/settings.ts`. Réécrire le paragraphe collé et compléter « [adresse email] ». Vérifier la clause « réputés conformes » après 48 heures ou 14 jours : elle ne peut pas écarter la garantie légale de conformité de deux ans. Vérifier les références « L 216-2, L 216-3 et L241-4 » (numérotation modifiée depuis 2021). |
| 6. Transfert de propriété | Paiement à la commande : la propriété est transférée avant la confection. | Aucun écart relevé. |
| 7. Droit de rétractation | Rétractation en ligne en deux étapes (`/retractation`, « Se rétracter du contrat ici ») avec accusé de réception, formulaire type en annexe de `/cgv` ; 14 jours après la réception ; frais de retour à la charge de la cliente, comme l’article (décision de la créatrice du 25/10/2026) : elle reçoit un bordereau avec l’adresse de l’atelier (`lib/labels.ts`, `shop.returnLabelPrepaid` dans `content/settings.ts` pour offrir un jour l’étiquette Colissimo prépayée). | L’article cite la règle des livraisons régulières (abonnements) mais n’énonce ni le délai de 14 jours ni son point de départ : à compléter. Le remboursement « dans les 14 jours à compter de la réception » des pièces : la loi compte 14 jours à partir de la demande (report possible jusqu’à la réception) et inclut les frais de livraison initiaux. « Échange sous réserve de disponibilité » : sans stock, un échange est une nouvelle création, avec son délai. Pièces créées sur demande dans les tailles du guide : la rétractation s’applique (le site le dit) ; pièces sur mesure : exception de l’article L221-28, 3°, que les pages du site citent mais que les CGV ne mentionnent pas. « Ne sont pas repris » pour une pièce abîmée : la loi prévoit plutôt une retenue pour dépréciation. |
| 8. Responsabilité du Vendeur, garanties | Les pages du site rappellent la garantie légale de conformité et des vices cachés de deux ans. | Les articles cités (L217-4, L217-5, L217-12, L217-16) sont dans leur rédaction d’avant 2022 : mettre à jour et ajouter l’encadré d’information obligatoire sur la garantie légale de conformité (décret n° 2022-424 du 25 mars 2022), présent dans les anciennes CGV du site. La limitation « au remplacement ou au remboursement » écarte la réparation, la réduction du prix et la résolution prévues par la loi. Les photographies « non contractuelles » : les visuels des pièces sont aujourd’hui provisoires et générés, signalés « visuel provisoire ». |
| 9. Données personnelles | Paiement par Shopify : le site n’enregistre aucune donnée bancaire ; données du compte, de la liste d’envies, des rendez-vous, de l’assistante IA, des avis, des lettres (avec consentement) et des cookies ; prestataires et durées détaillés sur `/confidentialite` (factures gardées 10 ans, obligation comptable). | 9.1 : « celui-ci enregistre des données financières » est inexact pour ce site. 9.1 et 9.2 : la collecte et les destinataires ne couvrent que la commande (ajouter compte, rendez-vous, assistante, lettres, cookies, hébergeurs et transferts hors de l’Union européenne, ou renvoyer à la politique de confidentialité). 9.3 : ajouter les coordonnées du responsable (les droits de 9.7 renvoient à une adresse que 9.3 ne donne pas). 9.4 : les e-mails après achat (conseils d’entretien, demande d’avis) reposent sur l’intérêt légitime, à confirmer. 9.5 : durée unique de 5 ans, alors que les factures se gardent 10 ans et que d’autres données ont des durées plus courtes. |
| 10. Propriété intellectuelle | Page `/propriete-intellectuelle` cohérente. | Remplacer l’adresse du site Wix. |
| 11. Droit applicable, langue | Aucun médiateur renseigné. | Les CGV ne nomment aucun médiateur de la consommation : adhésion obligatoire et coordonnées à indiquer dans les CGV et sur le site (champ `mediateur`, affiché pour l’instant « À COMPLÉTER » dans les mentions légales). Vérifier aussi qu’aucun lien vers l’ancienne plateforme européenne de règlement en ligne des litiges n’est encore attendu (fermée en juillet 2025, à confirmer). |

### Ce que les CGV officielles ne disent pas

- La création sur demande, sans stock, par des artisans français, et le délai de fabrication indiqué
  sur chaque fiche (`content/site/fr/sur-commande.json`, `content/site/fr/catalogue.json`).
- Le certificat d’authenticité et son numéro de création.
- Le Cercle Awrea, les avant-premières, la liste d’envies partagée, l’assistante IA (encadrés par les
  CGU, `/cgu`).
- Les cartes cadeaux, l’emballage cadeau et les codes de réduction.

### Écarts entre les mentions légales officielles et le site

Les mentions légales de la créatrice (`ressources-awrea/MENTIONS LÉGALES`, trois images) sont reprises
mot pour mot sur `/mentions-legales` (`content/site/fr/mentions-legales.json`), suivies de compléments
du site marqués « À COMPLÉTER » (directrice de la publication, TVA, médiation, crédits). Corrections
faites : « Fance » → « France », « ( Mirco-entreprise) » → « (Micro-entreprise) », espace avant la
virgule de l’adresse, « situé » → « située » (la société Wix), point ajouté après « 05/02/2026 »,
« loi nº78-17 DU » → « loi n° 78-17 du », « Données Personnelles » → « Données personnelles »,
typographie française.

- [ ] **Hébergeur** : le texte officiel nomme Wix Online Platform Limited (hébergeur de l’ancien site
  Wix). Le nouveau site est prévu sur Vercel Inc. (440 N Barranca Avenue #4133, Covina, CA 91723,
  États-Unis), la boutique sur Shopify : mettre à jour le paragraphe « Hébergement » (champ
  `hebergeur`).
- [ ] « Société : Awrea Paris » et « Raison sociale : Auto-entrepreneur (Micro-entreprise) » : une
  entreprise individuelle n’a ni société ni raison sociale ; indiquer « Léane Soubrier, entrepreneur
  individuel (EI), nom commercial Awrea Paris ».
- [ ] « Commune : Yvelines » : Yvelines est le département, la commune est Croissy-sur-Seine.
- [ ] « Awrea Paris étant une marque déposée » : numéro et date d’enregistrement à fournir (champ
  `marque`), ou phrase à retirer si la marque n’est pas enregistrée.
- [ ] Directrice de la publication (obligatoire) et situation de TVA : absentes du texte officiel.
- [ ] « Tout le contenu du présent sur le site » : formulation à corriger (« du présent site »).
- [ ] « Charte de Protection des Données Personnelles » : la page du site s’appelle « Politique de
  confidentialité » (`/confidentialite`) ; harmoniser le nom, et compléter la liste des droits (le
  paragraphe cite la loi de 1978 et seulement quatre droits).

## Version anglaise

- [ ] Traduction anglaise des CGV, des mentions légales et du formulaire type de rétractation (`content/site/en/cgv.json`, `mentions-legales.json`, `juridique.json`), avec en tête la mention « seule la version française fait foi » (champ `chapeau`, non officiel) : traduction et mention à faire valider par une ou un professionnel du droit.

## Autres informations à confirmer

- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », adresse citée par les mentions légales officielles ; les CGV officielles citent encore l’adresse du site Wix).
- [ ] Adresse e-mail de contact : « awrea.contact@gmail.com » (mentions légales officielles), reprise dans `content/brand/identity.ts` → `email`. Les e-mails du site partent de `EMAIL_FROM` : une adresse Gmail ne peut pas servir d’expéditrice vérifiée (Resend) ; prévoir une adresse du domaine pour l’envoi.
- [ ] Adresse de l’atelier où la créatrice reçoit sur rendez-vous et lieu du retrait des commandes (publiés seulement s’ils sont renseignés) : `content/brand/identity.ts` → `address` (ville « Paris » par défaut, à confirmer) ; l’adresse de l’entreprise est à Croissy-sur-Seine (`legalAddress`).
- [ ] Année de création de la Maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`. L’entreprise est inscrite au RNE depuis le 05/02/2026, début d’activité le 01/04/2026.
- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).

## Avant la mise en ligne

- [ ] Faire relire l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste, en commençant par les écarts listés plus haut.
- [ ] Mettre à jour les CGV et les mentions légales officielles (adresse du site, hébergeur, création sur demande, délais, rétractation, garanties, médiation), puis les reporter mot pour mot dans l’éditeur « Édition » (documents « Conditions générales de vente » et « Mentions légales »).
- [ ] Signer la convention avec un médiateur de la consommation et renseigner le champ `mediateur`.
- [ ] Vérifier dans Shopify : politiques (CGV, confidentialité, retours) liées au checkout, moyens de paiement activés (article 4 des CGV), zones de livraison (article 5), paiement en plusieurs fois.
- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.
- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.
