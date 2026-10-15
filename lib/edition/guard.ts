/**
 * Garde-fous de l'éditeur : ce qui protège la mise en page (longueurs, repères à garder, texte
 * alternatif obligatoire) bloque l'enregistrement ; le contrôle d'écriture (tirets, formulations)
 * ne fait que signaler, avec une suggestion. Module pur, partagé par l'éditeur et le serveur.
 */
import { checkText, type WritingIssue } from "@/lib/writing/rules";

export interface FieldRule {
  /** nombre de caractères au plus */
  max: number;
  role?: "titre" | "bouton" | "texte";
  /** plusieurs lignes permises (paragraphe) */
  multiline: boolean;
  required: boolean;
  /** nom lisible du champ, pour la créatrice */
  label: string;
}

const last = (path: string) => path.split(".").filter((s) => !/^\d+$/.test(s)).pop() ?? "";
const parent = (path: string) => path.split(".").filter((s) => !/^\d+$/.test(s)).slice(-2, -1)[0] ?? "";

/** Règle d'un champ, déduite de son nom (et de celui de son parent). */
export function ruleFor(path: string): FieldRule {
  const key = last(path).toLowerCase();
  const up = parent(path).toLowerCase();
  if (key === "sujet") return { max: 80, role: "titre", multiline: false, required: true, label: "Objet de l’e-mail" };
  if (key === "preheader") return { max: 110, multiline: false, required: true, label: "Ligne d’aperçu (sous l’objet dans la boîte de réception)" };
  if (up === "seo" && key === "title") return { max: 65, role: "titre", multiline: false, required: true, label: "Titre pour les moteurs de recherche" };
  if (up === "seo" && key === "description") return { max: 165, multiline: false, required: true, label: "Description pour les moteurs de recherche" };
  if (/^(cta|bouton|button|cta2|lien)$/.test(up) && /^(label|libelle|texte|text)$/.test(key)) return { max: 32, role: "bouton", multiline: false, required: true, label: "Texte du bouton" };
  if (/^(bouton|button|cta|submit|envoyer)$/.test(key)) return { max: 32, role: "bouton", multiline: false, required: true, label: "Texte du bouton" };
  if (key === "alt") return { max: 180, multiline: false, required: true, label: "Description de l’image (pour les personnes qui ne la voient pas)" };
  if (/^(h1|titre|title|heading|nom|name|titrepage)$/.test(key)) return { max: 90, role: "titre", multiline: false, required: true, label: "Titre" };
  if (/^(eyebrow|surtitre|kicker|label|etiquette|legende|caption)$/.test(key)) return { max: 60, multiline: false, required: false, label: key === "caption" || key === "legende" ? "Légende" : "Petite ligne au-dessus du titre" };
  if (/^(lead|chapeau|accroche|tagline|intro)$/.test(key)) return { max: 320, role: "texte", multiline: true, required: false, label: "Chapeau" };
  if (/^(citation|quote)$/.test(key)) return { max: 400, role: "texte", multiline: true, required: true, label: "Citation" };
  if (/^(text|texte|body|corps|paragraphe|paragraphes|paragraphs|lines|lignes|note|a|r)$/.test(key)) return { max: 2400, role: "texte", multiline: true, required: false, label: "Texte" };
  if (/^(q|question)$/.test(key)) return { max: 200, role: "titre", multiline: false, required: true, label: "Question" };
  return { max: 800, role: "texte", multiline: true, required: false, label: "Texte" };
}

const placeholders = (s: string) => [...new Set(s.match(/\{[a-zA-Z][\w]*\}/g) ?? [])].sort();

/** Vérification bloquante : la mise en page et le code doivent continuer de fonctionner. */
export function guardValue(path: string, previous: string | undefined, next: string): string | null {
  const rule = ruleFor(path);
  const value = next.replace(/\r\n/g, "\n");
  if (rule.required && !value.trim()) return `${rule.label} ne peut pas rester vide.`;
  if (value.length > rule.max) return `${rule.label} : ${rule.max} caractères au plus, pour que la mise en page reste juste (actuellement ${value.length}).`;
  if (!rule.multiline && /\n/.test(value)) return `${rule.label} tient sur une seule ligne.`;
  if (previous !== undefined) {
    const before = placeholders(previous);
    const after = placeholders(value);
    const missing = before.filter((p) => !after.includes(p));
    const unknown = after.filter((p) => !before.includes(p));
    if (missing.length) return `Gardez ${missing.join(", ")} dans le texte : la valeur s’y insère automatiquement.`;
    if (unknown.length) return `${unknown.join(", ")} n’est pas reconnu ici. Retirez les accolades.`;
  }
  return null;
}

/** Contrôle d'écriture (non bloquant) d'un champ, selon son rôle. */
export function writingFor(path: string, value: string, lang: "fr" | "en" = "fr"): WritingIssue[] {
  const rule = ruleFor(path);
  return checkText(value, { lang, role: rule.role === "texte" ? undefined : rule.role, prose: true });
}
