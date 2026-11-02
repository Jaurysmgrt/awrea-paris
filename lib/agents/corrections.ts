/**
 * Corrections que le Gardien de l'éditeur fait seul sur une page en ligne (autonomie « Corriger le
 * site », choisie par la créatrice le 02/11) : seulement ce qui ne change pas le sens.
 *  - la typographie (apostrophes et guillemets français, espaces insécables avant ; : ! ? »,
 *    points de suspension, majuscules accentuées : lib/writing/rules.ts, fixTypography) ;
 *  - la description d'une photo de pièce laissée vide, reprise du catalogue.
 * Jamais : un texte officiel de la créatrice (bloc marqué « officiel »), un champ technique (adresse,
 * identifiant, lien), un texte à variables (« {prenom} »), un mot ou une phrase. Fonction pure, sans
 * stockage : testée dans tests/unit/agents-autonomie.test.ts ; l'action « correct_page »
 * (lib/agents/actions.ts) publie le résultat comme une nouvelle version de la page.
 */
import { fixTypography, looksLikeProse, type Lang } from "@/lib/writing/rules";

/** Champs jamais réécrits : adresses, identifiants, réglages. */
const TECHNIQUE = /^(id|src|href|url|lien|chemin|poster|type|kind|famille|fond|variant|width|height|focal|x|y|handle|slug|email|date|at|icone|icon|cible|mime|format)$/i;

export interface Correction {
  /** chemin du champ dans le document (« apropos.paragraphes[2] ») */
  chemin: string;
  nature: "typographie" | "description";
  avant: string;
  apres: string;
}

/** Description d'une photo du catalogue, par adresse (« /media/img/sienna-1 »). */
export type DescriptionsCatalogue = Record<string, string>;

const cleSrc = (src: string) => src.replace(/[?#].*$/, "").replace(/(-\d{3,4})?\.(webp|jpe?g|png|avif)$/i, "");

export function corrigerContenu<T>(value: T, lang: Lang, descriptions: DescriptionsCatalogue = {}): { value: T; corrections: Correction[] } {
  const corrections: Correction[] = [];
  const catalogue = Object.fromEntries(Object.entries(descriptions).map(([src, alt]) => [cleSrc(src), alt]));
  const walk = (v: unknown, key: string, chemin: string): unknown => {
    if (typeof v === "string") {
      if (TECHNIQUE.test(key) || !looksLikeProse(v)) return v;
      const apres = fixTypography(v, lang);
      if (apres !== v) corrections.push({ chemin, nature: "typographie", avant: v, apres });
      return apres;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, key, `${chemin}[${i}]`));
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      // texte officiel de la créatrice : repris mot pour mot, jamais retouché
      if (o.officiel === true) return v;
      const out = Object.fromEntries(Object.entries(o).map(([k, x]) => [k, walk(x, k, chemin ? `${chemin}.${k}` : k)]));
      // photo de pièce sans description : celle du catalogue
      if (typeof o.src === "string" && "alt" in o && typeof o.alt === "string" && !o.alt.trim()) {
        const alt = catalogue[cleSrc(o.src)];
        if (alt) {
          out.alt = alt;
          corrections.push({ chemin: chemin ? `${chemin}.alt` : "alt", nature: "description", avant: "", apres: alt });
        }
      }
      return out;
    }
    return v;
  };
  return { value: walk(value, "", "") as T, corrections };
}

/** Une phrase pour le journal et la note de version : « 3 corrections de typographie, 1 description de photo ». */
export function resumerCorrections(c: Correction[]): string {
  const typo = c.filter((x) => x.nature === "typographie").length;
  const desc = c.length - typo;
  return [typo ? `${typo} correction${typo > 1 ? "s" : ""} de typographie` : "", desc ? `${desc} description${desc > 1 ? "s" : ""} de photo` : ""].filter(Boolean).join(", ");
}
