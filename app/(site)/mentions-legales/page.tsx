import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fromDoc, type LegalDocContent } from "@/lib/legal/doc";
import { LegalView, legalDocMetadata } from "@/components/ui/LegalView";

/**
 * Mentions légales réécrites à la demande de la créatrice (cahier du 10/11/2026) : texte de la
 * Maison, soumis aux règles d'écriture (plus de texte officiel). Éditrice et hébergeur en fiches,
 * TVA (franchise en base), fabrication à la commande et droit de rétractation, réclamation et
 * médiation, propriété intellectuelle, données personnelles, liens vers les autres textes.
 * Informations de l'entreprise : registre légal (content/legal/fields.ts), repères « À COMPLÉTER »
 * tant qu'elles manquent. Contenu : content/site/fr/mentions-legales.json.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalDocMetadata("mentions-legales", "/mentions-legales");
}

export default async function Page() {
  const doc = await getDoc<LegalDocContent>("mentions-legales");
  return <LegalView page={fromDoc(doc, "/mentions-legales")} />;
}
