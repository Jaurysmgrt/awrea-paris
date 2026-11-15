import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fromDoc, type LegalDocContent } from "@/lib/legal/doc";
import { legalVersions } from "@/content/legal-versions";
import { LegalView, legalDocMetadata } from "@/components/ui/LegalView";

/**
 * Conditions générales de vente : texte de la créatrice (ressources-awrea/CONDITION GÉNÉRALES DE
 * VENTE), corrigé le 12/11/2026 à sa demande pour suivre le fonctionnement réel de la Maison
 * (pièces fabriquées après la commande, sans stock ; franchise de TVA ; rétractation de quatorze
 * jours ; médiation). Il n'est plus marqué officiel : les règles d'écriture s'y appliquent. Onze
 * articles et l'annexe, dans content/site/fr/cgv.json, modifiables dans l'éditeur « Édition ».
 * La version acceptée à la commande est celle de content/legal-versions.ts.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalDocMetadata("cgv", "/cgv");
}

export default async function Page() {
  const doc = await getDoc<LegalDocContent>("cgv");
  return <LegalView page={fromDoc(doc, "/cgv", { version: legalVersions.cgv })} />;
}
