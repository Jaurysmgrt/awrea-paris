/**
 * Gardien de l'éditeur : chaque matin, il regarde ce qui attend dans l'éditeur visuel. Brouillons
 * oubliés, publications programmées du jour, textes encore entre crochets sur une page en ligne,
 * points relevés par le contrôle d'écriture dans les textes publiés. Il ne publie rien et ne
 * change aucun texte : il prévient.
 */
import { listDocuments } from "@/lib/edition/documents";
import { draftOf, publishedDoc, scheduled } from "@/lib/edition/store";
import { todos } from "@/lib/edition/blocks";
import { LOCALES } from "@/lib/edition/config";
import { scanTexts } from "@/lib/writing/agents";
import type { RoleOutcome, Finding } from "./types";

const DAY = 86_400_000;

export async function runGardienEditeur(now = new Date()): Promise<RoleOutcome> {
  const docs = await listDocuments();
  const findings: Finding[] = [];
  let drafts = 0;
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
      const left = todos(live);
      if (left.length) findings.push({ gravite: "attention", titre: `« ${d.label} » montre encore ${left.length} texte${left.length > 1 ? "s" : ""} à écrire`, detail: "Des repères entre crochets sont visibles sur le site.", lien: "/pages", cible: `${d.id}:todo` });
      const issues = scanTexts(live, locale === "en" ? "en" : "fr").filter((i) => i.severity === "erreur");
      if (issues.length) findings.push({ gravite: "info", titre: `« ${d.label} » a ${issues.length} point${issues.length > 1 ? "s" : ""} d’écriture à revoir`, detail: issues.slice(0, 3).map((i) => i.message).join(" "), lien: "/pages", cible: `${d.id}:ecriture` });
    }
  }
  const soon = (await scheduled()).filter((s) => new Date(s.at).getTime() - now.getTime() < DAY);
  for (const s of soon) findings.push({ gravite: "info", titre: `Publication programmée de « ${docs.find((d) => d.id === s.doc)?.label ?? s.doc} »`, detail: new Date(s.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }), lien: "/pages", cible: s.id });
  const resume = findings.length
    ? `${drafts} brouillon${drafts > 1 ? "s" : ""} en cours, ${findings.filter((f) => f.gravite !== "info").length} point${findings.length > 1 ? "s" : ""} à regarder.`
    : drafts
      ? `${drafts} brouillon${drafts > 1 ? "s" : ""} en cours, rien d’oublié.`
      : "Tout ce qui est en ligne est à jour, aucun brouillon en attente.";
  return { resume, findings };
}
