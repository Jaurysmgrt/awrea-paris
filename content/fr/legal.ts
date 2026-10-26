/**
 * Pages légales et pratiques écrites dans la voix de la Maison.
 *
 * Les textes officiels de la créatrice, repris mot pour mot, ne sont pas ici : conditions générales
 * de vente (content/site/fr/cgv.json) et mentions légales (content/site/fr/mentions-legales.json),
 * modifiables dans l'éditeur « Édition ». Les pages ci-dessous restent cohérentes avec eux et avec
 * la création sur demande (aucun stock : chaque pièce est confectionnée après la commande, dans le
 * délai de fabrication indiqué sur sa fiche). Elles renvoient aux articles des CGV plutôt que de
 * les reformuler ; les écarts entre les CGV et le fonctionnement du site sont listés dans
 * LEGAL-A-COMPLETER.md.
 *
 * Conventions d'écriture (interprétées par components/legal/LegalText.tsx) :
 *  - {{cle}}            information de l'entreprise (content/legal/fields.ts) : affichée telle quelle
 *                       si elle est renseignée, sinon repère « [À COMPLÉTER : …] » bien visible ;
 *  - [libellé](/chemin) lien ;
 *  - **texte**          mise en valeur.
 * Aucune information sur l'entreprise n'est écrite en dur ici. Les conditions commerciales
 * (tarifs, seuils, délais) sont lues dans content/settings.ts.
 *
 * Textes à faire relire par un juriste avant la mise en ligne (voir LEGAL-A-COMPLETER.md).
 */
import { shop } from "@/content/settings";
import { legalVersions } from "@/content/legal-versions";
import { formatPrice } from "@/lib/format";
import type { LegalPage } from "@/lib/legal/doc";

export type { LegalBlock, LegalPage, LegalSection } from "@/lib/legal/doc";

const UPDATED = "2026-10-19";
const COMPANY =
  "{{raisonSociale}}, {{formeJuridique}} exerçant sous le nom commercial {{nomCommercial}}, inscrite au {{immatriculation}} sous le numéro SIREN {{siren}} (SIRET {{siret}}), dont l’adresse est {{siege}}";
const free = formatPrice(shop.freeShippingThreshold);
/** Les CGV officielles (article 5) prévoient une livraison en France métropolitaine. */
const franceRates = shop.shippingRates.filter((r) => r.zone === "FR");

