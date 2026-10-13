/**
 * AGENT CATALOGUE — à partir de photos et de quelques notes, rédige la fiche produit complète
 * (nom, accroche, description dans le ton de la maison, matières, entretien, coupe, textes
 * alternatifs, balises SEO) et la publie (action autonome). Sans prix, la fiche reste en brouillon.
 */
import * as z from "zod/v4";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getCollections } from "@/lib/commerce";
import { kv } from "@/lib/store";
import { RunRecorder, type AgentRun } from "../run";

export interface CatalogueInput {
  notes: string;
  name?: string;
  category?: "robe" | "body" | "top" | "jupe" | "accessoire";
  collection?: string;
  priceEuros?: number;
  editionTotal?: number;
  leadTimeWeeks?: number;
  sizes: { size: "XS" | "S" | "M" | "L" | "XL" | "TU"; quantity: number; preorder: boolean }[];
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
  title: z.string().describe("Nom de la pièce : type + prénom évocateur, ex. « Robe Odessa ». Reprendre le nom des notes s'il est donné."),
  tagline: z.string().describe("Une phrase d'accroche sensorielle, 12 à 22 mots"),
  category: z.enum(["robe", "body", "top", "jupe", "accessoire"]),
  description: z.array(z.string()).describe("2 ou 3 paragraphes courts : la matière, le tombé, la façon de la porter"),
  materials: z.array(z.object({ name: z.string(), percent: z.number() })).describe("Composition ; si inconnue, une seule ligne avec la matière principale et 100"),
  lining: z.string().nullable(),
  care: z.array(z.string()).describe("3 ou 4 consignes d'entretien adaptées aux matières"),
  fit: z.string().describe("Conseil de coupe et de taille, 1 à 2 phrases"),
  details: z.array(z.string()).describe("3 à 5 détails de façon"),
  alts: z.array(z.string()).describe("Un texte alternatif par photo, dans l'ordre des photos : pièce, matière, pose, fond ; sans « image de »"),
  seo: z.object({
    title: z.string().describe("« Nom — matière principale | Awrea Paris », 60 caractères maximum"),
    description: z.string().describe("140 à 155 caractères, image sensorielle + « fait main à Paris »"),
  }),
  tags: z.array(z.string()).describe("3 à 6 mots-clés simples"),
  missing_information: z.array(z.string()).describe("Informations manquantes à confirmer par la créatrice (vide si rien ne manque)"),
});

export async function runCatalogueAgent(input: CatalogueInput, trigger: AgentRun["trigger"] = "manuel"): Promise<AgentRun> {
  const rec = new RunRecorder("catalogue", trigger);
  try {
    const media = (await Promise.all(input.mediaIds.map((id) => kv.get<StoredMedia>(`media:${id}`)))).filter((m): m is StoredMedia => Boolean(m));
    if (!media.length) throw new Error("Aucune photo n’a été fournie.");
    const collections = await getCollections();
    const collection = input.collection ?? collections.find((c) => c.current)?.handle ?? collections[0]?.handle ?? "";

    let copy: z.infer<typeof Copy>;
    if (aiEnabled) {
      const content: BetaContentBlockParam[] = [
        ...media.map((m) => ({ type: "image" as const, source: { type: "base64" as const, media_type: m.mediaType, data: m.data } })),
        {
          type: "text",
          text: `Rédigez la fiche produit complète de cette nouvelle pièce, à partir des ${media.length} photo(s) ci-dessus et des notes de la créatrice.

Notes de la créatrice :
${input.notes || "(aucune)"}

Informations saisies :
- Nom proposé : ${input.name ?? "(à proposer)"}
- Catégorie : ${input.category ?? "(à déduire des photos)"}
- Collection : ${collections.find((c) => c.handle === collection)?.title ?? collection}
- Série : ${input.editionTotal === 1 ? "pièce unique" : input.editionTotal ? `${input.editionTotal} pièces numérotées` : "(non précisée)"}
- Tailles : ${input.sizes.map((s) => `${s.size} (${s.quantity} en stock${s.preorder ? ", précommande possible" : ""})`).join(", ")}
- Délai de fabrication en précommande : ${input.leadTimeWeeks ? `${input.leadTimeWeeks} semaines` : "(non précisé)"}`,
        },
      ];
      copy = await generateStructured({
        instructions: "Mission : agent Catalogue. Vous rédigez des fiches produit prêtes à être publiées, fidèles aux photos et aux notes. Ne décrivez que ce qui est visible ou indiqué ; mettez le reste dans missing_information.",
        content,
        schema: Copy,
        effort: "high",
      });
    } else {
      const name = input.name ?? "Pièce nouvelle";
      const cat = input.category ?? "robe";
      const mat = input.notes.match(/(dentelle|satin|jersey|soie|coton|tulle)/i)?.[1]?.toLowerCase() ?? "dentelle";
      copy = {
        title: name,
        tagline: `${{ robe: "Une robe", body: "Un body", top: "Un top", jupe: "Une jupe", accessoire: "Une pièce" }[cat]} en ${mat}, ${cat === "body" || cat === "top" ? "façonné" : "façonnée"} à la main à Paris pour révéler la lumière.`,
        category: cat,
        description: [
          `${name} est née dans l’atelier parisien de la maison. ${input.notes ? input.notes.replace(/\s+/g, " ").slice(0, 220) : `Le ${mat} y est travaillé à la main, point après point.`}`,
          "Elle se porte seule ou avec les autres pièces de la collection, du jour à la nuit, sans rien perdre de sa retenue.",
        ],
        materials: [{ name: mat.charAt(0).toUpperCase() + mat.slice(1), percent: 100 }],
        lining: null,
        care: ["Lavage à la main à l’eau froide.", "Séchage à plat.", "Repassage doux sur l’envers."],
        fit: "Coupe ajustée. Prenez votre taille habituelle ; l’atelier peut ajuster la pièce sur rendez-vous.",
        details: ["Fait main à Paris", "Certificat numéroté signé par la créatrice"],
        alts: media.map((_, i) => `${name} en ${mat}, photographie ${i + 1} sur fond studio`),
        seo: { title: `${name} — ${mat} | Awrea Paris`.slice(0, 60), description: `${name} en ${mat}, pièce de créatrice façonnée à la main à Paris en série limitée et numérotée. Une lumière discrète, une coupe juste.`.slice(0, 160) },
        tags: [mat, cat, "fait main"],
        missing_information: ["Mode démonstration : textes générés à partir d’un modèle, à relire."],
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
          edition_total: input.editionTotal ?? 5,
          lead_time_weeks: input.leadTimeWeeks,
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
      { summary: `Publication de la fiche « ${copy.title} »`, rationale: copy.missing_information.length ? `À confirmer : ${copy.missing_information.join(" ; ")}` : undefined },
    );
    return rec.finish(
      outcome.status === "done"
        ? `Fiche « ${copy.title} » ${hasPrice ? "publiée" : "créée en brouillon (prix manquant)"}${copy.missing_information.length ? ` — ${copy.missing_information.length} point(s) à confirmer` : ""}`
        : `Échec de la publication : ${outcome.message}`,
    );
  } catch (e) {
    rec.error(e);
    return rec.finish("Passage interrompu");
  }
}
