/**
 * Questions fréquentes : le texte vit dans le document de contenu « faq »
 * (content/site/fr/faq.json, modifiable dans l'éditeur Édition). Ce module le met en forme pour
 * la page /faq, la recherche, llms.txt, les données structurées (FAQPage), l'assistante et les agents.
 *
 * Repères remplis à l'affichage : {hauts} et {robes} (délais de fabrication des bodys et tops, des
 * robes, lus dans le catalogue), {seuil} (livraison offerte), {email} (adresse de la Maison).
 * Un lien s'écrit [libellé](/adresse) ; il devient un simple libellé hors de la page.
 *
 * Module pur : aucun accès au stockage, utilisable partout.
 */
import doc from "@/content/site/fr/faq.json";
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import { DEFAULT_LEAD_TIME, leadTimeText } from "@/lib/commerce/availability";
import type { Category, LeadTime, Product } from "@/lib/commerce/types";
import { formatPrice } from "@/lib/format";
import { fill } from "@/lib/edition/fill";

export type FaqDoc = typeof doc;

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: (FaqItem & { id: string })[];
}

export type FaqVars = { hauts: string; robes: string; seuil: string; email: string };

const family = (products: Pick<Product, "category" | "leadTime">[], categories: Category[]): LeadTime => {
  const known = products.filter((p) => categories.includes(p.category)).map((p) => p.leadTime);
  const source = known.length ? known : categories.map((c) => DEFAULT_LEAD_TIME[c]);
  return { min: Math.min(...source.map((t) => t.min)), max: Math.max(...source.map((t) => t.max)) };
};

/** Valeurs des repères, d'après le catalogue (sans catalogue : les délais par défaut). */
export function faqVars(products: Pick<Product, "category" | "leadTime">[] = []): FaqVars {
  return {
    hauts: leadTimeText(family(products, ["body", "top"])),
    robes: leadTimeText(family(products, ["robe"])),
    seuil: formatPrice(shop.freeShippingThreshold),
    email: identity.email,
  };
}

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

/** Liens [libellé](/adresse) remplacés par leur libellé (données structurées, recherche, llms.txt). */
export const plainLinks = (text: string) => text.replace(LINK, "$1");

/** Repère d'une information à compléter par la Maison : « [À COMPLÉTER : …] ». */
export const TO_COMPLETE = /\s*\[\s*À COMPLÉTER[^\]]*\]/gi;

/**
 * Groupes de questions, repères remplis. `links` : garder les liens (page /faq) ou n'en garder que
 * le libellé. `withoutToComplete` : retirer les repères « à compléter » (assistante, données publiées).
 */
export function faqGroups(d: Pick<FaqDoc, "groupes">, vars: FaqVars, opts: { links?: boolean; withoutToComplete?: boolean } = {}): FaqGroup[] {
  const text = (s: string) => {
    let out = fill(s, vars);
    if (!opts.links) out = plainLinks(out);
    if (opts.withoutToComplete) out = out.replace(TO_COMPLETE, "");
    return out;
  };
  return d.groupes.map((g) => ({ id: g.id, title: g.titre, items: g.questions.map((it) => ({ id: it.id, q: text(it.q), a: text(it.r) })) }));
}

/** FAQ du dépôt, repères remplis avec les délais par défaut : recherche, llms.txt, données structurées. */
export const faq: FaqGroup[] = faqGroups(doc, faqVars(), { withoutToComplete: true });