export const legalPages = {
  // ================================================================ LIVRAISON & RETOURS
  "livraison-retours": {
    slug: "livraison-retours",
    title: "Livraison et retours",
    seo: {
      title: "Livraison et retours | Awrea Paris",
      description: `Chaque pièce est créée sur demande, puis livrée en France métropolitaine. Délais de fabrication, tarifs de livraison et retours sous ${shop.returnDays} jours.`,
    },
    updated: UPDATED,
    intro: "Chaque pièce est créée pour vous, sur demande, par des artisans français. Elle quitte l’atelier avec son certificat d’authenticité, qui porte son numéro de création.",
    sections: [
      {
        id: "fabrication",
        title: "Une pièce créée sur demande",
        blocks: [
          "Aucune pièce n’attend en stock : votre commande lance sa confection, dans la taille choisie. Le délai de fabrication de chaque pièce est indiqué sur sa fiche, dans le panier et avant le paiement, puis rappelé dans l’e-mail de confirmation.",
          "Vous suivez votre commande étape par étape, de « Commande reçue » à « Livrée », sur la page [Suivre ma commande](/suivi) et dans votre [compte](/compte).",
          "Vous pouvez annuler votre commande dans les deux jours qui suivent son acceptation par la Maison, tant qu’elle n’a pas été livrée. Le détail figure à l’article 3 des [conditions générales de vente](/cgv#commande).",
        ],
      },
      {
        id: "delais",
        title: "Expédition et livraison",
        blocks: [
          "Les pièces sont livrées en France métropolitaine, à l’adresse indiquée lors de la commande, par un transporteur indépendant. Une commande de plusieurs pièces part en une seule fois, quand la dernière est prête.",
          "Le délai de livraison s’ajoute au délai de fabrication. Les conditions de livraison et de transfert des risques figurent à l’article 5 des [conditions générales de vente](/cgv#livraison).",
        ],
      },
      {
        id: "tarifs",
        title: "Tarifs",
        blocks: [
          {
            table: {
              caption: "Modes de livraison en France métropolitaine",
              head: ["Mode de livraison", "Tarif", "Délai après expédition"],
              rows: franceRates.map((r) => [r.label, r.price === 0 ? "Offert" : `${formatPrice(r.price)}${r.freeAboveThreshold ? ` (offert dès ${free})` : ""}`, r.delay]),
            },
          },
          "Les frais de livraison s’ajoutent au prix des pièces. Ils sont calculés et affichés avant le paiement.",
        ],
      },
      {
        id: "suivi",
        title: "Suivi de colis",
        blocks: [
          "Dès l’expédition, vous recevez un e-mail avec le lien de suivi du transporteur. Le suivi est aussi dans [votre compte](/compte), sur la page [Suivre ma commande](/suivi) et auprès de l’assistante du site, avec votre numéro de commande et votre adresse e-mail.",
        ],
      },
      {
        id: "reception",
        title: "À la réception",
        blocks: [
          "Vérifiez l’état de votre colis dès sa réception. Vous disposez de 48 heures pour signaler un colis abîmé et de 14 jours pour un problème sur la pièce. Écrivez à {{email}} en indiquant votre numéro de commande, avec des photos si possible.",
          "La garantie légale de conformité et la garantie des vices cachés restent dues pendant deux ans, dans les conditions de l’article 8 des [conditions générales de vente](/cgv#garanties).",
        ],
      },
      {
        id: "retours",
        title: "Retours et échanges",
        blocks: [
          `Vous disposez de ${shop.returnDays} jours à compter de la réception pour vous rétracter, sans avoir à vous justifier. Le plus simple passe par [la rétractation en ligne](/retractation), ou par la rubrique « Commandes » de votre compte.`,
          "La pièce revient dans son état d’origine et complète, avec son emballage, son certificat d’authenticité et sa facture d’achat. Une pièce abîmée, salie ou incomplète n’est pas reprise. Les frais de retour restent à votre charge.",
          "Vous êtes remboursée, ou la pièce est échangée si vous le demandez, dans les conditions de l’article 7 des [conditions générales de vente](/cgv#retractation). Une pièce échangée contre une autre taille est créée sur demande, avec son délai de fabrication.",
          "Les pièces de la boutique, créées sur demande dans les tailles du guide, ouvrent droit à la rétractation. Une pièce confectionnée selon vos mesures en est exclue (article L221-28, 3° du Code de la consommation).",
        ],
      },
      {
        id: "cadeau",
        title: "Emballage cadeau",
        blocks: [`Pour ${formatPrice(shop.giftWrapPrice)}, votre pièce part emballée pour être offerte, avec le message de votre choix. Le prix n’apparaît pas sur le bon de livraison.`],
      },
    ],
  },

  // ================================================================ PROPRIÉTÉ INTELLECTUELLE
  "propriete-intellectuelle": {
    slug: "propriete-intellectuelle",
    title: "Propriété intellectuelle et droits réservés",
    seo: {
      title: "Propriété intellectuelle et droits réservés | Awrea Paris",
      description: "Créations, marque, photographies et droit à l’image : ce qui est protégé sur le site Awrea Paris, ce qui est permis et comment signaler une contrefaçon.",
    },
    updated: UPDATED,
    intro: "Chaque pièce Awrea Paris est une création originale de la Maison, dessinée par la créatrice et confectionnée par des artisans français. Les images qui la montrent sont protégées, elles aussi.",
    sections: [
      {
        id: "creations",
        title: "Les créations",
        blocks: [
          "Les modèles, patronages, broderies, associations de matières et dessins des pièces Awrea Paris sont des créations originales de {{raisonSociale}}, protégées par le droit d’auteur (livre I du Code de la propriété intellectuelle) et, le cas échéant, par le droit des dessins et modèles (livre V).",
          "Toute reproduction, imitation ou commercialisation d’une copie, totale ou partielle, constitue une contrefaçon sanctionnée notamment par les articles L335-2 et L521-1 du Code de la propriété intellectuelle. L’article 10 des [conditions générales de vente](/cgv#propriete-intellectuelle) et les [mentions légales](/mentions-legales#propriete-intellectuelle) le rappellent.",
        ],
      },
      {
        id: "marque",
        title: "La marque, le logo et le monogramme",
        blocks: [
          "Le nom « Awrea Paris », le logo et le monogramme « AW » sont des signes distinctifs de la Maison. La marque « Awrea Paris » est déposée, sous le numéro {{marque}}.",
          "Leur utilisation, seule ou associée à d’autres signes, est interdite sans autorisation écrite préalable.",
        ],
      },
      {
        id: "images",
        title: "Photographies, vidéos et textes",
        blocks: [
          "Les photographies des pièces sont, pour l’instant, des visuels provisoires générés en attendant les prises de vue de la collection. Chacune porte la mention « visuel provisoire » et sera remplacée par une photographie de la pièce réelle.",
          "Les photographies et vidéos réalisées pour la Maison sont utilisées avec l’accord de leurs autrices et auteurs. Crédits : {{creditsPhotos}}.",
          "Les textes, la mise en page, les animations et le code du site sont également protégés. Leur reproduction, même partielle, est interdite sans autorisation.",
        ],
      },
      {
        id: "image-mannequins",
        title: "Droit à l’image",
        blocks: [
          "Les personnes photographiées pour la Maison ont autorisé l’utilisation de leur image pour une durée, des supports et des usages définis. Toute reprise de ces images en dehors du site et des comptes officiels de la Maison porte atteinte à leur droit à l’image (article 9 du Code civil) et est interdite.",
        ],
      },
      {
        id: "permis",
        title: "Ce qui est permis",
        blocks: [
          {
            list: [
              "Partager l’adresse d’une page du site, ou une publication des comptes officiels avec les outils de partage des réseaux sociaux.",
              "Citer un court extrait de texte en mentionnant la source « Awrea Paris » et un lien vers la page.",
              "Pour la presse, demander le kit presse et les visuels depuis l’[espace presse](/presse) ; chaque utilisation mentionne les crédits indiqués.",
            ],
          },
        ],
      },
      {
        id: "contenus-clientes",
        title: "Vos avis et vos photos",
        blocks: [
          "En publiant un avis ou une photo, vous autorisez la Maison à les afficher, gratuitement et sans exclusivité, sur la fiche de la pièce concernée, pour la durée de leur publication. Toute autre utilisation (réseaux sociaux, lettres, publicité) ne se fait qu’avec votre accord exprès et distinct. Vous pouvez demander le retrait de votre avis ou de votre photo à tout moment.",
          "Vous garantissez détenir les droits sur la photo publiée et l’accord des personnes qui y figurent.",
        ],
      },
      {
        id: "contrefacon",
        title: "Signaler une copie",
        blocks: ["Si vous pensez avoir repéré une copie d’une pièce Awrea Paris, ou une utilisation non autorisée de nos images, écrivez-nous à {{email}} avec un lien ou une photo. Merci de votre vigilance."],
      },
    ],
  },

  // ================================================================ CGU
  cgu: {
    slug: "cgu",
    title: "Conditions générales d’utilisation",
    seo: {
      title: "Conditions générales d’utilisation | Awrea Paris",
      description: "Conditions d’utilisation du site et du compte cliente Awrea Paris : création du compte, avis, liste d’envies partagée, assistante IA, Cercle Awrea et avant-premières.",
    },
    updated: UPDATED,
    version: legalVersions.cgu,
    intro: "Ces conditions encadrent l’utilisation du site Awrea Paris et du compte cliente. Elles sont acceptées à la création du compte, au moyen d’une case à cocher.",
    sections: [
      { id: "objet", title: "1. Objet", blocks: [`Elles s’appliquent à toute visiteuse du site et à toute titulaire d’un compte. Les achats sont régis par les [conditions générales de vente](/cgv). L’éditrice du site est ${COMPANY} (voir les [mentions légales](/mentions-legales)).`] },
      { id: "acces", title: "2. Accès au site", blocks: ["Le site est accessible gratuitement, sans compte. La Maison s’efforce de le rendre disponible en permanence mais peut l’interrompre pour maintenance ou mise à jour ; une page d’attente l’indique alors."] },
      {
        id: "compte",
        title: "3. Le compte cliente",
        blocks: [
          "Le compte se crée et s’ouvre sans mot de passe : par un code à usage unique envoyé par e-mail, ou avec un compte Google ou Apple. La création suppose l’acceptation des présentes conditions.",
          "Il est réservé aux personnes âgées d’au moins quinze ans. Les achats d’une personne mineure se font sous la responsabilité de ses représentants légaux.",
          "La titulaire fournit des informations exactes et veille à la sécurité de sa boîte e-mail et de son compte Google ou Apple, qui donnent accès au compte. Elle prévient la Maison de toute utilisation qu’elle n’aurait pas autorisée.",
          "Le compte permet de suivre ses commandes pendant leur confection, de retrouver ses certificats d’authenticité, d’enregistrer ses tailles et mesures, ses adresses et sa liste d’envies, de régler ses préférences, de télécharger ou de supprimer ses données.",
        ],
      },
      {
        id: "fermeture",
        title: "4. Fermeture du compte",
        blocks: [
          "La titulaire peut supprimer son compte à tout moment, depuis la rubrique « Mes données ». La Maison peut suspendre ou fermer un compte en cas d’utilisation frauduleuse ou de manquement grave aux présentes conditions, après en avoir informé la titulaire, sauf urgence. Un compte resté inactif pendant trois ans est supprimé après un message de prévenance.",
        ],
      },
      {
        id: "avis",
        title: "5. Avis et photos des clientes",
        blocks: [
          "Seules les clientes ayant acheté une pièce peuvent publier un avis à son sujet ; l’avis est signalé comme « vérifié ». Il est publié avec le prénom et l’initiale du nom, sans note chiffrée.",
          "Chaque avis est relu avant publication. Il peut être refusé s’il est sans rapport avec la pièce, injurieux, discriminatoire, s’il contient des données personnelles d’un tiers, de la publicité ou s’il porte atteinte aux droits d’autrui. Les avis ne sont ni achetés ni rémunérés, et les avis négatifs ne sont pas écartés pour ce seul motif.",
          "Les droits concédés sur les avis et photos sont précisés dans la page [Propriété intellectuelle](/propriete-intellectuelle#contenus-clientes).",
        ],
      },
      { id: "envies", title: "6. Liste d’envies partagée", blocks: ["La titulaire peut créer un lien secret vers sa liste d’envies. Toute personne disposant du lien voit les pièces et le prénom de la titulaire. Le lien peut être désactivé à tout moment depuis le compte."] },
      {
        id: "ia",
        title: "7. Assistante IA",
        blocks: [
          "Le site propose une assistante fondée sur l’intelligence artificielle. Ses réponses sont informatives : en cas de différence, les informations des fiches des pièces, des conditions générales de vente et de l’atelier font foi. Son fonctionnement est expliqué dans la [notice de l’assistante IA](/assistant-ia).",
        ],
      },
      {
        id: "cercle",
        title: "8. Le Cercle Awrea et les avant-premières",
        blocks: [
          "Le Cercle Awrea est un club gratuit, sans obligation d’achat : avant-premières des nouvelles pièces, invitations à l’atelier, aperçus des croquis. Toute titulaire d’un compte peut le rejoindre ou le quitter depuis son compte. Le statut VIP est attribué automatiquement selon le montant et le nombre des commandes.",
          "Les avant-premières peuvent être protégées par un mot de passe ou réservées aux inscrites. Ces accès sont personnels : leur diffusion publique peut entraîner la fermeture de l’avant-première concernée.",
        ],
      },
      {
        id: "comportement",
        title: "9. Utilisation loyale",
        blocks: ["Il est interdit de perturber le fonctionnement du site, d’en extraire massivement le contenu par des moyens automatisés autres que ceux autorisés dans le fichier robots.txt, de contourner ses mesures de sécurité ou de l’utiliser à des fins illicites."],
      },
      { id: "propriete", title: "10. Propriété intellectuelle", blocks: ["Voir la page [Propriété intellectuelle et droits réservés](/propriete-intellectuelle)."] },
      {
        id: "responsabilite",
        title: "11. Responsabilité",
        blocks: ["La Maison met en œuvre des moyens raisonnables pour assurer l’exactitude des informations et la sécurité du site. Sa responsabilité ne saurait être engagée pour une indisponibilité temporaire ou pour le contenu de sites tiers vers lesquels le site renvoie."],
      },
      { id: "donnees", title: "12. Données personnelles et cookies", blocks: ["Voir l’article 9 des [conditions générales de vente](/cgv#donnees), la [politique de confidentialité](/confidentialite) et la [politique cookies](/cookies)."] },
      {
        id: "modification",
        title: "13. Modification des conditions",
        blocks: ["En cas de modification substantielle, la nouvelle version est présentée à la titulaire lors de sa connexion suivante et doit être acceptée pour continuer à utiliser le compte. La version en vigueur est indiquée en haut de cette page."],
      },
      { id: "droit", title: "14. Droit applicable", blocks: ["Les présentes conditions sont soumises au droit français, sans préjudice des dispositions protectrices de la loi du pays de résidence de l’utilisatrice."] },
    ],
  },

  // ================================================================ CONFIDENTIALITÉ
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    seo: {
      title: "Politique de confidentialité | Awrea Paris",
      description: "Données collectées, finalités, durées, destinataires et transferts, et comment exercer vos droits (RGPD) auprès d’Awrea Paris ou de la CNIL.",
    },
    updated: UPDATED,
    version: legalVersions.confidentialite,
    intro: "Nous ne collectons que ce qui sert votre commande, votre compte et vos choix. Cette politique explique quelles données nous traitons, pourquoi, combien de temps, avec qui, et comment exercer vos droits.",
    sections: [
      {
        id: "responsable",
        title: "1. Responsable du traitement",
        blocks: [
          `Le responsable du traitement est ${COMPANY}. Pour toute question relative à vos données : {{email}}. La Maison n’a pas désigné de délégué à la protection des données (cette désignation n’est pas obligatoire pour elle).`,
          "Cette politique détaille l’article 9 des [conditions générales de vente](/cgv#donnees), consacré aux données personnelles.",
        ],
      },
      {
        id: "traitements",
        title: "2. Données, finalités, bases légales et durées",
        blocks: [
          {
            table: {
              caption: "Traitements de données personnelles",
              head: ["Finalité", "Données", "Base légale", "Durée de conservation"],
              rows: [
                ["Commandes, confection, livraison, service après-vente", "Noms, prénoms, adresse postale, téléphone, adresse e-mail, contenu de la commande, échanges", "Exécution du contrat ; obligations comptables", "5 ans pour les données de commande (article 9.5 des CGV) ; 10 ans pour les factures et pièces comptables (obligation légale)"],
                ["Paiement", "Données de paiement saisies sur la page de paiement sécurisée et traitées par les prestataires de paiement ; la Maison n’y a jamais accès", "Exécution du contrat", "Selon la politique du prestataire"],
                ["Compte cliente", "E-mail, nom, téléphone, anniversaire (facultatif), tailles et mesures (facultatives), adresses, préférences", "Exécution des conditions d’utilisation", "Jusqu’à la suppression du compte ; 3 ans d’inactivité au plus"],
                ["Liste d’envies", "Pièces et tailles choisies", "Exécution des conditions d’utilisation", "Jusqu’à la suppression du compte"],
                ["Lettre de la Maison et e-mails personnalisés (bienvenue à l’inscription, avant-premières des collections, panier en attente)", "E-mail, prénom et nom, téléphone (facultatif), segment de clientèle, ouvertures", "Consentement exprès (article 9.4 des CGV)", "Jusqu’au retrait du consentement ; 3 ans sans interaction au plus"],
                ["E-mails après achat, sans caractère publicitaire (conseils d’entretien, demande d’avis)", "E-mail, pièces achetées", "Intérêt légitime (suivi de la relation), opposable à tout moment", "Durée de la relation commerciale"],
                ["Avis vérifiés", "Prénom et initiale, texte, taille, photo facultative", "Consentement", "Durée de publication ; retrait sur demande"],
                ["Personnalisation (pièces vues, collections préférées, panier en attente)", "Identifiants de pièces, dates", "Consentement (catégorie « personnalisation »)", "13 mois"],
                ["Mesure d’audience", "Données de navigation agrégées", "Consentement (catégorie « mesure d’audience »)", "13 mois pour les traceurs, 25 mois pour les statistiques"],
                ["Publicité (Instagram, Facebook, TikTok, Google)", "Identifiants publicitaires, évènements (visite, ajout au panier, achat)", "Consentement (catégorie « publicité »)", "13 mois pour les traceurs"],
                ["Assistante IA", "Messages échangés", "Intérêt légitime (vous répondre)", "Conversation conservée 30 jours"],
                ["Contact, rendez-vous, sur-mesure", "Nom, e-mail, message, créneau, mesures communiquées", "Mesures précontractuelles ; intérêt légitime", "{{delaiConservationDevis}}"],
                ["Certificats d’authenticité", "Numéro de création, code de vérification, pièce, commande, rattachement au compte", "Exécution du contrat", "Durée de vie du compte ; le certificat reste consultable sans donnée personnelle"],
                ["Notifications (application installée)", "Abonnement technique du navigateur, thèmes choisis", "Consentement", "Jusqu’au désabonnement"],
                ["Sécurité, prévention de la fraude et des robots", "Adresse IP, journaux techniques et d’erreurs", "Intérêt légitime (sécurité du site)", "Quelques minutes (limitation de débit) ; 90 jours (journaux d’erreurs)"],
                ["Preuves de consentement aux cookies", "Identifiant aléatoire, choix, date, version de la politique, navigateur", "Obligation légale (preuve du consentement)", "25 mois"],
              ],
            },
          },
        ],
      },
      {
        id: "destinataires",
        title: "3. Destinataires et sous-traitants",
        blocks: [
          "Pour une commande, vos données sont transmises aux prestataires de transport et de paiement, comme le prévoit l’article 9.2 des [conditions générales de vente](/cgv#donnees-destinataires). Le fonctionnement du site fait aussi appel aux prestataires suivants, liés par contrat et tenus à la confidentialité :",
          {
            table: {
              caption: "Sous-traitants et partenaires",
              head: ["Prestataire", "Rôle", "Localisation des données"],
              rows: [
                ["Shopify International Limited", "Boutique, commandes, paiements", "Union européenne, avec transferts vers le Canada et les États-Unis"],
                ["Stripe (Shopify Payments)", "Paiement par carte, Apple Pay, Google Pay", "Union européenne et États-Unis"],
                ["PayPal (Europe) S.à r.l. et Cie, S.C.A.", "Paiement PayPal (responsable de traitement distinct)", "Union européenne (Luxembourg)"],
                ["Supabase, Inc.", "Base clientes et connexion au compte", "{{regionBase}}"],
                ["Vercel Inc.", "Hébergement du site", "États-Unis et réseau mondial"],
                ["Upstash, Inc.", "Stockage technique (paniers, files d’envoi, limitation de débit)", "{{regionsPrestataires}}"],
                ["{{outilEmails}}", "E-mails de la Maison (lettres et scénarios automatiques)", "Selon l’outil retenu"],
                ["Resend", "E-mails techniques (codes de connexion, confirmations)", "États-Unis"],
                ["Anthropic PBC", "Assistante IA (modèle Claude) ; données non utilisées pour l’entraînement", "États-Unis"],
                ["Cloudflare, Inc.", "Protection des formulaires contre les robots (Turnstile)", "États-Unis et réseau mondial"],
                ["Sentry (Functional Software, Inc.)", "Suivi des erreurs techniques", "{{regionsPrestataires}}"],
                ["Plausible Insights OÜ ou Google Ireland Limited", "Mesure d’audience, avec votre consentement", "Union européenne (Plausible) ; Union européenne et États-Unis (Google)"],
                ["Microsoft Ireland Operations Limited (Clarity)", "Analyse du parcours sur les pages (cartes de chaleur, saisies masquées), avec votre consentement", "Union européenne et États-Unis"],
                ["Meta Platforms Ireland Limited, TikTok Technology Limited, Google Ireland Limited", "Publicité et mesure des campagnes, avec votre consentement", "Union européenne et États-Unis"],
                ["La Poste (Colissimo), Mondial Relay, Chronopost, DHL", "Livraison des commandes", "Selon la destination"],
              ],
            },
          },
          "Vos données ne sont jamais vendues. Elles peuvent être communiquées aux autorités lorsque la loi l’exige.",
        ],
      },
      {
        id: "transferts",
        title: "4. Transferts hors de l’Union européenne",
        blocks: [
          "Lorsque des données sont traitées hors de l’Union européenne, ces transferts sont encadrés par une décision d’adéquation de la Commission européenne (notamment le cadre de protection des données UE-États-Unis pour les entreprises certifiées, ou la décision relative au Canada) ou, à défaut, par les clauses contractuelles types adoptées par la Commission, complétées si nécessaire de mesures techniques. Vous pouvez en obtenir une copie en nous écrivant.",
        ],
      },
      {
        id: "securite",
        title: "5. Sécurité",
        blocks: [
          "Le site est servi exclusivement en HTTPS. Les comptes sont cloisonnés dans la base par des règles de sécurité par ligne : chaque cliente n’accède qu’à ses propres données. Le tableau de bord de l’atelier est protégé par une double authentification obligatoire. Les tentatives de connexion sont limitées, les formulaires protégés contre les robots, la base sauvegardée chaque jour. Aucune donnée bancaire n’est stockée par la Maison.",
        ],
      },
      {
        id: "droits",
        title: "6. Vos droits",
        blocks: [
          "Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition, du droit de retirer votre consentement à tout moment, et du droit de définir des directives relatives au sort de vos données après votre décès.",
          "Depuis votre [compte](/compte#donnees), vous pouvez télécharger l’ensemble de vos données et supprimer votre compte vous-même. Vous pouvez aussi écrire à {{email}} ou par courrier à {{siege}} ; une preuve d’identité peut être demandée en cas de doute. Nous répondons dans un délai d’un mois.",
          "Vous pouvez introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 (cnil.fr).",
        ],
      },
      { id: "mineures", title: "7. Mineures", blocks: ["Le compte est réservé aux personnes âgées d’au moins quinze ans. Si vous pensez qu’une personne plus jeune nous a transmis des données, écrivez-nous pour que nous les supprimions."] },
      { id: "cookies", title: "8. Cookies", blocks: ["Le détail des cookies et traceurs, et la façon de modifier vos choix, figurent dans la [politique cookies](/cookies)."] },
      { id: "modifications", title: "9. Modifications", blocks: ["Cette politique peut évoluer ; la date et la version en vigueur sont indiquées en haut de la page. En cas de changement important, vous en serez informée."] },
    ],
  },

  // ================================================================ COOKIES
  cookies: {
    slug: "cookies",
    title: "Politique cookies",
    seo: {
      title: "Politique cookies | Awrea Paris",
      description: "Les cookies et traceurs du site Awrea Paris, par catégorie, avec leur finalité et leur durée, et comment modifier vos choix à tout moment.",
    },
    updated: UPDATED,
    version: legalVersions.cookies,
    intro: "Un cookie est un petit fichier déposé sur votre appareil ; d’autres traceurs (stockage local, pixels) fonctionnent de façon comparable. Nous n’utilisons que ceux qui sont nécessaires, et tous les autres uniquement avec votre accord.",
    sections: [
      {
        id: "choix",
        title: "Votre choix",
        blocks: [
          "À votre première visite, un bandeau vous propose d’accepter ou de refuser les cookies non nécessaires, avec la même simplicité, ou de choisir catégorie par catégorie : mesure d’audience, personnalisation, publicité. Aucun cookie non nécessaire n’est déposé avant votre choix.",
          "Votre choix est conservé treize mois, puis vous est redemandé ; il l’est aussi à chaque évolution importante de cette politique. Une preuve de chaque choix est conservée, sans donnée d’identification directe. Lorsque vous retirez votre accord, les traceurs concernés sont effacés.",
          { widget: "cookie-settings" },
        ],
      },
      {
        id: "categories",
        title: "Les catégories",
        blocks: [
          {
            list: [
              "**Nécessaires.** Le panier, la connexion au compte, la sécurité, la mémorisation de vos choix. Toujours actifs : le site ne peut fonctionner sans eux.",
              "**Mesure d’audience.** Compter les visites et les pièces consultées, de façon agrégée, pour améliorer le site.",
              "**Personnalisation.** Se souvenir des pièces et des collections que vous avez regardées, pour vous proposer une sélection à votre retour. Garder votre panier en attente, pour vous le rappeler.",
              "**Publicité.** Mesurer l’efficacité de nos campagnes sur Instagram, Facebook, TikTok et Google, et vous y montrer nos pièces.",
            ],
          },
        ],
      },
      { id: "liste", title: "La liste complète", blocks: [{ widget: "cookie-table" }] },
      {
        id: "instagram",
        title: "Le flux Instagram",
        blocks: ["Les images de notre compte Instagram sont récupérées par notre serveur et servies depuis notre propre domaine : leur affichage ne dépose aucun traceur d’Instagram sur votre appareil."],
      },
      {
        id: "navigateur",
        title: "Les réglages de votre navigateur",
        blocks: ["Vous pouvez aussi bloquer ou supprimer les cookies depuis les réglages de votre navigateur. Bloquer les cookies nécessaires empêche toutefois le panier et le compte de fonctionner."],
      },
      { id: "plus", title: "En savoir plus", blocks: ["Les recommandations de la CNIL sur les cookies et autres traceurs sont disponibles sur cnil.fr. Nos autres engagements figurent dans la [politique de confidentialité](/confidentialite)."] },
    ],
  },

  // ================================================================ NOTICE ASSISTANTE IA
  "assistant-ia": {
    slug: "assistant-ia",
    title: "L’assistante IA",
    seo: {
      title: "Notice de l’assistante IA | Awrea Paris",
      description: "Comment fonctionne l’assistante IA d’Awrea Paris, ses limites, le traitement de vos messages, et comment parler à tout moment à une personne de la Maison.",
    },
    updated: UPDATED,
    intro: "Sur le site, une assistante fondée sur l’intelligence artificielle vous répond à toute heure. Voici ce qu’il faut savoir avant de lui écrire.",
    sections: [
      {
        id: "ia",
        title: "Vous échangez avec une intelligence artificielle",
        blocks: [
          "L’assistante n’est pas une personne : c’est un programme fondé sur le modèle de langage Claude, conçu par la société Anthropic, que la Maison a configuré avec ses propres informations (pièces, tailles, délais de fabrication, livraison, retours, histoire de la Maison). La fenêtre de discussion le rappelle en permanence.",
        ],
      },
      {
        id: "capacites",
        title: "Ce qu’elle peut faire",
        blocks: [
          {
            list: [
              "Vous parler d’une pièce, de sa taille et du guide des tailles, et vous aider à associer les pièces de la collection.",
              "Vous indiquer le délai de fabrication d’une pièce, les délais de livraison et les conditions de retour.",
              "Retrouver le suivi d’une commande, après vérification du numéro de commande et de l’adresse e-mail.",
              "Transmettre votre demande à la créatrice, qui vous répond elle-même, notamment pour une question de matière ou d’entretien.",
            ],
          },
        ],
      },
      {
        id: "limites",
        title: "Ses limites",
        blocks: [
          "Ses réponses peuvent comporter des erreurs. Les informations des fiches des pièces, des [conditions générales de vente](/cgv) et de l’atelier font foi. Elle ne peut ni modifier une commande, ni accorder un remboursement, ni prendre d’engagement au nom de la Maison : ces décisions sont toujours prises par une personne.",
        ],
      },
      {
        id: "humain",
        title: "Parler à une personne, à tout moment",
        blocks: [
          "Écrivez simplement « je souhaite parler à quelqu’un », ou utilisez le lien « Écrire à la Maison » sous la conversation : votre message est transmis à la créatrice, qui vous répond personnellement par e-mail. Vous pouvez aussi passer directement par le [formulaire de contact](/contact).",
        ],
      },
      {
        id: "donnees",
        title: "Vos messages",
        blocks: [
          "Vos messages sont traités par Anthropic, en qualité de sous-traitant, pour produire les réponses ; ils ne servent pas à entraîner ses modèles. La conversation est conservée dans votre navigateur le temps de votre visite, et une copie est gardée 30 jours par la Maison pour améliorer les réponses.",
          "N’indiquez ni données bancaires, ni informations de santé, ni données concernant d’autres personnes. Le détail figure dans la [politique de confidentialité](/confidentialite).",
        ],
      },
      {
        id: "gestion",
        title: "L’intelligence artificielle à l’atelier",
        blocks: [
          "La Maison utilise aussi des agents d’intelligence artificielle pour les tâches quotidiennes (rédaction des fiches, préparation des réponses, suivi des commandes en confection, rapports). Une personne valide toute décision qui engage de l’argent ou qui ne peut pas être annulée. C’est le cas d’un remboursement, d’un changement de prix, d’une suppression ou d’une lettre envoyée à toutes les clientes.",
        ],
      },
    ],
  },

  // ================================================================ RÉTRACTATION
  retractation: {
    slug: "retractation",
    title: "Se rétracter d’une commande",
    seo: {
      title: "Rétractation en ligne | Awrea Paris",
      description: `Exercez votre droit de rétractation de ${shop.returnDays} jours en ligne, en deux étapes, et recevez aussitôt un accusé de réception.`,
    },
    updated: UPDATED,
    intro: "Vous disposez de quatorze jours après la réception de votre pièce pour changer d’avis, sans avoir à vous justifier. Indiquez votre commande ci-dessous : vous recevrez aussitôt un accusé de réception par e-mail, puis le bordereau de retour.",
    sections: [
      { id: "en-ligne", title: "Se rétracter du contrat ici", blocks: [{ widget: "withdrawal-form" }] },
      {
        id: "conditions",
        title: "Les conditions",
        blocks: [
          "Renvoyez la pièce au plus tard quatorze jours après votre demande, dans son état d’origine et complète, avec son emballage, son certificat d’authenticité et sa facture d’achat. Une pièce abîmée, salie ou incomplète n’est pas reprise. Les frais de retour restent à votre charge.",
          "Le remboursement est fait sur le moyen de paiement utilisé pour la commande, dans le délai prévu à l’article 7 des [conditions générales de vente](/cgv#retractation).",
          "Les pièces de la boutique, créées sur demande dans les tailles du guide, ouvrent droit à la rétractation. Une pièce confectionnée selon vos mesures en est exclue (article L221-28, 3° du Code de la consommation).",
        ],
      },
      {
        id: "autres-moyens",
        title: "Autres moyens",
        blocks: ["Vous pouvez aussi nous écrire à {{email}}, ou envoyer le formulaire ci-dessous par courrier à {{siege}}.", { widget: "withdrawal-model" }],
      },
    ],
  },
} satisfies Record<string, LegalPage>;

export type LegalSlug = keyof typeof legalPages;
