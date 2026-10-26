/** Résout l'alias « @/ » du projet pour les tests unitaires exécutés directement par Node. */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..") + "/";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = root + specifier.slice(2);
    for (const ext of [".ts", ".tsx", "/index.ts", ""]) if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
  }
  return next(specifier, context);
}
