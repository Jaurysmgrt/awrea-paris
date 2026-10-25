/**
 * Contexte de marque partagé par l'assistante et les agents, mis en cache côté API (prompt
 * caching) : la référence de ton (content/brand/voice.md), les faits de la Maison qui font foi
 * (lib/ai/maison.ts : création sur demande, pièces, délais, étapes, conditions générales de vente)
 * et la FAQ (document de contenu « faq », tel que publié).
 *
 * Ce bloc est STABLE : aucune date, aucun identifiant de requête. Il ne change qu'avec le catalogue,
 * la collection, la FAQ ou les réglages ; il est reconstruit au plus toutes les cinq minutes. Le
 * contenu variable (date du jour, page consultée, cliente connectée) va dans les messages, après le cache.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { identity } from "@/content/brand/identity";
import faqStatic from "@/content/site/fr/faq.json";
import { faqGroups, faqVars, type FaqDoc } from "@/content/fr/faq";
import { getAllProducts, getCurrentCollection } from "@/lib/commerce";
import type { Product } from "@/lib/commerce/types";
import { readDoc } from "@/lib/edition/store";
import { maisonFacts } from "./maison";

let voiceCache: string | null = null;

export function brandVoice(): string {
  if (voiceCache) return voiceCache;
  try {
    voiceCache = readFileSync(path.join(process.cwd(), "content/brand/voice.md"), "utf8");
  } catch {
    voiceCache = `Référence de ton d’${identity.name}, version courte. ${identity.description} Manifeste : ${identity.manifesto} Des phrases courtes et concrètes, le vouvoiement. Aucun tiret, aucun point d’exclamation, aucun emoji.`;
  }
  return voiceCache;
}

/** FAQ publiée (éditeur Édition), à défaut celle du dépôt. */
async function faqDoc(): Promise<Pick<FaqDoc, "groupes">> {
  try {
    const d = (await readDoc("faq", "fr")) as Partial<FaqDoc> | null;
    if (d && Array.isArray(d.groupes)) return d as Pick<FaqDoc, "groupes">;
  } catch {
    /* stockage indisponible : la FAQ du dépôt */
  }
  return faqStatic;
}

/** Questions et réponses, repères remplis, sans lien ni repère « à compléter ». */
export async function faqText(products: Product[] = []): Promise<string> {
  const groups = faqGroups(await faqDoc(), faqVars(products), { withoutToComplete: true });
  return groups.map((g) => `## ${g.title}\n${g.items.map((i) => `Q : ${i.q}\nR : ${i.a}`).join("\n")}`).join("\n\n");
}

const TTL = 5 * 60 * 1000;
let blockCache: { at: number; text: string } | null = null;

/** Bloc système complet (stable) : à marquer `cache_control` dans les requêtes. */
export async function brandSystemBlock(): Promise<string> {
  if (blockCache && Date.now() - blockCache.at < TTL) return blockCache.text;
  const [products, collection] = await Promise.all([getAllProducts().catch(() => [] as Product[]), getCurrentCollection().catch(() => null)]);
  const text = `<reference_de_ton>
${brandVoice()}
</reference_de_ton>

<faits_qui_font_foi>
Ces faits sont à jour et font foi. Si la référence de ton dit autre chose sur la fabrication, les séries, les numéros, le stock ou les délais, suivez ces faits.

${maisonFacts(products, collection)}
</faits_qui_font_foi>

<faq>
${await faqText(products)}
</faq>`;
  blockCache = { at: Date.now(), text };
  return text;
}
