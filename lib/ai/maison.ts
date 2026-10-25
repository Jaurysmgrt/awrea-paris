/**
 * Ce que l'assistante et les agents savent de la Maison, et qui fait foi : identité, collection en
 * cours et son texte officiel, pièces et délais de fabrication, création sur demande par des
 * artisans français, étapes d'une commande, livraison, retours, rétractation et garanties d'après
 * les conditions générales de vente officielles (ressources-awrea/CONDITION GÉNÉRALES DE VENTE,
 * page /cgv), guide des tailles.
 *
 * Rien n'est inventé : composition, entretien et mesures inconnus restent « à compléter », et
 * l'assistante propose alors de transmettre la question à la Maison. Les textes de la créatrice
 * sont repris mot pour mot (officiel: true) : seule la typographie y est contrôlée.
 */
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { leadTimeText } from "@/lib/commerce/availability";
import type { Collection, Product } from "@/lib/commerce/types";
import { faqVars } from "@/content/fr/faq";

/** Textes officiels de la créatrice (TEASING MARQUE.png, À PROPOS AWREA.pdf), mot pour mot. */
export const TEXTES_OFFICIELS = {
  officiel: true,
  teasing: {
    titre: "Des pièces qui subliment la silhouette",
    paragraphes: [
      "Awrea Paris célèbre la rencontre des contrastes.",
      "La délicatesse de la dentelle dialogue avec la force du bijou, dans un équilibre subtil entre sensualité et caractère. Chaque pièce est créée sur demande, loin des logiques de production de masse. Ce choix est au cœur de notre vision : produire uniquement ce qui est désiré, avec conscience et respect de l’environnement. Il n’y a pas de stock, seulement des créations pensées pour la personne qui les porte. Nos modèles prennent vie entre les mains d’artisans français, gardiens d’un savoir-faire précieux. Nous accordons une attention essentielle aux conditions de travail et à la valorisation de ces métiers, convaincus que la beauté d’une pièce naît aussi de l’éthique qui l’accompagne.",
      "Porter Awrea, c’est choisir une pièce d’exception, conçue pour traverser le temps. Une création qui révèle le corps au lieu de le dissimuler, qui célèbre l’allure, la confiance et la liberté d’être soi.",
    ],
  },
  aPropos: {
    titre: "La délicatesse rencontre la force. L’élégance devient une signature.",
    paragraphes: [
      "Awrea Paris est née d’une fascination pour les contrastes, pour cette dualité qui fait toute la singularité de la féminité : la douceur et la puissance, la délicatesse et l’audace, la subtilité et l’éclat. Au cœur de nos collections, la dentelle et les drapés dessinent une féminité délicate et sculpturale. Les matières se révèlent avec finesse, les lignes épousent le corps, les volumes se dessinent avec fluidité. Chaque détail évoque une élégance presque instinctive, un équilibre entre sensualité et sophistication.",
      "Puis vient la dorure. Précieuse, lumineuse et affirmée, elle apporte une force nouvelle aux silhouettes. Elle capte la lumière, souligne les détails et impose sa présence. Plus qu’un ornement, elle devient une signature : l’expression d’une féminité qui n’a pas peur de se faire remarquer, d’occuper l’espace et d’affirmer son caractère.",
      "C’est dans cette rencontre entre la finesse des matières et la puissance de l’or que naît l’identité d’Awrea Paris. Une esthétique où la douceur n’exclut jamais la force, où la délicatesse devient audacieuse et où chaque création joue sur l’équilibre entre sensualité, caractère et raffinement. Nous imaginons des pièces pour les femmes qui embrassent leurs contrastes, qui savent être douces sans renoncer à leur puissance, délicates sans perdre leur audace. Des femmes qui ne cherchent pas simplement à être remarquées, mais à laisser une impression, une présence, un souvenir.",
      "Awrea Paris ne suit pas une vision conventionnelle de l’élégance. Elle en propose une interprétation singulière, sculpturale et lumineuse, où chaque matière, chaque drapé et chaque éclat doré participe à une même vision.",
    ],
  },
};

/** Les cinq étapes d'une commande, libellés exacts (lib/commerce/orders.ts, statusLabel). */
export const ETAPES_COMMANDE = ["Commande reçue", "En confection", "Prête", "Expédiée", "Livrée"] as const;

/** Modes de livraison prévus par les CGV : France métropolitaine, par transporteur (sans retrait ni étranger). */
export const deliveryModes = () => shop.shippingRates.filter((r) => r.zone === "FR" && !r.pickup);

