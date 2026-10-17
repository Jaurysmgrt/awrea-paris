/**
 * Traductions : la version anglaise complète la française (une clé absente reste en français) ; les
 * listes de blocs suivent la structure française et chaque bloc traduit s'y retrouve par son id.
 * Module pur.
 */
import { getAt, setAt, type Path } from "@/lib/edition/paths";

export const isBlockLike = (x: unknown): x is { id: string } => Boolean(x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string");

/**
 * Complète une traduction incomplète avec le français (une clé absente reste en français). Les
 * listes de blocs suivent la structure française ; chaque bloc traduit s'y retrouve par son id.
 */
export function withFallback(primary: unknown, fallback: unknown): unknown {
  if (primary === undefined || primary === null) return fallback;
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

