/**
 * Pages légales et pratiques.
 *
 * Conventions d'écriture (interprétées par components/legal/LegalText.tsx) :
 *  - {{cle}}            information de l'entreprise (content/legal/fields.ts) : affichée telle quelle
 *                       si elle est renseignée, sinon repère doré « [À COMPLÉTER : …] » bien visible ;
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

export type LegalBlock =
  | string
  | { list: string[] }
  | { table: { caption: string; head: string[]; rows: string[][] } }
  | { box: { title?: string; paragraphs: string[] } }
  | { widget: "cookie-table" | "cookie-settings" | "withdrawal-form" | "withdrawal-model" };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalPage {
  slug: string;
  title: string;
  seo: { title: string; description: string };
  updated: string;
  version?: string;
  intro: string;
  sections: LegalSection[];
}

const UPDATED = "2026-10-13";
const COMPANY =
  "{{raisonSociale}}, {{formeJuridique}} au capital de {{capital}}, immatriculée sous le numéro {{immatriculation}} (SIRET {{siret}}), dont le siège est situé {{siege}}";
const free = formatPrice(shop.freeShippingThreshold);

export const legalPages = {
  // ================================================================ LIVRAISON & RETOURS
  "livraison-retours": {
    slug: "livraison-retours",
    title: "Livraison et retours",
    seo: {
      title: "Livraison et retours | Awrea Paris",
      description: `Livraison offerte en France dès ${free}, expédition internationale suivie, retours sous ${shop.returnDays} jours. Toutes les conditions de livraison et de retour d’Awrea Paris.`,
    },
    updated: UPDATED,
    intro: "Chaque pièce quitte l’atelier pliée dans du papier de soie, glissée dans sa housse en coton et accompagnée de son certificat numéroté.",
    sections: [
      {
        id: "delais",
        title: "Délais d’expédition",
        blocks: [
          `Les pièces disponibles sont expédiées sous ${shop.dispatchDays} après la commande. Les pièces en précommande sont expédiées à l’issue du délai de fabrication indiqué sur leur fiche et rappelé dans l’e-mail de confirmation.`,
          "Lorsqu’une commande réunit des pièces disponibles et des précommandes, nous l’expédions en une seule fois, sauf si vous nous demandez un envoi séparé.",
        ],
      },
      {
        id: "tarifs",
        title: "Tarifs et destinations",
        blocks: [
          {
            table: {
              caption: "Modes de livraison",
              head: ["Destination et mode", "Tarif", "Délai après expédition"],
              rows: shop.shippingRates.map((r) => [r.label, r.price === 0 ? "Offert" : `${formatPrice(r.price)}${r.freeAboveThreshold ? ` (offert dès ${free})` : ""}`, r.delay]),
            },
          },
          "Pour une livraison hors de l’Union européenne, les droits de douane et taxes d’importation sont, selon la destination, calculés et réglés au moment de la commande (ils apparaissent alors avant le paiement) ou dus par la destinataire à la réception.",
        ],
      },
      {
        id: "suivi",
        title: "Suivi de colis",
        blocks: ["Dès l’expédition, vous recevez un e-mail contenant le lien de suivi. Le suivi est aussi disponible dans [votre compte](/compte) et auprès de l’assistante du site, avec votre numéro de commande et votre adresse e-mail."],
      },
      {
        id: "retours",
        title: "Retours et échanges",
        blocks: [
          `Vous disposez de ${shop.returnDays} jours à compter de la réception pour nous retourner une pièce non portée, dans son état d’origine et accompagnée de son certificat. Le plus simple : [la fonction de rétractation en ligne](/retractation), ou la rubrique « Commandes » de votre compte.`,
          "Les frais de retour sont offerts en France : nous vous envoyons une étiquette prépayée. Depuis l’étranger, le retour est à votre charge. Le remboursement est effectué sur le moyen de paiement initial, au plus tard quatorze jours après votre demande (il peut être différé jusqu’à la réception de la pièce à l’atelier).",
          "Les pièces réalisées sur mesure ou personnalisées selon vos indications ne sont ni reprises ni échangées (article L221-28 du Code de la consommation). Le détail figure dans nos [conditions générales de vente](/cgv#retractation).",
        ],
      },
      {
        id: "cadeau",
        title: "Emballage cadeau",
        blocks: [
          `Pour ${formatPrice(shop.giftWrapPrice)}, votre pièce est emballée dans une boîte ivoire fermée d’un ruban, accompagnée d’une carte sur laquelle nous recopions à la main le message de votre choix. Le prix n’apparaît pas sur le bon de livraison.`,
        ],
      },
    ],
  },

  // ================================================================ MENTIONS LÉGALES
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    seo: {
      title: "Mentions légales | Awrea Paris",
      description: "Mentions légales du site Awrea Paris : éditrice, directrice de la publication, hébergeur, propriété intellectuelle et médiation.",
    },
    updated: UPDATED,
    intro: "Informations légales relatives au site Awrea Paris, conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique.",
    sections: [
      {
        id: "editeur",
        title: "Éditeur du site",
        blocks: [`Le site est édité par ${COMPANY}.`, { list: ["Numéro de TVA intracommunautaire : {{tva}}", "Adresse e-mail : {{email}}", "Téléphone : {{telephone}}"] }],
      },
      { id: "publication", title: "Directrice de la publication", blocks: ["{{directricePublication}}"] },
      {
        id: "hebergement",
        title: "Hébergement",
        blocks: [
          "Le site est hébergé par **Vercel Inc.**, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — vercel.com — téléphone : {{hebergeurTelephone}}.",
          "La boutique, les commandes et les paiements s’appuient sur **Shopify International Limited**, Victoria Buildings, 2e étage, 1-2 Haddington Road, Dublin 4, D04 XN32, Irlande — shopify.com.",
          "La base clientes est hébergée par **Supabase, Inc.** (supabase.com), dans la région {{regionBase}}.",
        ],
      },
      {
        id: "propriete",
        title: "Propriété intellectuelle",
        blocks: ["Les créations, photographies, vidéos, textes, logo et monogramme du site sont protégés. Leur reproduction est interdite sans autorisation écrite : voir la page [Propriété intellectuelle et droits réservés](/propriete-intellectuelle)."],
      },
      { id: "credits", title: "Crédits", blocks: ["Photographies, vidéos et mannequins : {{creditsPhotos}}", "Conception et réalisation du site : Awrea Paris."] },
      {
        id: "mediation",
        title: "Médiation de la consommation",
        blocks: ["En cas de litige, vous pouvez recourir gratuitement au médiateur de la consommation : {{mediateur}}. Les conditions figurent à l’article 13 de nos [conditions générales de vente](/cgv#mediation)."],
      },
      {
        id: "signalement",
        title: "Signaler un contenu",
        blocks: ["Pour signaler un contenu illicite ou une atteinte à vos droits, écrivez à {{email}} en précisant l’adresse de la page concernée et la nature du contenu."],
      },
    ],
  },

  // ================================================================ PROPRIÉTÉ INTELLECTUELLE
  "propriete-intellectuelle": {
    slug: "propriete-intellectuelle",
    title: "Propriété intellectuelle et droits réservés",
    seo: {
      title: "Propriété intellectuelle et droits réservés | Awrea Paris",
      description: "Créations, marque, photographies et droit à l’image : ce qui est protégé sur le site Awrea Paris, ce qui est permis et comment signaler une contrefaçon.",
    },
    updated: UPDATED,
    intro: "Chaque pièce Awrea Paris est une création originale, dessinée et façonnée à la main. Les images qui la montrent sont le fruit du travail de photographes, de vidéastes et de mannequins dont les droits sont protégés.",
    sections: [
      {
        id: "creations",
        title: "Les créations",
        blocks: [
          "Les modèles, patronages, broderies, associations de matières et dessins des pièces Awrea Paris sont des créations originales de {{raisonSociale}}, protégées par le droit d’auteur (livre I du Code de la propriété intellectuelle) et, le cas échéant, par le droit des dessins et modèles (livre V).",
          "Toute reproduction, imitation ou commercialisation d’une copie, totale ou partielle, constitue une contrefaçon sanctionnée notamment par les articles L335-2 et L521-1 du Code de la propriété intellectuelle.",
        ],
      },
      {
        id: "marque",
        title: "La marque, le logo et le monogramme",
        blocks: [
          "Le nom « Awrea Paris », le logo et le monogramme « AW » sont des signes distinctifs de la maison. Enregistrement de la marque : {{marque}}.",
          "Leur utilisation, seule ou associée à d’autres signes, est interdite sans autorisation écrite préalable.",
        ],
      },
      {
        id: "images",
        title: "Photographies, vidéos et textes",
        blocks: [
          "Les photographies et vidéos du site sont utilisées en vertu de contrats de cession de droits conclus avec leurs autrices et auteurs. Crédits : {{creditsPhotos}}.",
          "Les textes, la mise en page, les animations et le code du site sont également protégés. Leur reproduction, même partielle, est interdite sans autorisation.",
        ],
      },
      {
        id: "image-mannequins",
        title: "Droit à l’image des mannequins",
        blocks: [
          "Les personnes photographiées ont autorisé l’utilisation de leur image pour une durée, des supports et des usages définis. Toute reprise de ces images en dehors du site et des comptes officiels de la maison porte atteinte à leur droit à l’image (article 9 du Code civil) et est interdite.",
        ],
      },
      {
        id: "permis",
        title: "Ce qui est permis",
        blocks: [
          {
            list: [
              "Partager l’adresse d’une page du site, ou une publication des comptes officiels avec les outils de partage des réseaux sociaux.",
              "Citer un court extrait de texte en mentionnant la source « Awrea Paris » et un lien vers la page.",
              "Pour la presse : télécharger le kit presse et les visuels haute définition depuis l’[espace presse](/presse) ; chaque utilisation mentionne les crédits indiqués.",
            ],
          },
        ],
      },
      {
        id: "contenus-clientes",
        title: "Vos avis et vos photos",
        blocks: [
          "En publiant un avis ou une photo, vous autorisez la maison à les afficher, gratuitement et sans exclusivité, sur la fiche de la pièce concernée, pour la durée de leur publication. Toute autre utilisation (réseaux sociaux, lettres, publicité) ne se fait qu’avec votre accord exprès et distinct. Vous pouvez demander le retrait de votre avis ou de votre photo à tout moment.",
          "Vous garantissez détenir les droits sur la photo publiée et l’accord des personnes qui y figurent.",
        ],
      },
      {
        id: "contrefacon",
        title: "Signaler une copie",
        blocks: ["Si vous pensez avoir repéré une copie d’une pièce Awrea Paris, ou une utilisation non autorisée de nos images, écrivez-nous à {{email}} avec un lien ou une photo : nous vous remercions de votre vigilance."],
      },
    ],
  },

  // ================================================================ CGV
  cgv: {
    slug: "cgv",
    title: "Conditions générales de vente",
    seo: {
      title: "Conditions générales de vente | Awrea Paris",
      description: "Conditions générales de vente d’Awrea Paris : pièces rares et précommandes, prix TTC en euros, paiement, livraison, rétractation de 14 jours, garanties légales et médiation.",
    },
    updated: UPDATED,
    version: legalVersions.cgv,
    intro: `Les présentes conditions régissent les ventes conclues sur le site Awrea Paris entre ${COMPANY} (ci-après « Awrea Paris » ou « la maison ») et toute personne physique agissant à des fins non professionnelles (ci-après « la cliente »).`,
    sections: [
      {
        id: "objet",
        title: "1. Objet et acceptation",
        blocks: [
          "Ces conditions s’appliquent à toute commande passée sur le site. Elles sont acceptées par la cliente au moment de la commande, au moyen d’une case à cocher ; la version acceptée (indiquée en haut de cette page) est conservée avec la commande.",
          "Elles peuvent être modifiées à tout moment ; la version applicable est celle en vigueur à la date de la commande.",
        ],
      },
      {
        id: "pieces",
        title: "2. Les pièces : rareté et fait main",
        blocks: [
          "Les pièces sont façonnées à la main à Paris, en **pièce unique** ou en **série limitée numérotée**. Le numéro d’édition (par exemple « N° 3 / 5 ») et le nombre de pièces restantes sont indiqués sur chaque fiche ; une fois la série épuisée, une pièce peut, selon les cas, être proposée en précommande ou ne jamais être refaite.",
          "Les photographies et descriptions sont aussi fidèles que possible. De légères variations de teinte, de motif de dentelle ou de finition, propres au travail fait main, peuvent exister et ne constituent pas un défaut de conformité.",
          "Le guide des tailles et l’outil « Trouver ma taille » sont des aides au choix ; l’atelier peut vous conseiller avant l’achat et proposer un essayage sur rendez-vous.",
        ],
      },
      {
        id: "prix",
        title: "3. Prix",
        blocks: [
          "Les prix sont indiqués en euros, toutes taxes comprises (TTC), hors frais de livraison. Les frais de livraison et, le cas échéant, d’emballage cadeau sont indiqués avant la validation de la commande.",
          "Les prix affichés dans une autre devise (livre sterling, dollar américain, franc suisse) sont convertis au taux appliqué par notre plateforme de paiement ; le montant dû est celui affiché au moment du paiement.",
          "Pour une livraison hors de l’Union européenne, les droits de douane et taxes d’importation sont, selon la destination, calculés et réglés au moment de la commande (ils apparaissent alors avant le paiement) ou dus par la cliente à la réception.",
          "La maison peut modifier ses prix à tout moment ; le prix applicable est celui affiché au moment de la commande.",
        ],
      },
      {
        id: "commande",
        title: "4. Commande",
        blocks: [
          "La cliente choisit sa pièce et sa taille, vérifie son panier (codes, carte cadeau, emballage), indique ses coordonnées et son mode de livraison, accepte les présentes conditions puis valide sa commande avec obligation de paiement. Aucun compte n’est nécessaire.",
          "Un e-mail de confirmation récapitule la commande : le contrat est conclu à sa réception. Pour toute commande d’un montant égal ou supérieur à 120 €, la maison conserve l’écrit qui la constate pendant dix ans et en garantit l’accès à la cliente sur simple demande (article L213-1 du Code de la consommation).",
          "La maison peut refuser une commande anormale ou passée de mauvaise foi, notamment en cas de litige de paiement antérieur.",
        ],
      },
      {
        id: "rarete",
        title: "5. Pièces rares, précommandes et fabrication",
        blocks: [
          "Les stocks sont tenus à jour par taille. Lorsqu’une même pièce unique est commandée au même instant par deux clientes, la commande dont le paiement est validé en premier est servie ; l’autre cliente est prévenue et intégralement remboursée sans délai.",
          "Une pièce en **précommande** est fabriquée pour la cliente après sa commande. Le délai de fabrication est indiqué sur la fiche et dans l’e-mail de confirmation, et la date d’expédition estimée est rappelée dans le compte.",
          "Si ce délai devait être dépassé de plus de deux semaines, la cliente en est informée et peut annuler sa commande avec un remboursement intégral. Elle conserve en tout état de cause le droit de résoudre le contrat dans les conditions de l’article L216-6 du Code de la consommation.",
        ],
      },
      {
        id: "paiement",
        title: "6. Paiement",
        blocks: [
          `Le paiement s’effectue par ${shop.paymentMethods.join(", ").toLowerCase()}. Les paiements par carte, Apple Pay et Google Pay sont traités par Shopify Payments (opéré par Stripe), les paiements PayPal par PayPal, le paiement en plusieurs fois par {{paiementFractionne}}, sous réserve d’acceptation par ce prestataire.`,
          "Les paiements sont sécurisés (chiffrement, authentification forte 3-D Secure). La maison n’a jamais accès aux données bancaires de la cliente.",
          "Le montant est débité au moment de la commande, y compris pour une précommande.",
          "Les cartes cadeaux sont valables un an à compter de leur achat et utilisables en une ou plusieurs fois ; elles ne sont pas remboursables en espèces. Les codes de réduction ne sont pas cumulables, sauf mention contraire.",
        ],
      },
      {
        id: "livraison",
        title: "7. Livraison et transfert des risques",
        blocks: [
          "Les zones, tarifs et délais de livraison sont détaillés sur la page [Livraison et retours](/livraison-retours) et rappelés avant le paiement. À défaut de date indiquée, la livraison intervient au plus tard trente jours après la commande (article L216-1 du Code de la consommation).",
          "Le risque de perte ou d’endommagement de la pièce est transféré à la cliente au moment où elle, ou une personne qu’elle a désignée, en prend physiquement possession (article L216-4 du Code de la consommation).",
          "En cas de colis endommagé ou incomplet, nous vous invitons à émettre des réserves auprès du transporteur et à nous écrire rapidement, photographies à l’appui : l’atelier s’occupe de la suite.",
        ],
      },
      {
        id: "retractation",
        title: "8. Droit de rétractation",
        blocks: [
          "La cliente dispose d’un délai de **quatorze jours** à compter de la réception de la pièce (ou de la dernière pièce, en cas de livraison en plusieurs fois) pour se rétracter, sans avoir à justifier de motif ni à supporter d’autres coûts que ceux prévus ci-dessous.",
          "Pour exercer ce droit, la cliente informe la maison de sa décision avant l’expiration du délai : par la [fonction de rétractation en ligne](/retractation) (« Se rétracter du contrat ici »), par e-mail à {{email}}, par courrier à l’adresse du siège, ou au moyen du formulaire type figurant en annexe. Un accusé de réception lui est adressé sans délai sur un support durable.",
          "La pièce est renvoyée au plus tard quatorze jours après la communication de la décision, non portée, dans son état d’origine, avec ses étiquettes et son certificat. Les frais de retour sont pris en charge par la maison pour un retour depuis la France (étiquette prépayée) ; depuis l’étranger, ils restent à la charge de la cliente. La responsabilité de la cliente peut être engagée en cas de dépréciation résultant d’une manipulation autre que celle nécessaire pour établir la nature et les caractéristiques de la pièce (article L221-23).",
          "La maison rembourse la totalité des sommes versées, y compris les frais de livraison initiaux (sur la base du mode standard), au plus tard quatorze jours à compter du jour où elle est informée de la décision ; ce remboursement peut être différé jusqu’à la récupération de la pièce ou la preuve de son expédition. Il est effectué avec le moyen de paiement utilisé pour la commande.",
          "**Exception** : conformément à l’article L221-28, 3° du Code de la consommation, le droit de rétractation ne s’applique pas aux pièces confectionnées selon les spécifications de la cliente ou nettement personnalisées (sur mesure, retouches demandées, broderie personnalisée). Les pièces uniques ou de série proposées telles quelles sur le site restent couvertes par le droit de rétractation.",
        ],
      },
      {
        id: "retours",
        title: "9. Retours, échanges et remboursements",
        blocks: [
          "Un échange de taille est possible dans la limite des pièces disponibles : il suit la même procédure qu’un retour. Lorsque la taille souhaitée n’existe plus, la pièce est remboursée.",
          "Les demandes se font depuis la rubrique « Commandes » du compte, la [fonction de rétractation en ligne](/retractation) ou le [formulaire de contact](/contact).",
        ],
      },
      {
        id: "garanties",
        title: "10. Garanties légales",
        blocks: [
          "Indépendamment du droit de rétractation, toutes les pièces bénéficient de la garantie légale de conformité et de la garantie des vices cachés, dans les conditions reproduites ci-dessous.",
          {
            box: {
              title: "Garantie légale de conformité et garantie des vices cachés",
              paragraphs: [
                "Le consommateur dispose d’un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en œuvre de la garantie légale de conformité en cas d’apparition d’un défaut de conformité. Durant ce délai, le consommateur n’est tenu d’établir que l’existence du défaut de conformité et non la date d’apparition de celui-ci.",
                "La garantie légale de conformité donne au consommateur droit à la réparation ou au remplacement du bien dans un délai de trente jours suivant sa demande, sans frais et sans inconvénient majeur pour lui.",
                "Si le bien est réparé dans le cadre de la garantie légale de conformité, le consommateur bénéficie d’une extension de six mois de la garantie initiale. Si le consommateur demande la réparation du bien, mais que le vendeur impose le remplacement, la garantie légale de conformité est renouvelée pour une période de deux ans à compter de la date de remplacement du bien.",
                "Le consommateur peut obtenir une réduction du prix d’achat en conservant le bien ou mettre fin au contrat en se faisant rembourser intégralement contre restitution du bien, si : 1° le professionnel refuse de réparer ou de remplacer le bien ; 2° la réparation ou le remplacement du bien intervient après un délai de trente jours ; 3° la réparation ou le remplacement du bien occasionne un inconvénient majeur pour le consommateur, notamment lorsque le consommateur supporte définitivement les frais de reprise ou d’enlèvement du bien non conforme, ou s’il supporte les frais d’installation du bien réparé ou de remplacement ; 4° la non-conformité du bien persiste en dépit de la tentative de mise en conformité du vendeur restée infructueuse.",
                "Le consommateur a également droit à une réduction du prix du bien ou à la résolution du contrat lorsque le défaut de conformité est si grave qu’il justifie que la réduction du prix ou la résolution du contrat soit immédiate. Le consommateur n’est alors pas tenu de demander la réparation ou le remplacement du bien au préalable. Le consommateur n’a pas droit à la résolution de la vente si le défaut de conformité est mineur.",
                "Toute période d’immobilisation du bien en vue de sa réparation ou de son remplacement suspend la garantie qui restait à courir jusqu’à la délivrance du bien remis en état.",
                "Les droits mentionnés ci-dessus résultent de l’application des articles L. 217-1 à L. 217-32 du code de la consommation.",
                "Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt une amende civile d’un montant maximal de 300 000 euros, qui peut être porté jusqu’à 10 % du chiffre d’affaires moyen annuel (article L. 242-18-1 du code de la consommation).",
                "Le consommateur bénéficie également de la garantie légale des vices cachés en application des articles 1641 à 1649 du code civil, pour une durée de deux ans à compter de la découverte du défaut. Cette garantie donne droit à une réduction de prix si le bien est conservé ou à un remboursement intégral contre restitution du bien.",
              ],
            },
          },
        ],
      },
      {
        id: "service",
        title: "11. Service client",
        blocks: [
          { list: ["Par e-mail : {{email}}", "Par téléphone : {{telephone}} — {{horaires}}", "Par le [formulaire de contact](/contact) ou depuis votre [compte](/compte)", "Par l’assistante du site, qui peut à tout moment transmettre votre demande à l’atelier"] },
          "Toute réclamation peut être adressée par ces moyens ; la maison y répond dans les meilleurs délais.",
        ],
      },
      { id: "donnees", title: "12. Données personnelles", blocks: ["Les données nécessaires à la commande sont traitées conformément à notre [politique de confidentialité](/confidentialite)."] },
      {
        id: "mediation",
        title: "13. Médiation",
        blocks: [
          "Après une réclamation écrite restée sans réponse satisfaisante, la cliente peut recourir gratuitement au médiateur de la consommation dont relève la maison, dans un délai d’un an à compter de sa réclamation (articles L612-1 et suivants du Code de la consommation) : {{mediateur}}.",
        ],
      },
      {
        id: "droit",
        title: "14. Droit applicable et juridictions",
        blocks: [
          "Les présentes conditions sont soumises au droit français, sans préjudice des dispositions protectrices de la loi du pays de résidence habituelle de la cliente lorsqu’elle réside dans un autre État de l’Union européenne.",
          "À défaut de résolution amiable, le litige est porté devant la juridiction compétente selon les règles de droit commun ; la cliente peut notamment saisir la juridiction du lieu où elle demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable.",
        ],
      },
      {
        id: "annexe",
        title: "Annexe — Formulaire type de rétractation",
        blocks: [
          "Ce formulaire (annexe à l’article R221-1 du Code de la consommation) n’est à compléter et à renvoyer que si vous souhaitez vous rétracter. Vous pouvez aussi utiliser la [fonction de rétractation en ligne](/retractation).",
          { widget: "withdrawal-model" },
        ],
      },
    ],
  },

  // ================================================================ CGU
  cgu: {
    slug: "cgu",
    title: "Conditions générales d’utilisation",
    seo: {
      title: "Conditions générales d’utilisation | Awrea Paris",
      description: "Conditions d’utilisation du site et du compte cliente Awrea Paris : création du compte, avis, liste d’envies partagée, assistante IA, Cercle Awrea, ventes privées.",
    },
    updated: UPDATED,
    version: legalVersions.cgu,
    intro: "Ces conditions encadrent l’utilisation du site Awrea Paris et du compte cliente. Elles sont acceptées à la création du compte, au moyen d’une case à cocher.",
    sections: [
      { id: "objet", title: "1. Objet", blocks: [`Elles s’appliquent à toute visiteuse du site et à toute titulaire d’un compte. Les achats sont régis par les [conditions générales de vente](/cgv). L’éditeur du site est ${COMPANY} (voir les [mentions légales](/mentions-legales)).`] },
      { id: "acces", title: "2. Accès au site", blocks: ["Le site est accessible gratuitement, sans compte. La maison s’efforce de le rendre disponible en permanence mais peut l’interrompre pour maintenance ou mise à jour ; une page d’attente l’indique alors."] },
      {
        id: "compte",
        title: "3. Le compte cliente",
        blocks: [
          "Le compte se crée et s’ouvre sans mot de passe : par un code à usage unique envoyé par e-mail, ou avec un compte Google ou Apple. La création suppose l’acceptation des présentes conditions.",
          "Il est réservé aux personnes âgées d’au moins quinze ans. Les achats d’une personne mineure se font sous la responsabilité de ses représentants légaux.",
          "La titulaire fournit des informations exactes et veille à la sécurité de sa boîte e-mail et de son compte Google ou Apple, qui donnent accès au compte. Elle prévient la maison de toute utilisation qu’elle n’aurait pas autorisée.",
          "Le compte permet de retrouver ses commandes et certificats d’authenticité, d’enregistrer ses tailles et mesures, ses adresses, sa liste d’envies et ses alertes de retour en stock, de régler ses préférences, de télécharger ou de supprimer ses données.",
        ],
      },
      {
        id: "fermeture",
        title: "4. Fermeture du compte",
        blocks: [
          "La titulaire peut supprimer son compte à tout moment, depuis la rubrique « Mes données ». La maison peut suspendre ou fermer un compte en cas d’utilisation frauduleuse ou de manquement grave aux présentes conditions, après en avoir informé la titulaire, sauf urgence. Un compte resté inactif pendant trois ans est supprimé après un message de prévenance.",
        ],
      },
      {
        id: "avis",
        title: "5. Avis et photos des clientes",
        blocks: [
          "Seules les clientes ayant acheté une pièce peuvent publier un avis à son sujet ; l’avis est signalé comme « vérifié ». Il est publié avec le prénom et l’initiale du nom, sans note chiffrée.",
          "Chaque avis est relu avant publication. Il peut être refusé s’il est sans rapport avec la pièce, injurieux, discriminatoire, s’il contient des données personnelles d’un tiers, de la publicité ou s’il porte atteinte aux droits d’autrui. Les avis ne sont ni achetés ni rémunérés, et les avis négatifs ne sont pas écartés pour ce seul motif.",
          "Les droits concédés sur les avis et photos sont précisés dans la page [Propriété intellectuelle](/propriete-intellectuelle#contenus-clientes).",
        ],
      },
      { id: "envies", title: "6. Liste d’envies partagée", blocks: ["La titulaire peut créer un lien secret vers sa liste d’envies. Toute personne disposant du lien voit les pièces et le prénom de la titulaire. Le lien peut être désactivé à tout moment depuis le compte."] },
      {
        id: "ia",
        title: "7. Assistante et styliste IA",
        blocks: [
          "Le site propose une assistante et une styliste fondées sur l’intelligence artificielle. Leurs réponses sont informatives : en cas de différence, les informations des fiches produits, des conditions de vente et de l’atelier font foi. Leur fonctionnement est expliqué dans la [notice de l’assistante IA](/assistant-ia).",
        ],
      },
      {
        id: "cercle",
        title: "8. Le Cercle Awrea, accès anticipés et ventes privées",
        blocks: [
          "Le Cercle Awrea est un club gratuit, sans obligation d’achat : accès anticipé aux nouvelles pièces, invitations à l’atelier, aperçus des croquis. Toute titulaire d’un compte peut le rejoindre ou le quitter depuis son compte. Le statut VIP est attribué automatiquement selon le montant et le nombre des commandes.",
          "Les accès anticipés et ventes privées peuvent être protégés par un mot de passe ou réservés aux inscrites. Ces accès sont personnels : leur diffusion publique peut entraîner la fermeture de la vente privée concernée.",
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
        blocks: ["La maison met en œuvre des moyens raisonnables pour assurer l’exactitude des informations et la sécurité du site. Sa responsabilité ne saurait être engagée pour une indisponibilité temporaire ou pour le contenu de sites tiers vers lesquels le site renvoie."],
      },
      { id: "donnees", title: "12. Données personnelles et cookies", blocks: ["Voir la [politique de confidentialité](/confidentialite) et la [politique cookies](/cookies)."] },
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
        blocks: [`Le responsable du traitement est ${COMPANY}. Pour toute question relative à vos données : {{email}}. La maison n’a pas désigné de délégué à la protection des données (cette désignation n’est pas obligatoire pour elle).`],
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
                ["Commandes, livraison, service après-vente", "Identité, coordonnées, adresses, contenu de la commande, échanges", "Exécution du contrat ; obligations comptables", "10 ans pour les pièces comptables, puis suppression"],
                ["Paiement", "Données de paiement traitées directement par le prestataire (jamais par la maison)", "Exécution du contrat", "Selon la politique du prestataire"],
                ["Compte cliente", "E-mail, nom, téléphone, anniversaire (facultatif), tailles et mesures (facultatives), adresses, préférences", "Exécution des conditions d’utilisation", "Jusqu’à la suppression du compte ; 3 ans d’inactivité au plus"],
                ["Liste d’envies, alertes de retour en stock", "E-mail, pièces et tailles choisies", "Consentement (alerte) ; conditions d’utilisation (compte)", "Jusqu’à l’envoi de l’alerte ou votre retrait, 2 ans au plus"],
                ["Lettres de l’atelier et e-mails personnalisés (bienvenue, anniversaire, panier en attente, nouvelles)", "E-mail, prénom, segment de clientèle, ouvertures", "Consentement", "Jusqu’au retrait du consentement ; 3 ans sans interaction au plus"],
                ["E-mails après achat (conseils d’entretien, demande d’avis)", "E-mail, pièces achetées", "Intérêt légitime (suivi de la relation), opposable à tout moment", "Durée de la relation commerciale"],
                ["Avis vérifiés", "Prénom et initiale, texte, taille, photo facultative", "Consentement", "Durée de publication ; retrait sur demande"],
                ["Personnalisation (pièces vues, collections préférées, panier en attente)", "Identifiants de pièces, dates", "Consentement (catégorie « personnalisation »)", "13 mois"],
                ["Mesure d’audience", "Données de navigation agrégées", "Consentement (catégorie « mesure d’audience »)", "13 mois pour les traceurs, 25 mois pour les statistiques"],
                ["Publicité (Instagram, Facebook, Google)", "Identifiants publicitaires, évènements (visite, ajout au panier, achat)", "Consentement (catégorie « publicité »)", "13 mois pour les traceurs"],
                ["Assistante et styliste IA", "Messages échangés, photo d’inspiration le cas échéant", "Intérêt légitime (vous répondre) ; consentement (photo)", "Conversation conservée 30 jours ; photo analysée puis supprimée, jamais conservée"],
                ["Contact, rendez-vous, sur-mesure", "Nom, e-mail, message, créneau, mesures communiquées", "Mesures précontractuelles ; intérêt légitime", "{{delaiConservationDevis}}"],
                ["Certificats d’authenticité", "Numéro de série, pièce, commande, rattachement au compte", "Exécution du contrat", "Durée de vie du compte ; le certificat reste consultable sans donnée personnelle"],
                ["Notifications (application installée)", "Abonnement technique du navigateur, thèmes choisis", "Consentement", "Jusqu’au désabonnement"],
                ["Sécurité, prévention de la fraude et des robots", "Adresse IP, journaux techniques et d’erreurs", "Intérêt légitime (sécurité du site)", "Quelques minutes (limitation de débit) ; 90 jours (journaux d’erreurs)"],
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
          "Vos données sont destinées à la maison et, pour ce qui les concerne, à ses sous-traitants, liés par contrat et tenus à la confidentialité :",
          {
            table: {
              caption: "Sous-traitants et partenaires",
              head: ["Prestataire", "Rôle", "Localisation des données"],
              rows: [
                ["Shopify International Limited", "Boutique, commandes, paiements", "Union européenne, avec transferts vers le Canada et les États-Unis"],
                ["Stripe (Shopify Payments)", "Paiement par carte, Apple Pay, Google Pay", "Union européenne et États-Unis"],
                ["PayPal (Europe) S.à r.l. et Cie, S.C.A.", "Paiement PayPal (responsable de traitement distinct)", "Union européenne (Luxembourg)"],
                ["{{paiementFractionne}}", "Paiement en plusieurs fois (responsable de traitement distinct)", "Selon le prestataire"],
                ["Supabase, Inc.", "Base clientes et connexion au compte", "{{regionBase}}"],
                ["Vercel Inc.", "Hébergement du site", "États-Unis et réseau mondial"],
                ["Upstash, Inc.", "Stockage technique (paniers, files d’envoi, limitation de débit)", "{{regionsPrestataires}}"],
                ["{{outilEmails}}", "E-mails de la maison (lettres et scénarios automatiques)", "Selon l’outil retenu"],
                ["Resend", "E-mails techniques (codes de connexion, confirmations)", "États-Unis"],
                ["Anthropic PBC", "Assistante et styliste IA (modèle Claude) ; données non utilisées pour l’entraînement", "États-Unis"],
                ["Cloudflare, Inc.", "Protection des formulaires contre les robots (Turnstile)", "États-Unis et réseau mondial"],
                ["Sentry (Functional Software, Inc.)", "Suivi des erreurs techniques", "{{regionsPrestataires}}"],
                ["Plausible Insights OÜ ou Google Ireland Limited", "Mesure d’audience, avec votre consentement", "Union européenne (Plausible) ; Union européenne et États-Unis (Google)"],
                ["Meta Platforms Ireland Limited, Google Ireland Limited", "Publicité et mesure des campagnes, avec votre consentement", "Union européenne et États-Unis"],
                ["La Poste (Colissimo), Chronopost, DHL", "Livraison des commandes", "Selon la destination"],
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
          "Lorsque des données sont traitées hors de l’Union européenne, ces transferts sont encadrés par une décision d’adéquation de la Commission européenne (notamment le cadre de protection des données UE–États-Unis pour les entreprises certifiées, ou la décision relative au Canada) ou, à défaut, par les clauses contractuelles types adoptées par la Commission, complétées si nécessaire de mesures techniques. Vous pouvez en obtenir une copie en nous écrivant.",
        ],
      },
      {
        id: "securite",
        title: "5. Sécurité",
        blocks: [
          "Le site est servi exclusivement en HTTPS. Les comptes sont cloisonnés dans la base par des règles de sécurité par ligne : chaque cliente n’accède qu’à ses propres données. Le tableau de bord de l’atelier est protégé par une double authentification obligatoire. Les tentatives de connexion sont limitées, les formulaires protégés contre les robots, la base sauvegardée chaque jour. Aucune donnée bancaire n’est stockée par la maison.",
        ],
      },
      {
        id: "droits",
        title: "6. Vos droits",
        blocks: [
          "Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition, du droit de retirer votre consentement à tout moment, et du droit de définir des directives relatives au sort de vos données après votre décès.",
          "Depuis votre [compte](/compte#donnees), vous pouvez télécharger l’ensemble de vos données et supprimer votre compte vous-même. Vous pouvez aussi écrire à {{email}} ou au siège ({{siege}}) ; une preuve d’identité peut être demandée en cas de doute. Nous répondons dans un délai d’un mois.",
          "Vous pouvez introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — cnil.fr.",
        ],
      },
      { id: "mineures", title: "7. Mineures", blocks: ["Le compte est réservé aux personnes âgées d’au moins quinze ans. Si vous pensez qu’une personne plus jeune nous a transmis des données, écrivez-nous pour que nous les supprimions."] },
      { id: "cookies", title: "8. Cookies", blocks: ["Le détail des cookies et traceurs, et la façon de modifier vos choix, figurent dans la [politique cookies](/cookies)."] },
      { id: "modifications", title: "9. Modifications", blocks: ["Cette politique peut évoluer ; la date et la version en vigueur sont indiquées en haut de la page. En cas de changement important, vous en serez informée."] },
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
    intro: "Un cookie est un petit fichier déposé sur votre appareil ; d’autres traceurs (stockage local, pixels) fonctionnent de façon comparable. Nous n’utilisons que ceux qui sont nécessaires, et tous les autres uniquement avec votre accord.",
    sections: [
      {
        id: "choix",
        title: "Votre choix",
        blocks: [
          "À votre première visite, un bandeau vous propose d’accepter ou de refuser les cookies non nécessaires, avec la même simplicité, ou de choisir catégorie par catégorie : mesure d’audience, personnalisation, publicité. Aucun cookie non nécessaire n’est déposé avant votre choix.",
          "Votre choix est conservé treize mois, puis vous est redemandé ; il l’est aussi à chaque évolution importante de cette politique. Une preuve de chaque choix est conservée, sans donnée d’identification directe. Lorsque vous retirez votre accord, les traceurs concernés sont effacés.",
          { widget: "cookie-settings" },
        ],
      },
      {
        id: "categories",
        title: "Les catégories",
        blocks: [
          {
            list: [
              "**Nécessaires** — panier, connexion au compte, sécurité, mémorisation de vos choix. Toujours actifs : le site ne peut fonctionner sans eux.",
              "**Mesure d’audience** — compter les visites et les pièces consultées, de façon agrégée, pour améliorer le site.",
              "**Personnalisation** — se souvenir des pièces que vous avez regardées pour vous proposer une sélection, un accueil et des rappels qui vous ressemblent.",
              "**Publicité** — mesurer l’efficacité de nos campagnes sur Instagram, Facebook et Google, et vous y montrer nos pièces.",
            ],
          },
        ],
      },
      { id: "liste", title: "La liste complète", blocks: [{ widget: "cookie-table" }] },
      {
        id: "instagram",
        title: "Le flux Instagram",
        blocks: ["Les images de notre compte Instagram sont récupérées par notre serveur et servies depuis notre propre domaine : leur affichage ne dépose aucun traceur d’Instagram sur votre appareil."],
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
    title: "L’assistante et la styliste IA",
    seo: {
      title: "Notice de l’assistante IA | Awrea Paris",
      description: "Comment fonctionnent l’assistante et la styliste IA d’Awrea Paris, leurs limites, le traitement de vos messages, et comment parler à tout moment à une personne de l’atelier.",
    },
    updated: UPDATED,
    intro: "Sur le site, une assistante et une styliste fondées sur l’intelligence artificielle vous répondent à toute heure. Voici ce qu’il faut savoir avant de leur écrire.",
    sections: [
      {
        id: "ia",
        title: "Vous échangez avec une intelligence artificielle",
        blocks: [
          "L’assistante n’est pas une personne : c’est un programme fondé sur le modèle de langage Claude, conçu par la société Anthropic, que la maison a configuré avec ses propres informations (pièces, tailles, livraison, retours, histoire de la maison). La fenêtre de discussion le rappelle en permanence.",
        ],
      },
      {
        id: "capacites",
        title: "Ce qu’elle peut faire",
        blocks: [
          {
            list: [
              "Vous conseiller sur une taille, une matière, l’entretien ou l’association de pièces.",
              "Vous indiquer la disponibilité d’une pièce, les délais de fabrication et de livraison, les conditions de retour.",
              "Retrouver le suivi d’une commande, après vérification du numéro de commande et de l’adresse e-mail.",
              "Composer une silhouette à partir des pièces disponibles, d’après une occasion décrite ou une photo d’inspiration (styliste IA).",
              "Transmettre votre demande à l’atelier.",
            ],
          },
        ],
      },
      {
        id: "limites",
        title: "Ses limites",
        blocks: [
          "Ses réponses peuvent comporter des erreurs. Les informations des fiches produits, des [conditions générales de vente](/cgv) et de l’atelier font foi. Elle ne peut ni modifier une commande, ni accorder un remboursement, ni prendre d’engagement au nom de la maison : ces décisions sont toujours prises par une personne.",
        ],
      },
      {
        id: "humain",
        title: "Parler à une personne, à tout moment",
        blocks: [
          "Écrivez simplement « je souhaite parler à quelqu’un », ou utilisez le lien « Écrire à l’atelier » sous la conversation : votre message est transmis à l’atelier, qui vous répond personnellement, en général sous 48 heures ouvrées. Vous pouvez aussi passer directement par le [formulaire de contact](/contact).",
        ],
      },
      {
        id: "donnees",
        title: "Vos messages et vos photos",
        blocks: [
          "Vos messages sont traités par Anthropic, en qualité de sous-traitant, pour produire les réponses ; ils ne servent pas à entraîner ses modèles. La conversation est conservée dans votre navigateur le temps de votre visite, et une copie est gardée 30 jours par la maison pour améliorer les réponses.",
          "Une photo d’inspiration envoyée à la styliste est analysée pour vous répondre, puis supprimée : elle n’est jamais conservée.",
          "N’indiquez ni données bancaires, ni informations de santé, ni données concernant d’autres personnes. Le détail figure dans la [politique de confidentialité](/confidentialite).",
        ],
      },
      {
        id: "gestion",
        title: "L’intelligence artificielle à l’atelier",
        blocks: [
          "La maison utilise aussi des agents d’intelligence artificielle pour les tâches quotidiennes (rédaction des fiches, préparation des réponses, suivi des stocks, rapports). Toute décision qui engage de l’argent ou qui est irréversible — remboursement, changement de prix, suppression, envoi d’une lettre à toutes les clientes — est validée par une personne.",
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
    intro: "Vous disposez de quatorze jours après la réception de votre pièce pour changer d’avis, sans avoir à vous justifier. Indiquez votre commande ci-dessous : vous recevrez aussitôt un accusé de réception par e-mail, puis l’étiquette de retour.",
    sections: [
      { id: "en-ligne", title: "Se rétracter du contrat ici", blocks: [{ widget: "withdrawal-form" }] },
      {
        id: "conditions",
        title: "Les conditions",
        blocks: [
          "La pièce est renvoyée au plus tard quatorze jours après votre demande, non portée, dans son état d’origine, avec ses étiquettes et son certificat. Le retour est offert depuis la France ; depuis l’étranger, il reste à votre charge.",
          "Le remboursement intervient au plus tard quatorze jours après votre demande, sur le moyen de paiement utilisé, et peut être différé jusqu’à la réception de la pièce ou la preuve de son expédition.",
          "Les pièces réalisées sur mesure ou personnalisées selon vos indications ne peuvent faire l’objet d’une rétractation (article L221-28 du Code de la consommation). Le détail figure à l’article 8 des [conditions générales de vente](/cgv#retractation).",
        ],
      },
      {
        id: "autres-moyens",
        title: "Autres moyens",
        blocks: ["Vous pouvez aussi nous écrire à {{email}}, ou envoyer le formulaire ci-dessous par courrier à l’adresse du siège : {{siege}}.", { widget: "withdrawal-model" }],
      },
    ],
  },
} satisfies Record<string, LegalPage>;

export type LegalSlug = keyof typeof legalPages;

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