/** Résumé fidèle des conditions générales de vente officielles ; le texte complet de /cgv fait foi. */
export function cgvFacts(): string {
  const modes = deliveryModes()
    .map((r) => `${r.label} : ${formatPrice(r.price)}${r.freeAboveThreshold ? `, offerte dès ${formatPrice(shop.freeShippingThreshold)}` : ""}`)
    .join(" ; ");
  return `Prix : en euros, toutes taxes comprises. Les frais de livraison s’ajoutent au prix ; ils sont affichés avant la commande. Une facture est établie pour chaque commande.
Paiement : comptant, en totalité, le jour de la commande. Moyens cités par les conditions générales de vente : carte bancaire, PayPal, Google Pay, Apple Pay. La Maison ne voit jamais les données bancaires.
Commande : la cliente vérifie son panier, confirme et accepte les conditions générales de vente ; une confirmation part par e-mail. La vente est valide après le paiement intégral. La cliente suit sa commande sur le site.
Annulation : possible dans les deux jours qui suivent l’acceptation de la commande par la Maison, et tant que la livraison n’a pas eu lieu, en écrivant à ${identity.email} avec le numéro de commande. Le droit de rétractation s’applique par ailleurs.
Livraison : en France métropolitaine seulement, par un transporteur indépendant, à l’adresse indiquée à la commande. Les conditions générales de vente prévoient une livraison en 5 à 10 jours ouvrés ; une pièce créée sur demande part à la fin de sa confection. Modes et tarifs : ${modes}. Pour une autre destination ou un retrait en main propre : la Maison répond elle-même.
Retard : si la commande n’est pas livrée dans les sept jours qui suivent la date indicative de livraison, hors force majeure ou fait de la cliente, la vente peut être résolue à la demande écrite de la cliente ; les sommes versées sont rendues dans les quatorze jours.
Réclamations : 48 heures pour un colis abîmé, 14 jours pour un problème sur la pièce, à compter de la livraison, par e-mail à ${identity.email}, avec le numéro de commande, le motif et des photos.
Rétractation : quatorze jours après la réception de la pièce, en ligne sur la page /retractation ou par toute déclaration claire envoyée par e-mail ou par courrier. La pièce revient dans son état d’origine et complète (emballage, accessoires), avec sa facture ; une pièce abîmée, salie ou incomplète n’est pas reprise. Les frais de retour restent à la charge de la cliente. Échange ou remboursement dans les quatorze jours qui suivent la réception de la pièce par la Maison ; un échange de taille est une nouvelle confection, avec son délai.
Garanties : garantie légale de conformité (deux ans après la délivrance) et garantie des vices cachés (deux ans après leur découverte). La cliente prévient la Maison par écrit ; remboursement, remplacement ou réparation au plus tard quatorze jours après la constatation du défaut.
Photographies : non contractuelles. Les visuels actuels des pièces sont provisoires, des images générées en attendant les photographies de la Maison.
Propriété : transférée au paiement complet. Droit français ; seul le texte français fait foi.`;
}

const rows = () => [shop.sizeGuide.headers.join(" | "), ...shop.sizeGuide.rows.map((r) => r.join(" | "))].join("\n");

/** Une information inconnue de la Maison : jamais reprise telle quelle, jamais devinée. */
const known = (s: string) => !/\[\s*À COMPLÉTER/i.test(s);

/** Ligne d'une pièce pour le contexte de l'assistante et des agents. */
export function pieceLine(p: Product): string {
  const materials = p.materials.length ? p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ") : "composition non communiquée";
  const care = p.care.filter(known);
  return `${p.title} (${p.handle}, ${p.category}) : ${formatPrice(p.price)}, création sur demande, ${leadTimeText(p.leadTime)} de fabrication. Tailles : ${p.variants.map((v) => v.size).join(", ")}. ${p.tagline} Matières : ${materials}. Entretien : ${care.length ? care.join(" ") : "non communiqué"}.`;
}

/**
 * Faits de la Maison (bloc stable du contexte) : ils changent seulement avec le catalogue, la
 * collection ou les réglages, ce qui garde le cache des requêtes efficace.
 */
export function maisonFacts(products: Product[], collection: Collection | null): string {
  const { hauts, robes } = faqVars(products);
  const pieces = collection ? products.filter((p) => p.collection === collection.handle) : products;
  const others = products.filter((p) => !pieces.includes(p));
  return `# La Maison
${identity.description}
Manifeste : ${identity.manifesto}
Phrase de la créatrice, à citer telle quelle : « ${identity.founderQuote} »
Contact : ${identity.email}, formulaire /contact, rendez-vous avec la créatrice /rendez-vous, Instagram ${identity.social.instagramHandle}.

# Création sur demande
Chaque pièce est créée sur demande, après la commande, par des artisans français, dans la taille choisie. Il n’y a pas de stock : toutes les tailles proposées se commandent, et rien n’est jamais épuisé. Il n’y a ni série numérotée, ni édition limitée, ni liste d’attente, ni précommande, ni urgence.
Délais de fabrication indiqués sur chaque fiche : ${hauts} pour un body ou un top, ${robes} pour une robe. Vient ensuite la livraison.
Chaque pièce confectionnée reçoit un numéro de création unique (par exemple « Création n° 0001 »), inscrit sur son certificat d’authenticité ; un code permet de vérifier le certificat en ligne.
Page qui explique tout : /sur-commande.

# Éthique de production (texte officiel de la créatrice, à citer mot pour mot entre guillemets)
${TEXTES_OFFICIELS.teasing.paragraphes.join("\n")}

# Histoire de la Maison (texte officiel, page /la-maison)
${TEXTES_OFFICIELS.aPropos.titre}
${TEXTES_OFFICIELS.aPropos.paragraphes.join("\n")}

# Collection en cours
${collection ? `${collection.title} (/collections/${collection.handle}). Texte officiel de la créatrice : « ${collection.lead} » ${collection.intention.join(" ")}` : "Aucune collection en cours."}
Pièces :
${pieces.map(pieceLine).join("\n") || "aucune"}${others.length ? `\nAutres pièces :\n${others.map(pieceLine).join("\n")}` : ""}

# Étapes d’une commande
${ETAPES_COMMANDE.join(", ")}. La cliente les suit dans son compte (/compte) ou sur /suivi avec son numéro de commande et son adresse e-mail. Un e-mail la prévient quand la commande est reçue, quand elle entre en confection, quand elle est prête et quand elle part.

# Conditions générales de vente (résumé fidèle ; le texte complet de /cgv fait foi)
${cgvFacts()}
Emballage cadeau : ${formatPrice(shop.giftWrapPrice)}, avec un message de la cliente. Commande possible sans compte.

# Guide des tailles (mesures du corps, en centimètres ; page /guide-des-tailles)
${rows()}
${shop.sizeGuide.note}${shop.sizeGuide.confirme ? "" : "\nCes repères sont encore à confirmer par la Maison : dites-le si la cliente hésite."}`;
}
