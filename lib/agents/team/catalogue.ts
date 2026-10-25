/**
 * AGENT CATALOGUE — il connaît les pièces de la Maison (aujourd'hui les sept pièces de la collection
 * Hypnotic Lace) et fait deux choses :
 *  1. le bilan du catalogue (runCatalogueReview) : photos provisoires (images générées en attendant
 *     les shootings), prix et délais de fabrication encore provisoires, informations que la Maison
 *     doit donner (composition, entretien, taille du mannequin), jamais inventées ;
 *  2. une nouvelle fiche à partir de photos et de quelques notes (runCatalogueAgent) : nom, accroche,
 *     description dans le ton de la Maison, coupe, textes alternatifs, balises SEO, publiée seule.
 *     Sans prix, la fiche reste en brouillon. Composition et entretien ne sont repris que s'ils sont
 *     dans les notes ; sinon un repère « [À COMPLÉTER : …] ».
 */
import * as z from "zod/v4";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { leadTimeText } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { logAction } from "../log";
import { RunRecorder, type AgentRun } from "../run";
import { catalogueReview } from "../confection";

export interface CatalogueInput {
  notes: string;
  name?: string;
  category?: "robe" | "body" | "top" | "jupe" | "accessoire";
  collection?: string;
  priceEuros?: number;
  priceProvisional?: boolean;
  /** délai de fabrication en semaines : chaque pièce est créée sur demande, sans stock */
  leadTime?: { min: number; max: number };
  leadTimeProvisional?: boolean;
  /** tailles proposées (toutes se commandent) */
  sizes: ("XS" | "S" | "M" | "L" | "XL" | "TU")[];
  /** identifiants de médias déposés dans le tableau de bord (/api/media/<id>) */
  mediaIds: string[];
}

export interface StoredMedia {
  id: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string; // base64
  width: number;
  height: number;
  name: string;
}

const Copy = z.object({
  title: z.string().describe("Nom de la pièce avec son article, comme les pièces de la Maison : « La robe Odessa », « Le body Aura », « Le top Kira ». Un prénom qui n’est pas déjà pris. Reprendre le nom des notes s’il est donné."),
  tagline: z.string().describe("Une phrase d’accroche sur la matière ou le geste, 12 à 22 mots"),
  category: z.enum(["robe", "body", "top", "jupe", "accessoire"]),
  description: z.array(z.string()).describe("2 ou 3 paragraphes courts : la matière, le tombé, la façon de la porter"),
  materials: z.array(z.object({ name: z.string(), percent: z.number() })).describe("Composition exacte, seulement si les notes la donnent ; sinon une liste vide, et la composition va dans missing_information"),
  lining: z.string().nullable(),
  care: z.array(z.string()).describe("Consignes d’entretien, seulement si les notes les donnent ; sinon une seule ligne « [À COMPLÉTER : conseils d’entretien] »"),
  fit: z.string().describe("Conseil de coupe et de taille, 1 à 2 phrases"),
  details: z.array(z.string()).describe("3 à 5 détails de façon"),
  alts: z.array(z.string()).describe("Un texte alternatif par photo, dans l’ordre des photos : pièce, matière, pose, fond ; sans « image de »"),
  seo: z.object({
    title: z.string().describe("« Nom, matière principale | Awrea Paris », 60 caractères au plus"),
    description: z.string().describe("140 à 155 caractères, une image concrète, puis « créée sur demande par des artisans français »"),
  }),
  tags: z.array(z.string()).describe("3 à 6 mots-clés simples"),
  missing_information: z.array(z.string()).describe("Informations manquantes à confirmer par la créatrice (vide si rien ne manque)"),
});

