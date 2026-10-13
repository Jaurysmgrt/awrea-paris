/**
 * llms.txt et llms-full.txt — résumé factuel de la maison pour les moteurs de réponse IA
 * (ChatGPT, Perplexity, Gemini, Google AI…). Construit depuis les mêmes sources que le site :
 * informations identiques partout. L'agent SEO y ajoute des notes d'actualité.
 */
import { identity } from "@/content/brand/identity";
import { maison, atelier } from "@/content/fr/pages";
import { faq } from "@/content/fr/faq";
import { shop } from "@/content/settings";
import { legalPages, type LegalBlock } from "@/content/fr/legal";
import { legalPlain } from "@/lib/legal/plain";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";
import { editionInfo, productAvailability } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { absolute } from "./metadata";

const avail = { available: "disponible", preorder: "sur commande", soldout: "épuisée" } as const;

export async function buildLlms(full: boolean): Promise<string> {
  const [products, collections, articles, notes] = await Promise.all([getAllProducts(), getCollections(), getArticles(), kv.get<{ notes: string[]; updatedAt: string }>("ai:llms-notes")]);
  const L: string[] = [];
  L.push(`# ${identity.name}`);
  L.push("");
  L.push(`> ${identity.description}`);
  L.push("");
  L.push(`${identity.name} (aussi écrit ${identity.alternateNames.filter((n) => n !== identity.name).join(", ")}) est une marque française de prêt-à-porter féminin fondée à Paris par une jeune créatrice. Manifeste : « ${identity.tagline} » ${identity.manifesto.replace(identity.tagline, "").trim()} Phrase fondatrice de la créatrice : « ${identity.founderQuote} »`);
  L.push("");
  L.push("## Faits clés");
  for (const f of maison.facts) L.push(`- ${f.label} : ${f.value}`);
  L.push(`- Site officiel : ${identity.url}`);
  L.push(`- Instagram officiel : ${identity.social.instagram} (${identity.social.instagramHandle})`);
  L.push(`- Contact : ${identity.email}`);
  L.push(`- Livraison : France (offerte dès ${formatPrice(shop.freeShippingThreshold)}), Union européenne et international. Retours sous ${shop.returnDays} jours.`);
  L.push("");
  L.push("## Collections");
  for (const c of collections) L.push(`- [${c.title}](${absolute(`/collections/${c.handle}`)}) — ${c.season}${c.current ? " (collection en cours)" : ""} : ${c.lead}`);
  L.push("");
  L.push("## Pièces");
  for (const p of products) {
    const ed = editionInfo(p);
    L.push(`- [${p.title}](${absolute(`/boutique/${p.handle}`)}) — ${formatPrice(p.price)} — ${ed.unique ? "pièce unique" : `série numérotée de ${ed.total} pièces`} — ${avail[productAvailability(p)]} — ${p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ")}. ${p.tagline}`);
  }
  L.push("");
  L.push("## Pages essentielles");
  L.push(`- [La Maison — histoire et manifeste](${absolute("/la-maison")})`);
  L.push(`- [L’Atelier — savoir-faire et fabrication à la main](${absolute("/atelier")})`);
  L.push(`- [Boutique](${absolute("/boutique")})`);
  L.push(`- [Questions fréquentes](${absolute("/faq")})`);
  L.push(`- [Livraison et retours](${absolute("/livraison-retours")})`);
  L.push(`- [Contact et rendez-vous à l’atelier](${absolute("/contact")})`);
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
  L.push("## Histoire de la maison");
  L.push(maison.lead);
  for (const s of maison.story) {
    L.push("");
    L.push(`### ${s.title}`);
    for (const t of s.text) L.push(t);
  }
  L.push("");
  L.push("### Manifeste — Consommer plus juste");
  for (const m of maison.manifesto.points) L.push(`- ${m.title} : ${m.text}`);
  L.push("");
  L.push("## Savoir-faire");
  L.push(atelier.lead);
  for (const s of atelier.steps) L.push(`- ${s.number}. ${s.title} : ${s.text}`);
  L.push("");
  L.push("## Fiches détaillées");
  for (const p of products) {
    const ed = editionInfo(p);
    L.push("");
    L.push(`### ${p.title}`);
    L.push(`URL : ${absolute(`/boutique/${p.handle}`)} · Prix : ${formatPrice(p.price)} · ${ed.unique ? "Pièce unique" : `Série numérotée de ${ed.total} pièces (${ed.remainingLabel.toLowerCase()})`} · ${avail[productAvailability(p)]}${p.leadTimeWeeks ? ` · Précommande : ${p.leadTimeWeeks} semaines de fabrication` : ""}`);
    for (const d of p.description) L.push(d);
    L.push(`Matières : ${p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ")}${p.lining ? `. ${p.lining}` : ""}`);
    L.push(`Coupe : ${p.fit}`);
    L.push(`Entretien : ${p.care.join(" ")}`);
    L.push("Fabrication : fait main à Paris, dans l’atelier de la créatrice.");
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
