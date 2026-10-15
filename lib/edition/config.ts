/**
 * Où vivent les contenus modifiables (éditeur visuel « Édition ») :
 *
 *  - `fichiers` (en local, sans compte) : les versions publiées sont écrites directement dans
 *    content/site/<langue>/<document>.json, donc dans Git ; brouillons et historique restent dans
 *    le stockage technique (.data/store.json).
 *  - `stockage` (en ligne, où le disque est en lecture seule) : brouillons, versions publiées et
 *    historique vivent dans le stockage technique (Upstash) ; les fichiers du dépôt servent de base.
 *    Si la recopie Git est branchée (EDITION_GITHUB_TOKEN, EDITION_GITHUB_REPO), chaque
 *    publication est aussi enregistrée dans le dépôt.
 *
 * EDITION_STORAGE force l'un ou l'autre ; à défaut, `fichiers` hors de Vercel, `stockage` sur Vercel.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export type EditionStorage = "fichiers" | "stockage";

export function editionStorage(): EditionStorage {
  const forced = process.env.EDITION_STORAGE?.trim().toLowerCase();
  if (forced === "fichiers" || forced === "stockage") return forced;
  return process.env.VERCEL ? "stockage" : "fichiers";
}

export const isLocale = (l: string): l is Locale => (LOCALES as readonly string[]).includes(l);

/** Recopie des publications dans Git par l'API GitHub (facultative). */
export function githubSync(): { token: string; repo: string; branch: string } | null {
  const token = process.env.EDITION_GITHUB_TOKEN?.trim();
  const repo = process.env.EDITION_GITHUB_REPO?.trim();
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  return { token, repo, branch: process.env.EDITION_GITHUB_BRANCH?.trim() || "main" };
}
