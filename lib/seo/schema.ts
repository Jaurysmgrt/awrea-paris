/**
 * Données structurées Schema.org — toutes construites depuis content/brand/identity.ts
 * pour que le nom, la description et les liens soient identiques partout.
 */
import { identity } from "@/content/brand/identity";
import { editionInfo, productAvailability } from "@/lib/commerce/availability";
import type { Product } from "@/lib/commerce/types";
import type { FaqItem } from "@/content/fr/faq";
import { absolute, siteUrl } from "./metadata";
import { imageAt } from "@/lib/media";

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
    logo: absolute("/icon.svg"),
    image: absolute("/media/img/og-default.jpg"),
    description: identity.description,
    slogan: identity.tagline,
    foundingDate: String(identity.foundingYear),
    foundingLocation: { "@type": "Place", name: identity.foundingLocation },
    founder: { "@type": "Person", jobTitle: "Créatrice et fondatrice", name: identity.founderTitle },
    email: identity.email,
    address: { "@type": "PostalAddress", ...identity.address },
    areaServed: ["FR", "EU", "Worldwide"],
    knowsAbout: ["dentelle noire", "prêt-à-porter féminin", "couture main", "drapé", "satin", "jersey", "pièces uniques"],
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
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  };
}

export function productSchema(p: Product) {
  const availability = productAvailability(p);
  const ed = editionInfo(p);
  const url = absolute(`/boutique/${p.handle}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#piece`,
    name: p.title,
    description: [p.tagline, ...p.description].join(" "),
    image: [...p.images.map((i) => img(i.src)), img(p.detailImage.src)],
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: identity.name },
    manufacturer: { "@id": orgId },
    category: p.category,
    material: p.materials.map((m) => `${m.name} ${m.percent} %`).join(", "),
    countryOfOrigin: "FR",
    additionalProperty: [
      { "@type": "PropertyValue", name: "Fabrication", value: "Fait main à Paris" },
      { "@type": "PropertyValue", name: "Édition", value: ed.unique ? "Pièce unique" : `Série numérotée de ${ed.total} pièces` },
    ],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: identity.currency,
      price: (p.price / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        availability === "available" ? "https://schema.org/InStock" : availability === "preorder" ? "https://schema.org/PreOrder" : "https://schema.org/SoldOut",
      seller: { "@id": orgId },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "FR" },
        shippingRate: { "@type": "MonetaryAmount", value: "9.00", currency: "EUR" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" },
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

export function collectionSchema(c: { title: string; description: string; path: string; items: { name: string; path: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    description: c.description,
    url: absolute(c.path),
    isPartOf: { "@id": `${siteUrl}/#site` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: c.items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: absolute(it.path), name: it.name })),
    },
  };
}
