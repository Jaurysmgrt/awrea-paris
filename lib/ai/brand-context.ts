/**
 * Contexte de marque partagé, construit une fois et mis en cache côté API (prompt caching) :
 * la référence de ton (content/brand/voice.md), l'identité, les faits boutique et la FAQ.
 * Ce bloc est STABLE : aucune date, aucun identifiant de requête — le contenu variable
 * (date du jour, page consultée, panier) est placé dans les messages, après le cache.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import { faq } from "@/content/fr/faq";
import { formatPrice } from "@/lib/format";

let voiceCache: string | null = null;

export function brandVoice(): string {
  if (voiceCache) return voiceCache;
  try {
    voiceCache = readFileSync(path.join(process.cwd(), "content/brand/voice.md"), "utf8");
  } catch {
    voiceCache = `${identity.name} — ${identity.description} Manifeste : ${identity.manifesto} Ton élégant et chaleureux, vouvoiement.`;
  }
  return voiceCache;
}

export function shopFacts(): string {
  const rates = shop.shippingRates
    .map((r) => `- ${r.label} : ${r.price ? formatPrice(r.price) : "offert"}${r.freeAboveThreshold ? ` (offert dès ${formatPrice(shop.freeShippingThreshold)})` : ""} — ${r.delay}`)
    .join("\n");
  const sizes = [shop.sizeGuide.headers.join(" | "), ...shop.sizeGuide.rows.map((r) => r.join(" | "))].join("\n");
  return `# Identité
Nom : ${identity.name} (aussi : ${identity.alternateNames.join(", ")})
Description : ${identity.description}
Manifeste : ${identity.manifesto}
Phrase de la créatrice : « ${identity.founderQuote} »
Instagram : ${identity.social.instagram} (${identity.social.instagramHandle}) · E-mail : ${identity.email}
Atelier : ${identity.address.streetAddress}, ${identity.address.postalCode} ${identity.address.addressLocality}

# Boutique
Expédition des pièces disponibles : ${shop.dispatchDays}. Précommandes : expédiées à la fin du délai de fabrication indiqué sur la pièce.
Livraison :
${rates}
Retours : ${shop.returnDays} jours après réception, pièce non portée avec son certificat ; pièces sur mesure ni reprises ni échangées.
Emballage cadeau : ${formatPrice(shop.giftWrapPrice)}, avec un message recopié à la main.
Paiement : ${shop.paymentMethods.join(", ")}. Commande possible sans compte.

# Guide des tailles (mesures du corps)
${sizes}
${shop.sizeGuide.note}`;
}

export function faqText(): string {
  return faq.map((g) => `## ${g.title}\n${g.items.map((i) => `Q : ${i.q}\nR : ${i.a}`).join("\n")}`).join("\n\n");
}

/** Bloc système complet (stable) : à marquer `cache_control` dans les requêtes. */
export function brandSystemBlock(): string {
  return `<reference_de_ton>\n${brandVoice()}\n</reference_de_ton>\n\n<faits_boutique>\n${shopFacts()}\n</faits_boutique>\n\n<faq>\n${faqText()}\n</faq>`;
}
