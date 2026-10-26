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
import { leadTimeText, madeToOrderLabel } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { RunRecorder, type AgentRun } from "../run";

const Out = z.object({
  instagram: z
    .array(
      z.object({
        title: z.string().describe("Titre interne du post"),
        caption: z.string().describe("Trois à six lignes : une phrase sensible, puis une information concrète (pièce, matière, création sur demande et son délai). Les mots-dièse vont dans leur propre champ, pas dans la légende."),
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
          "Mission : agent Contenu. Vous préparez trois légendes Instagram et une lettre, prêtes à publier. Chaque pièce est créée sur demande, sans stock, par des artisans français : jamais de série, de numéro, de quantité ni d’urgence. La dorure est une matière de certaines pièces. N’inventez ni composition ni geste de fabrication. La dentelle laisse passer la lumière, le tissu tombe, rien n’est démonstratif. Une légende parle comme la créatrice sous ses photos, en peu de mots. La lettre vouvoie. Aucun emoji, aucune urgence. Changez d’angle d’un contenu à l’autre et ne reprenez pas les contenus récents.",
        content: `Collection en cours : ${collection ? `${collection.title}${collection.season ? ` (${collection.season})` : ""}. ${collection.lead}` : "aucune"}
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
          { title: `${a.title}, la pièce`, caption: `${a.tagline}\n\n${a.title}. Une pièce créée sur demande par des artisans français, en ${leadTimeText(a.leadTime)}.\n\nÀ voir sur awreaparis.com.`, hashtags: ["awreaparis", "dentellenoire", "creatricefrancaise", "surdemande", "consommerplusjuste"], image_handle: a.handle },
          { title: "Créée sur demande", caption: `Rien n’attend sur une étagère.\n\nChaque pièce est créée sur demande, entre les mains d’artisans français, dans la taille de celle qui la portera.`, hashtags: ["awreaparis", "surdemande", "artisansfrancais", "dentelle", "sansstock"], image_handle: (b ?? a).handle },
          { title: "Manifeste", caption: `La couleur n’est pas au rendez-vous mais la lumière de la dorure suffit à révéler l’essentiel.\n\nConsommer plus juste : produire seulement ce qui est désiré.`, hashtags: ["awreaparis", "consommerplusjuste", "modeethique", "creatricefrancaise", "dorure"], image_handle: (c ?? a).handle },
        ],
        newsletter: {
          subject: collection ? `${collection.title}, la collection` : "Nouvelles de la Maison",
          preheader: "Des pièces créées sur demande par des artisans français.",
          paragraphs: [
            "Chère vous,",
            collection ? `${collection.title} vous attend sur le site. ${collection.lead}` : "De nouvelles pièces vous attendent sur le site.",
            `Parmi elles, ${a.title} : ${a.tagline.charAt(0).toLowerCase()}${a.tagline.slice(1)}`,
            `Chaque pièce est créée sur demande, dans votre taille, par des artisans français. Comptez ${leadTimeText(a.leadTime)} pour ${a.title.charAt(0).toLowerCase()}${a.title.slice(1)}.`,
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
