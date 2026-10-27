/**
 * Traductions : la version anglaise complète la française (une clé absente reste en français) ; les
 * listes de blocs suivent la structure française et chaque bloc traduit s'y retrouve par son id.
 * Les photos et les vidéos sont les mêmes dans toutes les langues : seule leur description (alt) se
 * traduit. Module pur.
 */
import { getAt, setAt, type Path } from "@/lib/edition/paths";

export const isBlockLike = (x: unknown): x is { id: string } => Boolean(x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string");

/** Photo ({ src, alt, width, height }) ou vidéo ({ src, poster }) d'un document. */
const isMedia = (x: unknown): x is Record<string, unknown> => Boolean(x && typeof x === "object" && !Array.isArray(x) && typeof (x as { src?: unknown }).src === "string");

/**
 * Complète une traduction incomplète avec le français (une clé absente reste en français). Les
 * listes de blocs suivent la structure française ; chaque bloc traduit s'y retrouve par son id.
 */
export function withFallback(primary: unknown, fallback: unknown): unknown {
  if (primary === undefined || primary === null) return fallback;
  // le fichier vient toujours du français (une photo remplacée l'est dans toutes les langues)
  if (isMedia(fallback) && primary && typeof primary === "object" && !Array.isArray(primary)) {
    const alt = (primary as { alt?: unknown }).alt;
    return typeof alt === "string" && alt.trim() ? { ...fallback, alt } : fallback;
  }
  if (Array.isArray(fallback)) {
    if (!Array.isArray(primary)) return fallback;
    if (fallback.length && fallback.every(isBlockLike) && primary.every(isBlockLike)) {
      return fallback.map((f) => {
        const own = primary.find((x) => x.id === f.id);
        return own ? withFallback(own, f) : f;
      });
    }
    return primary;
  }
  if (fallback && typeof fallback === "object" && primary && typeof primary === "object" && !Array.isArray(primary)) {
    const out: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
    for (const [k, v] of Object.entries(primary as Record<string, unknown>)) out[k] = withFallback(v, (fallback as Record<string, unknown>)[k]);
    return out;
  }
  return primary;
}

/**
 * Chemin d'une traduction : dans une liste de blocs, l'indice vient de la structure française ; la
 * traduction range chaque bloc par son id (ajouté au besoin).
 */
export function localize(fr: unknown, own: unknown, at: Path): { content: unknown; path: Path } {
  let content = own ?? {};
  const out: Path = [];
  let f: unknown = fr;
  for (let i = 0; i < at.length; i++) {
    const seg = at[i];
    const list = getAt(content, out);
    if (typeof seg === "number" && Array.isArray(f) && isBlockLike(f[seg])) {
      const id = (f[seg] as { id: string }).id;
      const arr = Array.isArray(list) ? (list as unknown[]) : [];
      let idx = arr.findIndex((x) => isBlockLike(x) && x.id === id);
      if (idx < 0) {
        idx = arr.length;
        content = setAt(content, [...out, idx], { id });
      }
      out.push(idx);
    } else out.push(seg);
    f = f && typeof f === "object" ? (f as Record<string | number, unknown>)[seg] : undefined;
  }
  return { content, path: out };
}


/** Chemins des valeurs qui diffèrent entre deux versions, au plus près des feuilles ; une liste qui
 * change de longueur ou dont les blocs changent d'ordre est prise en entier. */
export function diffPaths(a: unknown, b: unknown, base: Path = []): Path[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return [base];
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [base];
    const sameBlocks = a.every((x, i) => isBlockLike(x) === isBlockLike(b[i]) && (!isBlockLike(x) || x.id === (b[i] as { id: string }).id));
    if (!sameBlocks) return [base];
    return a.flatMap((x, i) => diffPaths(x, b[i], [...base, i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((k) => diffPaths(left[k], right[k], [...base, k]));
}

/**
 * Report des modifications de la créatrice sur une nouvelle version du dépôt : ce qu'elle a changé
 * dans l'Édition (différences entre `base`, la version du dépôt sur laquelle elle a travaillé, et
 * `edited`) s'applique à `next`, la version du dépôt d'aujourd'hui. Ses textes restent les siens, et
 * ce que le code a changé ailleurs dans le document apparaît au lieu d'être masqué.
 */
export function rebase(edited: unknown, base: unknown, next: unknown): unknown {
  if (base === undefined || base === null || next === undefined || next === null) return edited;
  if (JSON.stringify(base) === JSON.stringify(next)) return edited;
  let out: unknown = structuredClone(next);
  for (const p of diffPaths(base, edited)) out = setAt(out, p, getAt(edited, p));
  return out;
}
