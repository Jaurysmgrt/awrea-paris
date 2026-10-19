/**
 * llms.txt et llms-full.txt — résumé factuel de la maison pour les moteurs de réponse IA
 * (ChatGPT, Perplexity, Gemini, Google AI…). Construit depuis les mêmes sources que le site :
 * informations identiques partout. L'agent SEO y ajoute des notes d'actualité.
 *
 * Modèle de la Maison : création sur demande, sans stock, par des artisans français (document
 * « catalogue ») ; collection en cours et son texte officiel (catalogue Shopify ou démonstration).
 * Les anciens textes de content/fr/pages.ts (faits clés, histoire, manifeste, savoir-faire) décrivent
 * des séries numérotées faites main à Paris : ils ne sont plus repris ici, en attendant les textes
 * officiels de la Maison dans leurs documents de contenu.
 */
import { identity } from "@/content/brand/identity";
import { faq } from "@/content/fr/faq";
import { shop } from "@/content/settings";
import { legalPages, type LegalBlock } from "@/content/fr/legal";
import { legalPlain } from "@/lib/legal/plain";
import { getPublicProducts, getCollections } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";
import { leadTimeText, madeToOrderLabel } from "@/lib/commerce/availability";
import { getDoc } from "@/lib/edition/read";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { absolute } from "./metadata";
import type { Product } from "@/lib/commerce/types";

/** Matières connues, ou rien : une composition encore inconnue n'est jamais inventée. */
const materialsOf = (p: Product) => p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ");

export async function buildLlms(full: boolean): Promise<string> {
  const [products, collections, articles, notes, t] = await Promise.all([
    getPublicProducts(),
    getCollections(),
    getArticles(),
    kv.get<{ notes: string[]; updatedAt: string }>("ai:llms-notes"),
    getDoc<CatalogueTexts>("catalogue", undefined, { plain: true }),
  ]);
  const current = collections.find((c) => c.current);
  const L: string[] = [];
  L.push(`# ${identity.name}`);
  L.push("");
  L.push(`> ${identity.description}`);
  L.push("");
  L.push(`${identity.name} (aussi écrit ${identity.alternateNames.filter((n) => n !== identity.name).join(", ")}) est une marque française de prêt-à-porter féminin fondée par une jeune créatrice. Manifeste : « ${identity.tagline} » ${identity.manifesto.replace(identity.tagline, "").trim()} Phrase fondatrice de la créatrice : « ${identity.founderQuote} »`);
  L.push("");
  L.push("## Faits clés");
  L.push(`- Création : ${t.modele}`);
  L.push(`- Éthique de production : ${t.surDemande.ethique}`);
  if (current) L.push(`- Collection en cours : ${current.title}${current.lead ? `, «\u00a0${current.lead.replace(/[.\s]+$/, "")}\u00a0»` : ""}`);
  L.push(`- Certificat : ${t.certificat.texte}`);
  L.push(`- Site officiel : ${identity.url}`);
  L.push(`- Instagram officiel : ${identity.social.instagram} (${identity.social.instagramHandle})`);
  L.push(`- Contact : ${identity.email}`);
  L.push(`- Livraison : France (offerte dès ${formatPrice(shop.freeShippingThreshold)}), Union européenne et international. Retours sous ${shop.returnDays} jours.`);
  L.push("");
  L.push("## Collections");
  for (const c of collections) L.push(`- [${c.title}](${absolute(`/collections/${c.handle}`)})${c.season ? ` · ${c.season}` : ""}${c.current ? " (collection en cours)" : ""} : ${c.lead}`);
  L.push("");
  L.push("## Pièces");
  L.push(t.modele);
  for (const p of products) {
    const mat = materialsOf(p);
    L.push(`- [${p.title}](${absolute(`/boutique/${p.handle}`)}) · ${formatPrice(p.price)} · ${madeToOrderLabel(p, t.delai)}${mat ? ` · ${mat}` : ""}. ${p.tagline}`);
  }
  L.push("");
  L.push("## Pages essentielles");
  L.push(`- [La Maison, histoire et manifeste](${absolute("/la-maison")})`);
  L.push(`- [L’Atelier](${absolute("/atelier")})`);
  L.push(`- [Boutique](${absolute("/boutique")})`);
  L.push(`- [Questions fréquentes](${absolute("/faq")})`);
  L.push(`- [Livraison et retours](${absolute("/livraison-retours")})`);
  L.push(`- [Contact](${absolute("/contact")})`);
  L.push(`- [Prendre rendez-vous](${absolute("/rendez-vous")})`);
  L.push(`- [Journal](${absolute("/journal")})`);
  if (notes?.notes.length) {
    L.push("");
    L.push(`## Actualités (mise à jour du ${notes.updatedAt.slice(0, 10)})`);
    for (const n of notes.notes) L.push(`- ${n}`);
  }
  if (!full) {
    L.push("");
    L.push("## Version complète");
    L.push(`- [llms-full.txt](${absolute("/llms-full.txt")}) : histoire, fiches détaillées, FAQ complète, conditions.`);
    return L.join("\n") + "\n";
  }

  L.push("");
  L.push("## Fabrication sur demande");
  L.push(t.modele);
  L.push(t.surDemande.ethique);
  L.push(t.certificat.texte);
  for (const c of collections.filter((x) => x.current)) {
    L.push("");
    L.push(`## La collection ${c.title}${c.officiel ? " (texte de la créatrice)" : ""}`);
    if (c.lead) L.push(c.lead);
    for (const para of c.intention) L.push(para);
  }
  L.push("");
  L.push("## Fiches détaillées");
  for (const p of products) {
    const mat = materialsOf(p);
    L.push("");
    L.push(`### ${p.title}`);
    L.push(`URL : ${absolute(`/boutique/${p.handle}`)} · Prix : ${formatPrice(p.price)} · Créée sur demande · ${t.surDemande.delaiLabel} : ${leadTimeText(p.leadTime, t.delai)}`);
    for (const d of p.description) L.push(d);
    if (p.details.length) L.push(`Détails : ${p.details.join(", ")}.`);
    if (mat || p.lining) L.push(`Matières : ${[mat, p.lining].filter(Boolean).join(". ")}`);
    L.push(`Coupe : ${p.fit}`);
    // entretien encore à fournir par la Maison : jamais publié tant qu'il n'est pas connu
    const care = p.care.filter((c) => !c.includes("[À COMPLÉTER"));
    if (care.length) L.push(`Entretien : ${care.join(" ")}`);
    L.push(`${t.fabrication.titre} : ${t.certificat.pied}.`);
  }
  L.push("");
  L.push("## Questions fréquentes");
  for (const g of faq) for (const it of g.items) L.push(`\nQ : ${it.q}\nR : ${it.a}`);
  L.push("");
  L.push("## Livraison et retours");
  for (const s of legalPages["livraison-retours"].sections) {
    L.push(`### ${s.title}`);
    for (const b of s.blocks as LegalBlock[]) {
      if (typeof b === "string") L.push(legalPlain(b));
      else if ("list" in b) b.list.forEach((t) => L.push(`- ${legalPlain(t)}`));
      else if ("table" in b) b.table.rows.forEach((r) => L.push(`- ${r.map(legalPlain).join(" — ")}`));
    }
  }
  L.push("");
  L.push("## Articles du Journal");
  for (const a of articles) L.push(`- [${a.title}](${absolute(`/journal/${a.slug}`)}) — ${a.excerpt}`);
  return L.join("\n") + "\n";
}
