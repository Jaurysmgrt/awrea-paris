import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fromDoc, type LegalDocContent } from "@/lib/legal/doc";
import { LegalView, legalDocMetadata } from "@/components/ui/LegalView";

/**
 * Mentions légales : texte officiel de la créatrice (ressources-awrea/MENTIONS LÉGALES), repris mot
 * pour mot et marqué officiel, suivi des compléments que la loi demande (directrice de la
 * publication, TVA, médiation, crédits). Contenu : content/site/fr/mentions-legales.json.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalDocMetadata("mentions-legales", "/mentions-legales");
}

export default async function Page() {
  const doc = await getDoc<LegalDocContent>("mentions-legales");
  return <LegalView page={fromDoc(doc, "/mentions-legales")} />;
}
