/**
 * AGENT CONTENU — à partir des nouvelles pièces et de la collection en cours, prépare
 * trois posts Instagram (légende, hashtags, visuel conseillé) et une newsletter,
 * dans la direction artistique de la maison. L'envoi de la newsletter à toute la liste
 * est une proposition à valider en un clic.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts, getCurrentCollection } from "@/lib/commerce";
import { madeToOrderLabel } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { RunRecorder, type AgentRun } from "../run";

const Out = z.object({
  instagram: z
    .array(
      z.object({
        title: z.string().describe("Titre interne du post"),
        caption: z.string().describe("Trois à six lignes : une phrase sensible, puis une information concrète (pièce, matière, édition). Les mots-dièse vont dans leur propre champ, pas dans la légende."),
        hashtags: z.array(z.string()).describe("5 à 8 hashtags sobres, sans #, en minuscules"),
        image_handle: z.string().describe("handle de la pièce dont la photo illustre le post"),
      }),
    )
    .describe("Exactement 3 posts, angles différents (pièce, savoir-faire, manifeste)"),
  newsletter: z.object({
    subject: z.string().describe("6 mots maximum"),
    preheader: z.string(),
    paragraphs: z.array(z.string()).describe("Une lettre courte de la créatrice : 3 à 4 paragraphes"),
    cta_label: z.string(),
    cta_handle: z.string().describe("handle de la pièce mise en avant"),
  }),
});

export async function runContenuAgent(trigger: AgentRun["trigger"] = "cron"): Promise<AgentRun> {
  const rec = new RunRecorder("contenu", trigger);
  try {
    const [products, collection] = await Promise.all([getAllProducts(), getCurrentCollection()]);
    const recent = [...products].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6);
    const recentDrafts = (await kv.list<{ title: string }>("content:drafts", 12)).map((d) => d.title);

    let out: z.infer<typeof Out>;
    if (aiEnabled) {
      out = await generateStructured({
        instructions:
          "Mission : agent Contenu. Vous préparez trois légendes Instagram et une lettre, prêtes à publier. La Maison photographie en noir et blanc. La dentelle laisse passer la lumière, le tissu tombe, rien n’est démonstratif. Une légende parle comme la créatrice sous ses photos, en peu de mots. La lettre vouvoie. Aucun emoji, aucune urgence. Changez d’angle d’un contenu à l’autre et ne reprenez pas les contenus récents.",
        content: `Collection en cours : ${collection ? `${collection.title} (${collection.season}). ${collection.lead}` : "aucune"}
Pièces récentes :
${recent.map((p) => `${p.handle} : ${p.title}. ${p.tagline} ${formatPrice(p.price)}, ${madeToOrderLabel(p)}.`).join("\n")}
Contenus déjà préparés récemment : ${recentDrafts.join(" ; ") || "aucun"}`,
        schema: Out,
        effort: "medium",
      });
    } else {
      const [a, b, c] = recent;
      out = {
        instagram: [
          { title: `${a.title}, la pièce`, caption: `${a.tagline}\n\n${a.title}, ${madeToOrderLabel(a)} par des artisans français.\n\nÀ voir sur awreaparis.com.`, hashtags: ["awreaparis", "dentellenoire", "creatricefrancaise", "surdemande", "consommerplusjuste"], image_handle: a.handle },
          { title: "Le geste de l’atelier", caption: `Une dentelle se coupe motif par motif, pour que les fleurs ne soient jamais tranchées au mauvais endroit.\n\nC’est lent. C’est voulu.\n\nL’atelier, à Paris.`, hashtags: ["awreaparis", "savoirfaire", "atelierparis", "faitmain", "dentelle"], image_handle: (b ?? a).handle },
          { title: "Manifeste", caption: `La couleur n’est pas au rendez-vous mais la lumière de la dorure suffit à révéler l’essentiel.\n\nConsommer plus juste : peu de pièces, numérotées, au prix juste.`, hashtags: ["awreaparis", "consommerplusjuste", "modeethique", "creatriceparisienne", "slowfashion"], image_handle: (c ?? a).handle },
        ],
        newsletter: {
          subject: collection ? `${collection.title}, à l’atelier` : "Nouvelles de l’atelier",
          preheader: "Les nouvelles pièces de l’atelier, cousues à la main à Paris.",
          paragraphs: [
            "Chère vous,",
            collection ? `${collection.title} est désormais entièrement sortie de l’atelier. ${collection.lead}` : "De nouvelles pièces viennent de sortir de l’atelier.",
            `Parmi elles, ${a.title} : ${a.tagline.charAt(0).toLowerCase()}${a.tagline.slice(1)}`,
            "L’atelier vous reçoit aussi sur rendez-vous pour un essayage, à Paris.",
          ],
          cta_label: "Voir la pièce",
          cta_handle: a.handle,
        },
      };
    }

    for (const post of out.instagram.slice(0, 3)) {
      const p = products.find((x) => x.handle === post.image_handle) ?? recent[0];
      await rec.act(
        "save_content_draft",
        { kind: "instagram", title: post.title, body: post.caption, hashtags: post.hashtags.map((h) => h.replace(/^#/, "")), image: p.images[0].src },
        { summary: `Post Instagram préparé : ${post.title}` },
      );
    }
    const n = out.newsletter;
    await rec.act("save_content_draft", { kind: "newsletter", title: n.subject, subject: n.subject, preheader: n.preheader, body: n.paragraphs.join("\n\n") }, { summary: `Newsletter préparée : ${n.subject}` });
    await rec.act(
      "send_newsletter_all",
      { subject: n.subject, preheader: n.preheader, paragraphs: n.paragraphs, cta: { label: n.cta_label, href: `/boutique/${n.cta_handle}` } },
      { summary: `Envoyer la newsletter « ${n.subject} » à toute la liste`, rationale: "Nouvelles pièces à présenter aux abonnées" },
    );
    return rec.finish("3 posts Instagram et 1 newsletter préparés. L’envoi de la newsletter attend votre validation.");
  } catch (e) {
    rec.error(e);
    return rec.finish("Passage interrompu");
  }
}
