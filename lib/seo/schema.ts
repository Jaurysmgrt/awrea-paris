/**
 * Données structurées Schema.org — toutes construites depuis content/brand/identity.ts
 * pour que le nom, la description et les liens soient identiques partout. La description, l'e-mail
 * et l'adresse de la Maison se corrigent donc à cet endroit seulement (création sur demande par des
 * artisans français, coordonnées des mentions légales officielles).
 */
import { identity } from "@/content/brand/identity";
import { leadTimeText, type LeadTimeTemplates } from "@/lib/commerce/availability";
import type { Product } from "@/lib/commerce/types";
import type { FaqItem } from "@/content/fr/faq";
import { absolute, siteDefaults, siteUrl } from "@/lib/seo/metadata";
import { imageAt } from "@/lib/media";
import { localizePath, type Locale } from "@/lib/i18n/routing";

const orgId = `${siteUrl}/#organisation`;

const img = (src: string) => (src.startsWith("http") ? src : absolute(imageAt(src, 1200)));

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ClothingStore"],
    "@id": orgId,
    name: identity.name,
    alternateName: identity.alternateNames,
    legalName: identity.legalName,
    url: siteUrl,
    // logo officiel (public/brand) et image de partage par défaut (app/opengraph-image.png)
    logo: absolute("/brand/awrea-logo.png"),
    image: absolute(siteDefaults.image.url),
    description: identity.description,
    slogan: identity.tagline,
    ...(identity.foundingYear ? { foundingDate: String(identity.foundingYear) } : {}),
    foundingLocation: { "@type": "Place", name: identity.foundingLocation },
    founder: { "@type": "Person", jobTitle: "Créatrice et fondatrice", name: identity.founderTitle },
    email: identity.email,
    telephone: identity.phone,
    // adresse de l'entreprise (mentions légales officielles) et numéro SIRET
    address: { "@type": "PostalAddress", ...identity.legalAddress },
    identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: identity.siret },
    // livraison en France métropolitaine (article 5 des CGV officielles)
    areaServed: "FR",
    knowsAbout: ["dentelle noire", "prêt-à-porter féminin", "drapé", "satin", "jersey", "dorure", "création sur demande"],
    sameAs: [identity.social.instagram, identity.social.linktree],
    priceRange: "€€",
    currenciesAccepted: "EUR",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#site`,
    url: siteUrl,
    name: identity.name,
    alternateName: identity.alternateNames,
    description: identity.shortDescription,
    inLanguage: "fr-FR",
    publisher: { "@id": orgId },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/recherche?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Adresse absolue d'une page dans la langue de la page (anglais : préfixe /en). */
const pageUrl = (path: string, locale: Locale) => absolute(localizePath(path, locale));

export function breadcrumbSchema(items: { name: string; path: string }[], locale: Locale = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: pageUrl(it.path, locale) })),
  };
}

/**
 * Fiche d'une pièce. Chaque pièce est créée sur demande, sans stock : disponibilité
 * schema.org/MadeToOrder, délai de fabrication en délai de préparation (jours ouvrés).
 * `delai` : modèles du document « catalogue » (sans marques d'édition), pour écrire le délai comme
 * la fiche l'affiche.
 */
export function productSchema(p: Product, delai?: LeadTimeTemplates, locale: Locale = "fr") {
  const url = pageUrl(`/boutique/${p.handle}`, locale);
  const material = p.materials.map((m) => `${m.name} ${m.percent} %`).join(", ");
  // visuels provisoires (images générées en attendant les prises de vue) : jamais transmis aux
  // moteurs, qui ne montrent pas la mention « visuel provisoire » (même règle que lib/feeds.ts)
  const photos = [...p.images, ...(p.detailImage ? [p.detailImage] : [])].filter((i) => !i.provisoire).map((i) => img(i.src));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#piece`,
    name: p.title,
    description: [p.tagline, ...p.description].join(" "),
    ...(photos.length ? { image: photos } : {}),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: identity.name },
    manufacturer: { "@id": orgId },
    category: p.category,
    ...(material ? { material } : {}),
    countryOfOrigin: "FR",
    additionalProperty: [
      { "@type": "PropertyValue", name: "Fabrication", value: "Créée sur demande par des artisans français" },
      { "@type": "PropertyValue", name: "Délai de fabrication", value: leadTimeText(p.leadTime, delai) },
    ],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: identity.currency,
      price: (p.price / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/MadeToOrder",
      seller: { "@id": orgId },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "FR" },
        shippingRate: { "@type": "MonetaryAmount", value: "9.00", currency: "EUR" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          // fabrication sur demande, puis expédition : jours ouvrés
          handlingTime: { "@type": "QuantitativeValue", minValue: p.leadTime.min * 5, maxValue: p.leadTime.max * 5, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "FR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

export function articleSchema(a: { title: string; description: string; path: string; image: string; date: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    image: img(a.image),
    datePublished: a.date,
    dateModified: a.date,
    inLanguage: "fr-FR",
    mainEntityOfPage: absolute(a.path),
    author: { "@type": "Organization", name: identity.name, url: siteUrl },
    publisher: { "@id": orgId },
  };
}

export function collectionSchema(c: { title: string; description: string; path: string; items: { name: string; path: string }[] }, locale: Locale = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    description: c.description,
    url: pageUrl(c.path, locale),
    isPartOf: { "@id": `${siteUrl}/#site` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: c.items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: pageUrl(it.path, locale), name: it.name })),
    },
  };
}
