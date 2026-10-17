/**
 * Textes produits par les agents de gestion et l'assistante : nettoyage automatique (typographie,
 * tirets, points d'exclamation, emoji) puis contrôle des formulations, champ par champ.
 */
import { checkText, cleanGenerated, errorsOf, looksLikeProse, type Lang, type WritingIssue } from "@/lib/writing/rules";

/** Champs techniques : jamais réécrits (identifiants, liens, adresses, codes). */
const TECHNICAL = /^(id|handle|slug|href|url|src|image|images|email|to|from|replyTo|sku|code|status|kind|type|category|collection|size|sizes|locale|lang|currency|mediaType|data|token|target|action|orderNumber|number|tracking|carrier|provider|variantId|productId|customerId|proposalId|date|at)$/i;

export interface FieldIssue extends WritingIssue {
  path: string;
  text: string;
}

/** Nettoie toutes les chaînes de texte d'une valeur (objet, tableau, texte) et renvoie ce qui reste à revoir. */
export function cleanTexts<T>(value: T, lang: Lang = "fr"): { value: T; issues: FieldIssue[] } {
  const issues: FieldIssue[] = [];
  const walk = (v: unknown, key: string, path: string): unknown => {
    if (typeof v === "string") {
      if (TECHNICAL.test(key) || !looksLikeProse(v)) return v;
      const cleaned = cleanGenerated(v, lang);
      for (const i of errorsOf(checkText(cleaned, { lang, prose: true }))) issues.push({ ...i, path, text: cleaned });
      return cleaned;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, key, `${path}[${i}]`));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k, path ? `${path}.${k}` : k)]));
    return v;
  };
  return { value: walk(value, "", "") as T, issues };
}

/**
 * Nettoyage au fil de l'eau d'une réponse diffusée par morceaux : on rend tout jusqu'au dernier
 * blanc (un tiret ou une apostrophe ne sont jamais coupés en deux), le reste attend la suite.
 */
export function streamCleaner(lang: Lang = "fr") {
  let pending = "";
  let all = "";
  let started = false;
  const clean = (t: string) => {
    const out = cleanGenerated(t, lang, { continuation: started });
    started = true;
    return out;
  };
  return {
    push(chunk: string): string {
      pending += chunk;
      const cut = Math.max(pending.lastIndexOf(" "), pending.lastIndexOf("\n"));
      if (cut <= 0) return "";
      const ready = clean(pending.slice(0, cut));
      pending = pending.slice(cut);
      all += ready;
      return ready;
    },
    flush(): string {
      const rest = pending ? clean(pending) : "";
      pending = "";
      all += rest;
      return rest;
    },
    reset() {
      pending = "";
      all = "";
      started = false;
    },
    /** texte complet rendu jusqu'ici */
    text: () => all,
  };
}

/** Contrôle sans rien modifier (textes déjà stockés) : toutes les erreurs, champ par champ. */
export function scanTexts(value: unknown, lang: Lang = "fr"): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const walk = (v: unknown, key: string, path: string) => {
    if (typeof v === "string") {
      if (TECHNICAL.test(key) || !looksLikeProse(v)) return;
      const role = /^(title|titre|heading)$/i.test(key) ? "titre" : undefined;
      for (const i of errorsOf(checkText(v, { lang, prose: true, role }))) issues.push({ ...i, path, text: v });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, key, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k, path ? `${path}.${k}` : k);
  };
  walk(value, "", "");
  return issues;
}
