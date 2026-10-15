/**
 * Questions fréquentes, rédigées en questions naturelles (pour Google et les moteurs IA).
 * Balisées en FAQPage (Schema.org). Utilisées aussi par l'assistant et l'agent Service client.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export const faq: { title: string; items: FaqItem[] }[] = [
  {
    title: "La maison",
    items: [
      { q: "Qui est derrière Awrea Paris ?", a: "Awrea Paris est une marque de prêt-à-porter féminin fondée à Paris par une jeune créatrice parisienne. Elle dessine, coupe et coud elle-même chaque pièce dans son atelier, en pièce unique ou en très petite série numérotée." },
      { q: "Où sont fabriquées les pièces Awrea Paris ?", a: "Toutes les pièces sont fabriquées à la main à Paris, dans l’atelier de la créatrice. Aucune étape de fabrication n’est délocalisée." },
      { q: "Que signifie « Consommer plus juste » ?", a: "C’est le manifeste de la maison : produire peu, en séries courtes et numérotées, au prix juste. Une création exclusive n’a pas besoin d’être réservée à l’ultra luxe." },
      { q: "Pourquoi les pièces sont-elles numérotées ?", a: "Chaque série compte d’une à dix pièces au plus. Chaque exemplaire reçoit un numéro (par exemple N° 3 / 5) et un certificat signé par la créatrice. Lorsqu’une série est complète, elle ne revient pas à l’identique." },
    ],
  },
  {
    title: "Tailles et conseils",
    items: [
      { q: "Comment choisir ma taille ?", a: "Chaque fiche produit comporte un guide des tailles et un conseil de coupe. Entre deux tailles, choisissez plutôt la plus petite pour les pièces lacées, la plus grande pour les pièces en satin. L’assistant du site et l’atelier peuvent aussi vous conseiller." },
      { q: "Puis-je essayer les pièces avant d’acheter ?", a: "Oui. L’atelier parisien vous reçoit sur rendez-vous pour un essayage des pièces disponibles. Prenez rendez-vous depuis la page Contact." },
      { q: "Proposez-vous du sur mesure ?", a: "Oui, sur rendez-vous. Certaines pièces, comme le corset Elia, sont réalisées à vos mesures après commande. L’atelier vous contacte pour relever vos mesures." },
      { q: "Les pièces peuvent-elles être retouchées ?", a: "Oui. Toutes les pièces Awrea peuvent être ajustées ou réparées à l’atelier, y compris plusieurs années après l’achat." },
    ],
  },
  {
    title: "Commandes et précommandes",
    items: [
      { q: "Faut-il créer un compte pour commander ?", a: "Non. Vous pouvez commander sans compte ; il vous suffit d’une adresse e-mail. Le compte permet seulement de retrouver vos commandes, vos adresses et votre liste d’envies." },
      { q: "Quels moyens de paiement acceptez-vous ?", a: "Carte bancaire, Apple Pay, Google Pay, PayPal et le paiement en trois ou quatre fois. Le paiement est entièrement sécurisé." },
      { q: "Comment fonctionne la précommande ?", a: "Lorsqu’une taille n’est plus en stock mais que la série n’est pas complète, vous pouvez la précommander. Le délai de fabrication est indiqué sur la fiche (deux à six semaines selon la pièce) ; vous êtes débitée à la commande et prévenue à l’expédition." },
      { q: "Une pièce est épuisée : puis-je être prévenue ?", a: "Oui. Inscrivez-vous à la liste d’attente depuis la fiche de la pièce : vous recevrez un e-mail dès qu’un nouvel exemplaire sort de l’atelier." },
      { q: "Proposez-vous des cartes cadeaux et un emballage cadeau ?", a: "Oui. Les cartes cadeaux sont utilisables sur tout le site. L’emballage cadeau, avec un message manuscrit de votre part, peut être ajouté depuis le panier." },
    ],
  },
  {
    title: "Livraison et retours",
    items: [
      { q: "Livrez-vous à l’international ?", a: "Oui. Nous livrons en France, dans l’Union européenne et à l’international par transporteur suivi. Hors Union européenne, les droits de douane et taxes du pays sont calculés et réglés dès la commande : rien à payer à la livraison." },
      { q: "La livraison est-elle offerte ?", a: "La livraison en France est offerte dès 250 € d’achat, ainsi que la livraison dans l’Union européenne au-delà de ce même montant." },
      { q: "Combien de temps prend la livraison ?", a: "Les pièces disponibles sont expédiées sous 2 à 5 jours ouvrés, puis livrées en 1 à 7 jours selon la destination. Les précommandes sont expédiées à la fin du délai de fabrication indiqué." },
      { q: "Comment suivre mon colis ?", a: "Un e-mail avec le numéro de suivi vous est envoyé à l’expédition. Vous pouvez aussi retrouver le suivi dans votre compte ou en demandant à l’assistant du site avec votre numéro de commande." },
      { q: "Puis-je retourner une pièce ?", a: "Oui, sous 14 jours après réception, si la pièce n’a pas été portée et qu’elle est renvoyée avec son certificat. Les pièces réalisées sur mesure ne sont ni reprises ni échangées." },
    ],
  },
];
