# Informations légales à compléter — Awrea Paris

> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :
> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère doré « [À COMPLÉTER : …] ».
> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.

**20 information(s) à fournir** sur 20.

## Informations de l’entreprise

| Champ | Information attendue | Où la trouver | Pages concernées |
|---|---|---|---|
| `raisonSociale` | dénomination sociale ou nom de l’entrepreneuse | Extrait Kbis, avis de situation INSEE ou attestation d’immatriculation au registre national des entreprises (RNE) | Mentions légales (`/mentions-legales`), CGV (`/cgv`), CGU (`/cgu`), Confidentialité (`/confidentialite`), Propriété intellectuelle (`/propriete-intellectuelle`), Rétractation (`/retractation`) |
| `formeJuridique` | forme juridique (SAS, SASU, SARL, EURL, entreprise individuelle…) | Statuts ou Kbis | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `capital` | montant du capital social (sociétés uniquement ; supprimer la mention pour une entreprise individuelle) | Statuts ou Kbis | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `siege` | adresse du siège social (ou du domicile professionnel) | Kbis ou attestation RNE | Mentions légales (`/mentions-legales`), CGV (`/cgv`), Confidentialité (`/confidentialite`), Rétractation (`/retractation`) |
| `immatriculation` | numéro et ville d’immatriculation (RCS, ou RNE pour une entreprise artisanale ou individuelle) | Kbis ou attestation d’immatriculation | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `siret` | numéro SIRET | Avis de situation INSEE (sirene.fr) | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `tva` | numéro de TVA intracommunautaire, ou la mention « TVA non applicable, art. 293 B du CGI » en franchise de TVA | Espace professionnel impots.gouv.fr | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `directricePublication` | nom et prénom de la directrice de la publication | Représentante légale de l’entreprise | Mentions légales (`/mentions-legales`) |
| `email` | adresse e-mail de contact (à confirmer : contact@awreaparis.com est utilisée par défaut sur le site) | Boîte de réception de la maison | Mentions légales (`/mentions-legales`), CGV (`/cgv`), Confidentialité (`/confidentialite`), Rétractation (`/retractation`) |
| `telephone` | numéro de téléphone du service client (obligatoire dans les mentions légales et les CGV) | Ligne professionnelle | Mentions légales (`/mentions-legales`), CGV (`/cgv`) |
| `horaires` | jours et horaires de disponibilité du service client | Organisation de l’atelier | CGV (`/cgv`) |
| `mediateur` | médiateur de la consommation : nom, adresse postale et site internet (adhésion obligatoire, articles L612-1 et suivants du Code de la consommation) | Convention signée avec un médiateur référencé par la CECMC (liste sur economie.gouv.fr) | CGV (`/cgv`), Mentions légales (`/mentions-legales`) |
| `hebergeurTelephone` | numéro de téléphone de l’hébergeur Vercel Inc. (exigé par l’article 6 de la LCEN) | Page légale de Vercel (vercel.com/legal) ou contrat d’hébergement | Mentions légales (`/mentions-legales`) |
| `marque` | numéro et date d’enregistrement de la marque « Awrea Paris » (INPI ou EUIPO), si elle est déposée ; sinon supprimer la mention | Certificat d’enregistrement INPI (data.inpi.fr) ou EUIPO | Propriété intellectuelle (`/propriete-intellectuelle`) |
| `creditsPhotos` | crédits des photographes, vidéastes et mannequins (noms ou agences) et étendue des droits cédés | Contrats de cession de droits et autorisations de droit à l’image signés | Propriété intellectuelle (`/propriete-intellectuelle`), Mentions légales (`/mentions-legales`) |
| `regionBase` | région d’hébergement du projet Supabase (base clientes) — recommandé : Union européenne (Francfort ou Paris) | Réglages du projet Supabase (Project Settings → General) | Confidentialité (`/confidentialite`) |
| `regionsPrestataires` | régions d’hébergement retenues pour Upstash (stockage technique) et Sentry (suivi des erreurs) — recommandé : Union européenne | Réglages des comptes Upstash et Sentry | Confidentialité (`/confidentialite`) |
| `outilEmails` | outil d’e-mails marketing retenu : Brevo (France) ou Klaviyo (États-Unis) | Choix de la maison | Confidentialité (`/confidentialite`) |
| `paiementFractionne` | prestataire du paiement en plusieurs fois (par exemple Shop Pay Installments, Klarna ou Alma) tel qu’activé dans Shopify | Shopify → Paramètres → Paiements | CGV (`/cgv`), Confidentialité (`/confidentialite`) |
| `delaiConservationDevis` | durée de conservation des demandes de rendez-vous et de sur-mesure sans suite (proposé : 3 ans après le dernier échange) | Décision de la maison (à valider) | Confidentialité (`/confidentialite`) |

## Conditions commerciales à confirmer

Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans les CGV et la page Livraison et retours :

- [ ] Seuil de livraison offerte, tarifs et délais de livraison (content/settings.ts → shop.shippingRates, freeShippingThreshold).
- [ ] Délai de rétractation et de retour (14 jours minimum légal ; content/settings.ts → returnDays) et prise en charge des frais de retour (offerts en France, à la charge de la cliente hors de France : à confirmer).
- [ ] Délais de fabrication des précommandes indiqués sur chaque fiche, et moment du débit pour une précommande (au moment de la commande par défaut avec Shopify).
- [ ] Durée de validité des cartes cadeaux (un an par défaut dans les CGV) et règles de cumul des codes de réduction.
- [ ] Prix de l’emballage cadeau (content/settings.ts → giftWrapPrice).
- [ ] Mode de gestion des droits et taxes à l’importation hors Union européenne (perçus à la commande avec Shopify Markets, ou dus à la réception).

## Autres informations à confirmer

- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », hypothèse à confirmer — l’ancien site était publié sur GitHub Pages).
- [ ] Adresse e-mail de contact publiée partout sur le site : `content/brand/identity.ts` → `email` (actuellement « contact@awreaparis.com », à confirmer ou remplacer).
- [ ] Adresse e-mail presse : `content/fr/legal.ts` → `press.contact.email` (actuellement « presse@awreaparis.com », à confirmer).
- [ ] Téléphone et adresse de l’atelier (facultatifs, publiés seulement s’ils sont renseignés) : `content/brand/identity.ts` → `phone`, `address`.
- [ ] Année de création de la maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`.
- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).

## Avant la mise en ligne

- [ ] Faire relire l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste.
- [ ] Signer la convention avec un médiateur de la consommation et renseigner le champ `mediateur`.
- [ ] Vérifier dans Shopify : politiques (CGV, confidentialité, retours) liées au checkout, droits et taxes (Shopify Markets), paiement en plusieurs fois.
- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.
- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.
