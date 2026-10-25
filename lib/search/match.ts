/**
 * Recherche du site : correspondance tolérante (sans accents, sans majuscules, pluriels
 * simples), partagée par la recherche plein écran (dans le navigateur, instantanée) et la
 * page /recherche (rendue sur le serveur, sans JavaScript).
 */
export type SearchKind = "piece" | "collection" | "journal" | "maison";

export interface SearchEntry {
  kind: SearchKind;
  href: string;
  title: string;
  /** légende discrète sous le titre */
  note: string;
  /** `provisoire` : image générée, à accompagner de la mention « visuel provisoire » */
  image?: { src: string; alt: string; width: number; height: number; provisoire?: boolean };
  price?: number;
  /** titre normalisé */
  key: string;
  /** texte indexé, normalisé */
  terms: string;
}

export const kindLabels: Record<SearchKind, string> = {
  piece: "Pièces",
  collection: "Collections",
  journal: "Journal",
  maison: "La maison",
};

const STOP = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "en", "et", "au", "aux", "a", "l", "d", "pour", "avec", "sur"]);

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** pluriels simples : « robes » → « robe », « bijoux » → « bijou » */
function stem(w: string): string {
  return w.length > 3 ? w.replace(/(?<=[a-z]{3})[sx]$/, "") : w;
}

export function queryTokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

const startsWord = (hay: string, t: string) => hay.startsWith(t) || hay.includes(` ${t}`);

/** Toutes les notions demandées doivent être présentes ; le titre pèse plus que le reste. */
export function search(entries: SearchEntry[], query: string, limit = 30): SearchEntry[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const scored: { e: SearchEntry; score: number; i: number }[] = [];
  entries.forEach((e, i) => {
    let score = 0;
    for (const t of tokens) {
      if (startsWord(e.key, t)) score += 6;
      else if (e.key.includes(t)) score += 3;
      else if (startsWord(e.terms, t)) score += 2;
      else if (t.length > 2 && e.terms.includes(t)) score += 1;
      else return;
    }
    if (e.kind === "piece") score += 1;
    scored.push({ e, score, i });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.e);
}

export function groupByKind(results: SearchEntry[]): { kind: SearchKind; label: string; items: SearchEntry[] }[] {
  return (Object.keys(kindLabels) as SearchKind[])
    .map((kind) => ({ kind, label: kindLabels[kind], items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);
}

/** Quelques pistes proposées quand le champ est encore vide */
export const searchSuggestions = ["Dentelle", "Robe", "Body", "Satin", "Pièce unique", "Sur commande"];