export async function runCatalogueAgent(input: CatalogueInput, trigger: AgentRun["trigger"] = "manuel"): Promise<AgentRun> {
  const rec = new RunRecorder("catalogue", trigger);
  try {
    const media = (await Promise.all(input.mediaIds.map((id) => kv.get<StoredMedia>(`media:${id}`)))).filter((m): m is StoredMedia => Boolean(m));
    if (!media.length) throw new Error("Aucune photo n’a été fournie.");
    const [collections, existing] = await Promise.all([getCollections(), getAllProducts()]);
    const collection = input.collection ?? collections.find((c) => c.current)?.handle ?? collections[0]?.handle ?? "";

    let copy: z.infer<typeof Copy>;
    if (aiEnabled) {
      const content: BetaContentBlockParam[] = [
        ...media.map((m) => ({ type: "image" as const, source: { type: "base64" as const, media_type: m.mediaType, data: m.data } })),
        {
          type: "text",
          text: `Rédigez la fiche complète de cette nouvelle pièce, d’après les ${media.length} photo(s) ci-dessus et les notes de la créatrice.

Notes de la créatrice :
${input.notes || "(aucune)"}

Informations saisies par la créatrice.
Nom proposé : ${input.name ?? "(à proposer)"}
Catégorie : ${input.category ?? "(à déduire des photos)"}
Collection : ${collections.find((c) => c.handle === collection)?.title ?? collection}
Fabrication : sur demande, sans stock, par des artisans français
Tailles proposées : ${input.sizes.join(", ")}
Délai de fabrication : ${input.leadTime ? `${input.leadTime.min} à ${input.leadTime.max} semaines` : "(non précisé)"}
Pièces déjà au catalogue, dont le nom ne doit pas être repris : ${existing.map((p) => `${p.title} (${p.category})`).join(", ") || "aucune"}`,
        },
      ];
      copy = await generateStructured({
        instructions: "Mission : agent Catalogue. Vous rédigez la fiche d’une pièce, prête à paraître. Décrivez seulement ce que montrent les photos et ce que disent les notes ; le reste va dans missing_information. Une composition, un pourcentage, un conseil d’entretien ou une mesure qui ne sont pas dans les notes ne s’inventent jamais. Chaque pièce est créée sur demande, sans stock, par des artisans français : ne parlez ni de série, ni de numéro d’édition, ni de quantité. Parlez de la matière, du tombé, de la façon de porter la pièce, en phrases courtes. On dit « pièce », jamais « article » ni « produit ». Le ton juste, à ne pas recopier : « La dentelle se pose sur la peau sans la serrer. Le satin, lui, tombe droit. »",
        content,
        schema: Copy,
        effort: "high",
      });
    } else {
      const name = input.name ?? "La pièce nouvelle";
      const cat = input.category ?? "robe";
      const mat = input.notes.match(/(dentelle|satin|jersey|soie|coton|tulle)/i)?.[1]?.toLowerCase() ?? null;
      const kind = { robe: "Une robe", body: "Un body", top: "Un top", jupe: "Une jupe", accessoire: "Une pièce" }[cat];
      copy = {
        title: name,
        tagline: `${kind}${mat ? ` en ${mat}` : ""}, une pièce créée sur demande pour vous par des artisans français.`,
        category: cat,
        description: [
          input.notes ? input.notes.replace(/\s+/g, " ").slice(0, 240) : "Une pièce dessinée par la créatrice d’Awrea Paris.",
          "Cette pièce est confectionnée après votre commande, dans votre taille, par des artisans français.",
        ],
        // composition et entretien : jamais inventés, la créatrice les donne
        materials: [],
        lining: null,
        care: ["[À COMPLÉTER : conseils d’entretien]"],
        fit: "Pour choisir votre taille, appuyez-vous sur le guide des tailles. La Maison vous conseille volontiers avant la commande.",
        details: ["Créée sur demande par des artisans français"],
        alts: media.map((_, i) => `${name}${mat ? ` en ${mat}` : ""}, photographie ${i + 1}`),
        seo: { title: `${name}${mat ? `, ${mat}` : ""} | Awrea Paris`.slice(0, 60), description: `${name}${mat ? ` en ${mat}` : ""}, une pièce dessinée par la créatrice d’Awrea Paris et créée sur demande par des artisans français.`.slice(0, 160) },
        tags: [mat, cat, "sur demande"].filter((t): t is string => Boolean(t)),
        missing_information: ["Mode démonstration : textes générés à partir d’un modèle, à relire.", "Composition des matières", "Conseils d’entretien"],
      };
    }

    const hasPrice = typeof input.priceEuros === "number" && input.priceEuros > 0;
    const outcome = await rec.act(
      "publish_product",
      {
        product: {
          title: copy.title,
          handle: copy.title,
          tagline: copy.tagline,
          category: input.category ?? copy.category,
          collection,
          price: hasPrice ? Math.round(input.priceEuros! * 100) : 100,
          price_provisional: input.priceProvisional ?? false,
          lead_time: input.leadTime,
          lead_time_provisional: input.leadTimeProvisional ?? !input.leadTime,
          sizes: input.sizes,
          images: media.map((m, i) => ({ src: `/api/media/${m.id}`, alt: copy.alts[i] ?? copy.alts[0] ?? copy.title, width: m.width, height: m.height })),
          description: copy.description,
          materials: copy.materials,
          lining: copy.lining ?? undefined,
          care: copy.care,
          fit: copy.fit,
          model: "",
          details: copy.details,
          seo: copy.seo,
          tags: copy.tags,
          status: hasPrice ? "active" : "draft",
        },
      },
      { summary: `Publication de la fiche « ${copy.title} »`, rationale: copy.missing_information.length ? `À confirmer : ${copy.missing_information.join(" ; ")}` : undefined },
    );
    return rec.finish(
      outcome.status === "done"
        ? `Fiche « ${copy.title} » ${hasPrice ? "publiée" : "créée en brouillon (prix manquant)"}${copy.missing_information.length ? `, ${copy.missing_information.length} point(s) à confirmer` : ""}`
        : `Échec de la publication : ${outcome.message}`,
    );
  } catch (e) {
    rec.error(e);
    return rec.finish("Passage interrompu");
  }
}

