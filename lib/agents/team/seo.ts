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
import { leadTimeText, madeToOrderLabel } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { runSiteAudit, type AuditReport } from "../seo-audit";
import { RunRecorder, type AgentRun } from "../run";

export const AUDITS_KEY = "seo:audits";
export const IDEAS_KEY = "seo:ideas";

const SeoFix = z.object({
  title: z.string().describe("« Nom, matière principale | Awrea Paris », 60 caractères au plus"),
  description: z.string().describe("140 à 155 caractères, une image concrète, puis « créée sur demande par des artisans français »"),
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

const TARGET_QUERIES = ["robe dentelle noire créatrice française", "body dentelle créatrice française", "vêtement créé sur demande", "Awrea Paris", "Hypnotic Lace", "mode éthique sans stock"];

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
            instructions: "Mission : agent SEO. Vous réécrivez la balise title et la meta description d’une fiche, en français, dans le ton de la Maison. Le title suit le modèle « Nom de la pièce, matière principale | Awrea Paris ». La description donne une image concrète, puis « créée sur demande par des artisans français ». N’inventez aucune matière. Respectez strictement les longueurs.",
            content: `Pièce : ${p.title}\nAccroche : ${p.tagline}\nMatières : ${p.materials.map((m) => m.name).join(", ")}\nTitle actuel (${p.seo.title.length} car.) : ${p.seo.title}\nDescription actuelle (${p.seo.description.length} car.) : ${p.seo.description}\nRequêtes visées : ${TARGET_QUERIES.join(" ; ")}`,
            schema: SeoFix,
            effort: "low",
          })
        : {
            title: `${p.title} | Awrea Paris`.slice(0, 60),
            description: `${p.tagline} ${p.title}, créée sur demande par des artisans français.`.slice(0, 158),
          };
      await rec.act("update_product_content", { handle: p.handle, seo: { title: fix.title.slice(0, 70), description: fix.description.slice(0, 170) } }, { summary: `Balises SEO réécrites : ${p.title}`, rationale: `Title ${p.seo.title.length} car., description ${p.seo.description.length} car.` });
    }

    // 3. Journal : un article par semaine au plus
    const articles = await getArticles();
    const last = articles[0] ? new Date(articles[0].date).getTime() : 0;
    if (Date.now() - last > 7 * 24 * 60 * 60 * 1000) {
      const ideas = (await kv.get<{ title: string; angle: string; target_query: string }[]>(IDEAS_KEY)) ?? [];
      const catalogue = products.map((p) => `${p.handle} : ${p.title} (${p.materials.map((m) => m.name).join(", ") || "composition à préciser par la Maison"}). ${p.tagline} ${madeToOrderLabel(p)}.`).join("\n");
      let article: z.infer<typeof ArticleOut>;
      if (aiEnabled) {
        article = await generateStructured({
          instructions: `Mission : agent SEO et éditorial. Vous écrivez un article du Journal d’Awrea Paris, de 700 à 1 000 mots, utile et sincère. Il parle de la création sur demande, des artisans français, des matières ou de conseils, et répond naturellement à l’une des requêtes visées, sans empiler les mots-clés. Écrivez comme la créatrice : des phrases courtes, la matière, le geste, le temps passé. Pas d’intertitre coupé par deux-points. N’employez que les faits fournis : aucune composition, aucune heure de travail, aucun lieu de fabrication inventés ; jamais de série ni de numéro d’édition. Proposez aussi trois idées pour les semaines suivantes.`,
          content: `Articles déjà publiés : ${articles.map((a) => a.title).join(" ; ")}\nIdées en réserve : ${ideas.map((i) => `${i.title} (${i.target_query})`).join(" ; ") || "aucune"}\nRequêtes visées : ${TARGET_QUERIES.join(" ; ")}\nPièces (handle : nom, matières, accroche) :\n${catalogue}`,
          schema: ArticleOut,
          effort: "high",
          maxTokens: 24000,
        });
      } else {
        const p = products.find((x) => !articles.some((a) => a.title.includes(x.title))) ?? products[0];
        article = {
          title: `${p.title}, une pièce créée sur demande`,
          excerpt: "Cette pièce n’existe pas avant votre commande. Des artisans français la confectionnent ensuite, dans votre taille.",
          category: "Coulisses",
          cover_handle: p.handle,
          sections: [
            { heading: null, paragraphs: [`${p.tagline}`, `${p.description[0] ?? ""}`.trim() || `${p.title} appartient à la collection de la Maison.`] },
            { heading: "Créée sur demande", paragraphs: [`Aucune pièce de la Maison n’est produite d’avance. Celle-ci est créée sur demande par des artisans français, en ${leadTimeText(p.leadTime)}. Il n’y a pas de stock, seulement des pièces pensées pour la personne qui les porte.`] },
            { heading: "Le temps de la confection", paragraphs: ["Votre commande passe par cinq étapes, de la commande reçue à la livraison. Vous les suivez dans votre compte, ou sur la page de suivi avec votre numéro de commande et votre adresse e-mail."] },
          ],
          seo: { title: `${p.title}, sur demande | Awrea Paris`.slice(0, 60), description: `${p.title} : ${p.tagline.charAt(0).toLowerCase()}${p.tagline.slice(1)} Une pièce créée sur demande par des artisans français.`.slice(0, 158) },
          next_ideas: [
            { title: "Comment choisir sa robe en dentelle noire", angle: "Guide de coupe et de taille", target_query: "robe dentelle noire créatrice française" },
            { title: "Trois façons de porter un body en dentelle", angle: "Guide de port", target_query: "body dentelle créatrice française" },
            { title: "Pourquoi chaque pièce est créée sur demande", angle: "Le sens d’une Maison sans stock", target_query: "mode éthique sans stock" },
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
      current ? `Collection en cours : ${current.title} (${current.season}). ${current.lead}` : "",
      ...products.slice(0, 8).map((p) => `${p.title} : ${formatPrice(p.price)}, ${madeToOrderLabel(p)}.`),
    ].filter(Boolean);
    await rec.act("update_ai_visibility", { notes: notes.slice(0, 12) }, { summary: "Mise à jour de llms.txt", rationale: "Informations à jour pour les moteurs de réponse IA" });

    const high = report.issues.filter((i) => i.severity === "haute").length;
    return rec.finish(`Audit de ${report.pages} pages, score ${report.score}/100. ${report.issues.length} point(s), dont ${high} prioritaire(s) ; ${toFix.length} fiche(s) corrigée(s)`);
  } catch (e) {
    rec.error(e);
    return rec.finish(report ? `Audit de ${report.pages} pages réalisé, corrections interrompues` : "Passage interrompu");
  }
}
