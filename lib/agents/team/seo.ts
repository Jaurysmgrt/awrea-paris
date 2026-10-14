/**
 * AGENT SEO ET VISIBILITÉ IA — chaque semaine :
 * 1. audit technique du site (pages lentes, balises manquantes, liens cassés, données structurées) ;
 * 2. corrige seul les balises SEO trop longues ou trop courtes des fiches produit ;
 * 3. publie un article du Journal si le dernier date de plus de 7 jours, et garde 3 idées d'avance ;
 * 4. met à jour les notes d'actualité de llms.txt (moteurs de réponse IA).
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts, getCurrentCollection } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";
import { editionInfo, productAvailability } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { runSiteAudit, type AuditReport } from "../seo-audit";
import { RunRecorder, type AgentRun } from "../run";

export const AUDITS_KEY = "seo:audits";
export const IDEAS_KEY = "seo:ideas";

const SeoFix = z.object({
  title: z.string().describe("« Nom — matière principale | Awrea Paris », 60 caractères maximum"),
  description: z.string().describe("140 à 155 caractères, une image sensorielle + « fait main à Paris »"),
});

const ArticleOut = z.object({
  title: z.string().describe("Titre éditorial, 50 à 90 caractères"),
  excerpt: z.string().describe("Chapeau de 1 à 2 phrases"),
  category: z.enum(["Moodboard", "Coulisses", "Savoir-faire", "Lettre"]),
  cover_handle: z.string().describe("handle de la pièce dont la première photo sert de couverture"),
  sections: z.array(z.object({ heading: z.string().nullable(), paragraphs: z.array(z.string()) })).describe("3 à 5 sections, 2 à 3 paragraphes chacune"),
  seo: z.object({ title: z.string().describe("60 caractères maximum"), description: z.string().describe("140 à 155 caractères") }),
  next_ideas: z.array(z.object({ title: z.string(), angle: z.string(), target_query: z.string() })).describe("3 idées d’articles pour les semaines suivantes, chacune visant une requête de recherche"),
});

const TARGET_QUERIES = ["robe dentelle noire fait main Paris", "body dentelle créatrice française", "pièce unique mode femme Paris", "Awrea Paris", "entretien dentelle", "mode éthique Paris créatrice"];

export async function runSeoAgent(origin: string, trigger: AgentRun["trigger"] = "cron"): Promise<AgentRun> {
  const rec = new RunRecorder("seo", trigger);
  let report: AuditReport | null = null;
  try {
    // 1. Audit
    report = await runSiteAudit(origin);
    await kv.push(AUDITS_KEY, report, 52);

    // 2. Balises SEO des fiches produit
    const products = await getAllProducts();
    const toFix = products.filter((p) => p.seo.title.length > 62 || p.seo.title.length < 25 || p.seo.description.length < 120 || p.seo.description.length > 165).slice(0, 6);
    for (const p of toFix) {
      const fix = aiEnabled
        ? await generateStructured({
            instructions: "Mission : agent SEO. Réécrivez la balise title et la meta description d’une fiche produit, en français, dans le ton de la maison, en respectant strictement les longueurs.",
            content: `Pièce : ${p.title}\nAccroche : ${p.tagline}\nMatières : ${p.materials.map((m) => m.name).join(", ")}\nTitle actuel (${p.seo.title.length} car.) : ${p.seo.title}\nDescription actuelle (${p.seo.description.length} car.) : ${p.seo.description}\nRequêtes visées : ${TARGET_QUERIES.join(" ; ")}`,
            schema: SeoFix,
            effort: "low",
          })
        : {
            title: `${p.title} — ${p.materials[0]?.name.split(" ")[0].toLowerCase() ?? "création"} | Awrea Paris`.slice(0, 60),
            description: `${p.tagline} ${p.title}, pièce de créatrice faite main à Paris en série numérotée.`.slice(0, 158),
          };
      await rec.act("update_product_content", { handle: p.handle, seo: { title: fix.title.slice(0, 70), description: fix.description.slice(0, 170) } }, { summary: `Balises SEO réécrites : ${p.title}`, rationale: `Title ${p.seo.title.length} car., description ${p.seo.description.length} car.` });
    }

    // 3. Journal : un article par semaine au plus
    const articles = await getArticles();
    const last = articles[0] ? new Date(articles[0].date).getTime() : 0;
    if (Date.now() - last > 7 * 24 * 60 * 60 * 1000) {
      const ideas = (await kv.get<{ title: string; angle: string; target_query: string }[]>(IDEAS_KEY)) ?? [];
      const catalogue = products.map((p) => `${p.handle} : ${p.title} — ${p.tagline} (${p.materials.map((m) => m.name).join(", ")})`).join("\n");
      let article: z.infer<typeof ArticleOut>;
      if (aiEnabled) {
        article = await generateStructured({
          instructions: `Mission : agent SEO et éditorial. Écrivez un article du Journal d’Awrea Paris (700 à 1 000 mots) utile et sincère — savoir-faire, coulisses, matières ou conseils —, qui répond naturellement à une requête de recherche visée, sans bourrage de mots-clés. Ne mentionnez que des faits fournis. Proposez aussi trois idées pour les semaines suivantes.`,
          content: `Articles déjà publiés : ${articles.map((a) => a.title).join(" ; ")}\nIdées en réserve : ${ideas.map((i) => `${i.title} (${i.target_query})`).join(" ; ") || "aucune"}\nRequêtes visées : ${TARGET_QUERIES.join(" ; ")}\nPièces (handle : description) :\n${catalogue}`,
          schema: ArticleOut,
          effort: "high",
          maxTokens: 24000,
        });
      } else {
        const p = products.find((x) => !articles.some((a) => a.title.includes(x.title))) ?? products[0];
        article = {
          title: `Dans l’atelier : ${p.title}, de l’esquisse au dernier point`,
          excerpt: `De la première esquisse au dernier point, l’histoire d’une pièce numérotée, faite main à Paris.`,
          category: "Coulisses",
          cover_handle: p.handle,
          sections: [
            { heading: null, paragraphs: [`${p.title} est née d’une image notée dans le carnet de la créatrice. ${p.tagline}`, "Comme chaque pièce de la maison, elle a été coupée, assemblée et finie à la main, à Paris, puis numérotée."] },
            { heading: "La matière d’abord", paragraphs: [`${p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ")} : la matière décide du tombé avant que le patron ne prenne forme. ${p.description[0] ?? ""}`] },
            { heading: "Une série courte", paragraphs: [`${editionInfo(p).unique ? "C’est une pièce unique" : `La série compte ${editionInfo(p).total} pièces`} : lorsqu’elle est complète, elle ne revient pas à l’identique. Consommer plus juste commence là.`] },
          ],
          seo: { title: `Coulisses : ${p.title} | Awrea Paris`.slice(0, 60), description: `L’histoire de ${p.title}, pièce numérotée faite main à Paris par la créatrice d’Awrea Paris : matière, coupe et savoir-faire.`.slice(0, 158) },
          next_ideas: [
            { title: "Comment choisir sa robe en dentelle noire", angle: "Guide de coupe et de taille", target_query: "robe dentelle noire fait main Paris" },
            { title: "Le body, pièce maîtresse d’une garde-robe sobre", angle: "Styliser un body de trois façons", target_query: "body dentelle créatrice française" },
            { title: "Pourquoi nous numérotons nos pièces", angle: "Le sens des séries courtes", target_query: "pièce unique mode femme Paris" },
          ],
        };
      }
      const cover = products.find((x) => x.handle === article.cover_handle) ?? products[0];
      await rec.act(
        "publish_article",
        {
          article: {
            title: article.title,
            excerpt: article.excerpt,
            category: article.category,
            cover: cover.images[0],
            sections: article.sections.map((s) => ({ heading: s.heading ?? undefined, paragraphs: s.paragraphs })),
            seo: { title: article.seo.title.slice(0, 70), description: article.seo.description.slice(0, 170) },
          },
        },
        { summary: `Article du Journal : « ${article.title} »`, rationale: "Publication hebdomadaire du Journal (référencement naturel et moteurs IA)" },
      );
      await kv.set(IDEAS_KEY, article.next_ideas);
    }

    // 4. Visibilité IA : notes d'actualité reprises dans llms.txt
    const current = await getCurrentCollection();
    const notes = [
      current ? `Collection en cours : ${current.title} (${current.season}) — ${current.lead}` : "",
      ...products.slice(0, 8).map((p) => `${p.title} : ${formatPrice(p.price)}, ${editionInfo(p).unique ? "pièce unique" : `série de ${editionInfo(p).total}`}, ${productAvailability(p) === "available" ? "disponible" : productAvailability(p) === "preorder" ? "sur commande" : "épuisée"}.`),
    ].filter(Boolean);
    await rec.act("update_ai_visibility", { notes: notes.slice(0, 12) }, { summary: "Mise à jour de llms.txt", rationale: "Informations à jour pour les moteurs de réponse IA" });

    const high = report.issues.filter((i) => i.severity === "haute").length;
    return rec.finish(`Audit de ${report.pages} pages — score ${report.score}/100, ${report.issues.length} point(s) dont ${high} prioritaire(s) ; ${toFix.length} fiche(s) corrigée(s)`);
  } catch (e) {
    rec.error(e);
    return rec.finish(report ? `Audit de ${report.pages} pages réalisé, corrections interrompues` : "Passage interrompu");
  }
}