/**
 * Bilan du catalogue : ce qui reste provisoire ou à compléter, pièce par pièce, consigné dans le
 * journal. Rien n'est modifié : la créatrice confirme les prix et les délais dans les Validations
 * (proposés par l'agent Commandes et confection) ou dans l'onglet Catalogue.
 */
export async function runCatalogueReview(trigger: AgentRun["trigger"] = "manuel"): Promise<AgentRun> {
  const rec = new RunRecorder("catalogue", trigger);
  try {
    const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
    const review = catalogueReview(products);
    for (const p of review.pieces) {
      const notes = [
        p.provisionalPhotos ? `${p.provisionalPhotos} photo${p.provisionalPhotos > 1 ? "s" : ""} provisoire${p.provisionalPhotos > 1 ? "s" : ""}` : null,
        p.priceProvisional ? `prix provisoire (${formatPrice(p.price)})` : null,
        p.leadTimeProvisional ? `délai provisoire (${leadTimeText(p.leadTime)})` : null,
        ...p.toComplete.map((t) => `${t} à compléter`),
      ].filter(Boolean);
      if (!notes.length) continue;
      await logAction({ agent: "catalogue", kind: "bilan", status: "info", summary: `${p.title} : ${notes.join(", ")}`, target: { type: "product", id: p.handle, label: p.title, href: "atelier:/catalogue" } });
    }
    const byCollection = collections
      .map((c) => ({ title: c.title, n: products.filter((p) => p.collection === c.handle).length }))
      .filter((c) => c.n > 0)
      .map((c) => `${c.n} pièce${c.n > 1 ? "s" : ""} dans ${c.title}`);
    const n = products.length;
    return rec.finish(
      `${byCollection.join(", ") || `${n} pièce${n > 1 ? "s" : ""}`}. Photos provisoires : ${review.photos} pièce${review.photos > 1 ? "s" : ""}. Prix provisoires : ${review.prices}. Délais provisoires : ${review.leadTimes}. Fiches à compléter : ${review.incomplete}.`,
    );
  } catch (e) {
    rec.error(e);
    return rec.finish("Bilan interrompu");
  }
}
