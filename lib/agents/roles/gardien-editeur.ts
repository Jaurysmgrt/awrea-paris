/**
 * Gardien de l'éditeur : chaque matin, il regarde ce qui attend dans l'éditeur visuel. Brouillons
 * oubliés, publications programmées du jour, textes encore entre crochets sur une page en ligne,
 * points relevés par le contrôle d'écriture dans les textes publiés.
 * Ce qu'il fait seul (autonomie « Corriger le site », lib/agents/autonomie.ts, coupable dans les
 * Réglages) : sur le site en ligne, la typographie et la description d'une photo de pièce laissée
 * vide (lib/agents/corrections.ts), jamais sur une page qui a un brouillon, jamais un texte
 * officiel. Chaque correction est une version de la page, annulable dans son historique. Le reste
 * (une formulation, un texte entre crochets), il le signale.
 */
import { listDocuments } from "@/lib/edition/documents";
import { draftOf, publishedDoc, scheduled } from "@/lib/edition/store";
import { todos } from "@/lib/edition/blocks";
import { LOCALES } from "@/lib/edition/config";
import { scanTexts } from "@/lib/writing/agents";
import { editionStorage } from "@/lib/edition/config";
import { getAllProducts } from "@/lib/commerce";
import { perform } from "@/lib/agents/perform";
import { annoncer } from "@/lib/agents/progress";
import { corrigerContenu } from "@/lib/agents/corrections";
import type { RoleOutcome, Finding } from "./types";

const DAY = 86_400_000;

export async function runGardienEditeur(now = new Date()): Promise<RoleOutcome> {
  const docs = await listDocuments();
  const findings: Finding[] = [];
  let drafts = 0;
  let corriges = 0;
  // les corrections se publient sur le site en ligne (stockage) ; en local, les fichiers du dépôt ne sont pas touchés
  const enLigne = editionStorage() === "stockage";
  const descriptions = enLigne ? Object.fromEntries((await getAllProducts().catch(() => [])).flatMap((p) => p.images.filter((i) => i.alt?.trim()).map((i) => [i.src, i.alt]))) : {};
  for (const d of docs) {
    for (const locale of LOCALES) {
      const draft = await draftOf(d.id, locale);
      if (draft) {
        drafts++;
        const days = Math.floor((now.getTime() - new Date(draft.updatedAt).getTime()) / DAY);
        if (days >= 7) findings.push({ gravite: "attention", titre: `« ${d.label} » attend d’être publiée depuis ${days} jours`, detail: `Brouillon ${locale === "en" ? "anglais" : "français"} modifié par ${draft.by}.`, lien: "/pages", cible: `${d.id}:${locale}` });
      }
      const live = await publishedDoc(d.id, locale);
      if (!live || d.kind === "email") continue;
      if (enLigne && !draft && corrigerContenu(live, locale === "en" ? "en" : "fr", descriptions).corrections.length) {
        annoncer(`Corrige « ${d.label} ».`);
        const out = await perform("gardien-editeur", "correct_page", { doc: d.id, locale }, { summary: `Corrections sur « ${d.label} »`, rationale: "Typographie et descriptions de photo, sans changer le sens." });
        if (out.status === "done") corriges++;
      }
      const left = todos(live);
      if (left.length) findings.push({ gravite: "attention", titre: `« ${d.label} » montre encore ${left.length} texte${left.length > 1 ? "s" : ""} à écrire`, detail: "Des repères entre crochets sont visibles sur le site.", lien: "/pages", cible: `${d.id}:todo` });
      const issues = scanTexts((await publishedDoc(d.id, locale)) ?? live, locale === "en" ? "en" : "fr").filter((i) => i.severity === "erreur");
      if (issues.length) findings.push({ gravite: "info", titre: `« ${d.label} » a ${issues.length} point${issues.length > 1 ? "s" : ""} d’écriture à revoir`, detail: issues.slice(0, 3).map((i) => i.message).join(" "), lien: "/pages", cible: `${d.id}:ecriture` });
    }
  }
  const soon = (await scheduled()).filter((s) => new Date(s.at).getTime() - now.getTime() < DAY);
  for (const s of soon) findings.push({ gravite: "info", titre: `Publication programmée de « ${docs.find((d) => d.id === s.doc)?.label ?? s.doc} »`, detail: new Date(s.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }), lien: "/pages", cible: s.id });
  const corrections = corriges ? ` ${corriges} page${corriges > 1 ? "s" : ""} corrigée${corriges > 1 ? "s" : ""}.` : "";
  const resume = (findings.length
    ? `${drafts} brouillon${drafts > 1 ? "s" : ""} en cours, ${findings.filter((f) => f.gravite !== "info").length} point${findings.length > 1 ? "s" : ""} à regarder.`
    : drafts
      ? `${drafts} brouillon${drafts > 1 ? "s" : ""} en cours, rien d’oublié.`
      : "Tout ce qui est en ligne est à jour, aucun brouillon en attente.") + corrections;
  return { resume, findings };
}
