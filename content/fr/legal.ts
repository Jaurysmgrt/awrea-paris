/**
 * Pages légales et pratiques. Modèles de démonstration À FAIRE VALIDER par un juriste
 * et à compléter (raison sociale, SIRET, adresse, hébergeur, médiateur).
 */
export interface LegalSection {
  title: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalPage {
  slug: string;
  title: string;
  seo: { title: string; description: string };
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const COMPANY = "AWREA PARIS [forme juridique et capital à compléter], immatriculée au RCS de Paris sous le numéro [SIRET à compléter], dont le siège est situé [adresse à compléter], 75011 Paris";

export const legalPages: Record<string, LegalPage> = {
  "livraison-retours": {
    slug: "livraison-retours",
    title: "Livraison & retours",
    seo: {
      title: "Livraison et retours | Awrea Paris",
      description: "Livraison offerte en France dès 250 €, expédition internationale suivie, retours sous 14 jours. Toutes les conditions de livraison et de retour d’Awrea Paris.",
    },
    updated: "2026-10-01",
    intro: "Chaque pièce quitte l’atelier pliée dans du papier de soie, glissée dans sa housse en coton et accompagnée de son certificat numéroté.",
    sections: [
      {
        title: "Délais d’expédition",
        paragraphs: [
          "Les pièces disponibles sont expédiées sous 2 à 5 jours ouvrés après la commande. Les pièces en précommande sont expédiées à l’issue du délai de fabrication indiqué sur leur fiche, de deux à six semaines selon la pièce.",
          "Lorsqu’une commande réunit des pièces disponibles et des précommandes, nous l’expédions en une seule fois, sauf si vous nous demandez un envoi séparé.",
        ],
      },
      {
        title: "Tarifs et destinations",
        list: [
          "France, Colissimo suivi : 9 €, offert dès 250 €.",
          "France, Chronopost express : 18 €.",
          "Retrait à l’atelier (Paris 11e), sur rendez-vous : offert.",
          "Union européenne, DHL Express : 25 €, offert dès 250 €.",
          "International, DHL Express : 45 €. Les droits et taxes d’importation restent à la charge du destinataire.",
        ],
      },
      {
        title: "Suivi de colis",
        paragraphs: [
          "Dès l’expédition, vous recevez un e-mail contenant le lien de suivi. Le suivi est aussi disponible dans votre compte et auprès de l’assistant du site, avec votre numéro de commande.",
        ],
      },
      {
        title: "Retours et échanges",
        paragraphs: [
          "Vous disposez de 14 jours à compter de la réception pour nous retourner une pièce, non portée, dans son état d’origine et accompagnée de son certificat. Pour cela, écrivez-nous depuis la page Contact ou votre compte en indiquant votre numéro de commande.",
          "Les frais de retour sont offerts en France. Le remboursement est effectué sur le moyen de paiement initial dans les 14 jours suivant la réception de la pièce à l’atelier.",
          "Les pièces réalisées sur mesure ou personnalisées ne sont ni reprises ni échangées, conformément à l’article L221-28 du Code de la consommation.",
        ],
      },
      {
        title: "Emballage cadeau",
        paragraphs: [
          "Pour 10 €, votre pièce est emballée dans une boîte ivoire fermée d’un ruban, accompagnée d’une carte sur laquelle nous recopions à la main le message de votre choix. Le prix n’apparaît pas sur le bon de livraison.",
        ],
      },
    ],
  },
  cgv: {
    slug: "cgv",
    title: "Conditions générales de vente",
    seo: {
      title: "Conditions générales de vente | Awrea Paris",
      description: "Conditions générales de vente du site Awrea Paris : commandes, prix, paiement, précommandes, livraison, droit de rétractation et garanties.",
    },
    updated: "2026-10-01",
    intro: `Les présentes conditions régissent les ventes conclues sur le site Awrea Paris par ${COMPANY} (ci-après « Awrea Paris »), avec toute personne physique agissant en qualité de consommatrice (ci-après « la cliente »).`,
    sections: [
      { title: "1. Produits", paragraphs: ["Les pièces proposées sont fabriquées à la main à Paris, en pièce unique ou en série limitée numérotée. Les photographies sont aussi fidèles que possible ; de légères variations, propres au travail fait main, peuvent exister et ne constituent pas un défaut."] },
      { title: "2. Prix", paragraphs: ["Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison. Les frais de livraison sont indiqués avant la validation de la commande. Awrea Paris se réserve le droit de modifier ses prix à tout moment ; le prix applicable est celui affiché au moment de la commande."] },
      { title: "3. Commande", paragraphs: ["La commande est passée sans création de compte obligatoire. Elle est définitive après le paiement ; un e-mail de confirmation récapitule son contenu. Awrea Paris peut refuser une commande en cas de litige antérieur ou d’anomalie de paiement."] },
      { title: "4. Précommande et fabrication sur commande", paragraphs: ["Certaines pièces sont proposées en précommande lorsqu’elles ne sont pas en stock. Le délai de fabrication est indiqué sur la fiche et rappelé dans la confirmation. En cas de retard supérieur à deux semaines, la cliente est prévenue et peut annuler sa commande avec remboursement intégral."] },
      { title: "5. Paiement", paragraphs: ["Le paiement s’effectue par carte bancaire, Apple Pay, Google Pay, PayPal ou en plusieurs fois via le prestataire proposé lors du paiement. Les paiements sont traités par Shopify Payments et ses partenaires ; Awrea Paris n’a jamais accès à vos données bancaires."] },
      { title: "6. Livraison", paragraphs: ["Les modalités, délais et tarifs de livraison sont détaillés sur la page Livraison & retours. Le transfert des risques intervient à la remise du colis à la cliente."] },
      { title: "7. Droit de rétractation", paragraphs: ["La cliente dispose d’un délai de 14 jours à compter de la réception pour exercer son droit de rétractation, sans avoir à justifier de motif. La pièce doit être retournée non portée, dans son état d’origine, avec son certificat. Ce droit ne s’applique pas aux pièces confectionnées selon les spécifications de la cliente ou nettement personnalisées (article L221-28 du Code de la consommation)."] },
      { title: "8. Garanties", paragraphs: ["Les pièces bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil)."] },
      { title: "9. Cartes cadeaux et codes de réduction", paragraphs: ["Les cartes cadeaux sont valables un an à compter de leur achat et utilisables en une ou plusieurs fois. Les codes de réduction ne sont pas cumulables, sauf mention contraire."] },
      { title: "10. Médiation et litiges", paragraphs: ["En cas de litige, la cliente peut recourir gratuitement au médiateur de la consommation [nom et coordonnées à compléter] ou à la plateforme européenne de règlement en ligne des litiges. Les présentes conditions sont soumises au droit français."] },
    ],
  },
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    seo: {
      title: "Mentions légales | Awrea Paris",
      description: "Mentions légales du site Awrea Paris : éditeur, directrice de la publication, hébergeur et propriété intellectuelle.",
    },
    updated: "2026-10-01",
    intro: "Informations légales relatives au site Awrea Paris.",
    sections: [
      { title: "Éditeur", paragraphs: [`Le site est édité par ${COMPANY}. Contact : contact@awreaparis.com.`] },
      { title: "Directrice de la publication", paragraphs: ["La Créatrice, fondatrice d’Awrea Paris [nom à compléter]."] },
      { title: "Hébergement", paragraphs: ["Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Boutique et paiement : Shopify International Ltd., Victoria Buildings, 1-2 Haddington Road, Dublin 4, Irlande."] },
      { title: "Propriété intellectuelle", paragraphs: ["L’ensemble des contenus du site — créations, photographies, vidéos, textes, logo, monogramme — est la propriété exclusive d’Awrea Paris ou de ses partenaires. Toute reproduction sans autorisation écrite est interdite."] },
    ],
  },
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    seo: {
      title: "Politique de confidentialité | Awrea Paris",
      description: "Comment Awrea Paris collecte, utilise et protège vos données personnelles, et comment exercer vos droits (RGPD).",
    },
    updated: "2026-10-01",
    intro: "Awrea Paris attache la plus grande importance à la protection de vos données. Cette politique explique quelles données nous collectons, pourquoi, et comment exercer vos droits.",
    sections: [
      { title: "Responsable du traitement", paragraphs: [`${COMPANY}. Contact : contact@awreaparis.com.`] },
      {
        title: "Données collectées et finalités",
        list: [
          "Commande : nom, adresses, e-mail, téléphone, contenu de la commande — exécution du contrat.",
          "Liste d’attente et lettres de l’atelier : e-mail — consentement.",
          "Contact et rendez-vous : nom, e-mail, message — intérêt légitime à vous répondre.",
          "Assistant du site : contenu de la conversation, conservé 30 jours pour améliorer les réponses — intérêt légitime.",
          "Mesure d’audience : uniquement après votre consentement.",
        ],
      },
      { title: "Destinataires", paragraphs: ["Vos données sont traitées par Awrea Paris et ses sous-traitants : Shopify (boutique et paiement), Vercel (hébergement), Anthropic (assistant conversationnel, sans conservation à des fins d’entraînement), le prestataire d’envoi d’e-mails et les transporteurs. Certains sont situés hors de l’Union européenne et encadrés par des clauses contractuelles types."] },
      { title: "Durées de conservation", paragraphs: ["Données de commande : 10 ans (obligations comptables). Liste d’attente et lettres : jusqu’à votre désinscription. Messages : 3 ans après le dernier échange."] },
      { title: "Vos droits", paragraphs: ["Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition, ainsi que du droit de retirer votre consentement à tout moment. Écrivez à contact@awreaparis.com. Vous pouvez également introduire une réclamation auprès de la CNIL."] },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookies",
    seo: {
      title: "Politique cookies | Awrea Paris",
      description: "Les cookies utilisés sur le site Awrea Paris et comment gérer votre consentement.",
    },
    updated: "2026-10-01",
    intro: "Un cookie est un petit fichier déposé sur votre appareil. Nous n’utilisons que ceux qui sont nécessaires, et les autres uniquement avec votre accord.",
    sections: [
      {
        title: "Cookies nécessaires",
        paragraphs: ["Ils permettent le fonctionnement du site et ne requièrent pas votre consentement :"],
        list: ["awrea_cart — votre panier (30 jours).", "awrea_consent — vos choix en matière de cookies (6 mois).", "awrea_session — votre connexion à votre compte (30 jours)."],
      },
      {
        title: "Mesure d’audience",
        paragraphs: ["Avec votre accord seulement, nous mesurons la fréquentation des pages de manière agrégée pour améliorer le site. Aucun cookie publicitaire n’est utilisé."],
      },
      {
        title: "Contenus tiers",
        paragraphs: ["Le flux Instagram n’est chargé depuis Instagram qu’avec votre accord ; à défaut, des images hébergées par nos soins sont affichées."],
      },
      {
        title: "Modifier vos choix",
        paragraphs: ["Vous pouvez modifier vos choix à tout moment avec le lien « Gérer les cookies » en bas de chaque page."],
      },
    ],
  },
};

export const press = {
  articles: [
    { outlet: "Revue de mode (exemple)", title: "Awrea Paris, la dentelle sans le luxe ostentatoire", date: "2026-09", quote: "Une jeune créatrice qui coud ses pièces à la main et les numérote : la preuve qu’une autre mode est possible.", url: "" },
    { outlet: "Magazine culture (exemple)", title: "Cinq créatrices parisiennes à suivre", date: "2026-06", quote: "Ses drapés à la grecque et ses fils d’or ont quelque chose d’intemporel.", url: "" },
    { outlet: "Blog mode responsable (exemple)", title: "Consommer plus juste : rencontre avec Awrea Paris", date: "2026-03", quote: "Des séries de cinq pièces, un prix juste, un atelier ouvert : un manifeste en acte.", url: "" },
  ],
  contact: {
    title: "Contact presse",
    text: "Pour toute demande de prêt de pièces, de visuels haute définition ou d’entretien avec la créatrice, écrivez à l’atelier en précisant le support et la date de parution.",
    email: "presse@awreaparis.com",
  },
  kit: {
    title: "Kit presse",
    text: "Logo, portraits, visuels de la collection en cours et biographie de la maison sont disponibles sur demande.",
  },
};
