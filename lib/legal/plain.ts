import { legalFields, type LegalFieldKey } from "@/content/legal/fields";

/** Version texte d'un texte juridique (métadonnées, llms.txt, e-mails) : les champs vides restent signalés. */
export function legalPlain(text: string): string {
  return text
    .replace(/\{\{([a-zA-Z]+)\}\}/g, (_, k: string) => legalFields[k as LegalFieldKey]?.value || `[À COMPLÉTER : ${legalFields[k as LegalFieldKey]?.short ?? k}]`)
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}
