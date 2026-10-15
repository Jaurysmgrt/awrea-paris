/**
 * Chemins dans un document de contenu : « sections.2.titre » désigne
 * doc.sections[2].titre. Fonctions pures, partagées par le serveur et l'éditeur.
 */
export type Segment = string | number;
export type Path = Segment[];

export function parsePath(p: string): Path {
  if (!p) return [];
  return p
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

export const formatPath = (p: Path) => p.join(".");

const SAFE = /^[A-Za-z0-9_-]+$/;
/** Refuse les chemins qui pourraient toucher au prototype d'un objet. */
export function isSafePath(p: Path): boolean {
  return p.every((s) => typeof s === "number" || (SAFE.test(s) && s !== "__proto__" && s !== "constructor" && s !== "prototype"));
}

export function getAt(value: unknown, path: Path): unknown {
  let v = value;
  for (const s of path) {
    if (v === null || typeof v !== "object") return undefined;
    v = (v as Record<string | number, unknown>)[s];
  }
  return v;
}

/** Copie modifiée (la valeur d'origine n'est jamais touchée). */
export function setAt<T>(value: T, path: Path, next: unknown): T {
  if (!path.length) return next as T;
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = value.slice();
    copy[head as number] = setAt(copy[head as number], rest, next);
    return copy as T;
  }
  const obj = (value && typeof value === "object" ? value : typeof head === "number" ? [] : {}) as Record<string | number, unknown>;
  const copy = Array.isArray(obj) ? obj.slice() : { ...obj };
  (copy as Record<string | number, unknown>)[head] = setAt((obj as Record<string | number, unknown>)[head], rest, next);
  return copy as T;
}

/** Opérations sur une liste (sections d'une page) : ajouter, dupliquer, supprimer, déplacer. */
export function listOp<T>(list: T[], op: { kind: "insert"; index: number; item: T } | { kind: "remove"; index: number } | { kind: "duplicate"; index: number; copy: (x: T) => T } | { kind: "move"; from: number; to: number }): T[] {
  const out = list.slice();
  switch (op.kind) {
    case "insert":
      out.splice(Math.max(0, Math.min(op.index, out.length)), 0, op.item);
      return out;
    case "remove":
      out.splice(op.index, 1);
      return out;
    case "duplicate":
      if (out[op.index] !== undefined) out.splice(op.index + 1, 0, op.copy(out[op.index]));
      return out;
    case "move": {
      if (op.from < 0 || op.from >= out.length) return out;
      const [item] = out.splice(op.from, 1);
      out.splice(Math.max(0, Math.min(op.to, out.length)), 0, item);
      return out;
    }
  }
}

/** Chemins de toutes les chaînes d'un document (pour comparer deux versions). */
export function stringPaths(value: unknown, base: Path = []): { path: Path; value: string }[] {
  if (typeof value === "string") return [{ path: base, value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => stringPaths(v, [...base, i]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => stringPaths(v, [...base, k]));
  return [];
}

/** Chemins dont la valeur diffère entre deux versions (résumé de l'historique). */
export function changedPaths(a: unknown, b: unknown): string[] {
  const left = new Map(stringPaths(a).map((x) => [formatPath(x.path), x.value]));
  const right = new Map(stringPaths(b).map((x) => [formatPath(x.path), x.value]));
  const keys = new Set([...left.keys(), ...right.keys()]);
  return [...keys].filter((k) => left.get(k) !== right.get(k));
}
