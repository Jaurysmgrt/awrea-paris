import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fromDoc, type LegalDocContent } from "@/lib/legal/doc";
import { legalVersions } from "@/content/legal-versions";
import { LegalView, legalDocMetadata } from "@/components/ui/LegalView";

/**
 * Conditions générales de vente : texte officiel de la créatrice (ressources-awrea/CONDITION
 * GÉNÉRALES DE VENTE), repris mot pour mot dans content/site/fr/cgv.json et modifiable dans
 * l'éditeur « Édition ». Articles 1 à 11 marqués officiel (data-officiel), annexe de la Maison.
 * La version acceptée à la commande reste celle de content/legal-versions.ts.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalDocMetadata("cgv", "/cgv");
}

export default async function Page() {
  const doc = await getDoc<LegalDocContent>("cgv");
  return <LegalView page={fromDoc(doc, "/cgv", { version: legalVersions.cgv })} />;
}
