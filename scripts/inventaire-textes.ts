/**
 * Inventaire des textes encore écrits dans les composants du site public (et non dans les
 * documents de contenu, content/site/<langue>/). Sert à suivre la centralisation des textes ;
 * avec --strict, échoue s'il en reste (contrôle de la CI une fois la migration terminée).
 *
 *   node --experimental-strip-types scripts/inventaire-textes.ts [--strict] [--detail]
 *
 * Hors du périmètre : l'Atelier et l'éditeur (outils de la créatrice), les laboratoires de design,
 * les tests. Exception sur une ligne : commentaire « texte-ok : raison ».
 */
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { looksLikeProse } from "../lib/writing/rules.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const SCOPE = ["app", "components"];
const OUT = [/^app\/gestion\//, /^app\/\(lab\)\//, /^app\/api\//, /^components\/admin\//, /^components\/edition\//, /\.test\.tsx?$/, /\.d\.ts$/];
const ATTRS = new Set(["alt", "title", "aria-label", "placeholder", "label", "aria-description", "aria-roledescription"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(path.join(root, dir))) {
    const rel = path.posix.join(dir, e);
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx$/.test(e) && !OUT.some((r) => r.test(rel))) out.push(rel);
  }
  return out;
}

const found: { file: string; line: number; text: string }[] = [];
for (const file of SCOPE.flatMap((d) => walk(d))) {
  const src = readFileSync(path.join(root, file), "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = src.split("\n");
  const ok = (n: ts.Node) => {
    const l = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
    return /texte-ok/.test(lines[l] ?? "") || /texte-ok/.test(lines[l - 1] ?? "");
  };
  const add = (n: ts.Node, text: string) => {
    // sélecteurs CSS, identifiants techniques
    if (ok(n) || /^[.#\[]|\[data-|:not\(|\s>\s|^[A-Z0-9_]+$|^\w+_\w+$/.test(text.trim())) return;
    found.push({ file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: text.replace(/\s+/g, " ").trim().slice(0, 90) });
  };
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n) && /\p{L}{2,}/u.test(n.getText(sf))) add(n, n.getText(sf));
    else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText(sf)) && n.initializer && ts.isStringLiteral(n.initializer) && /\p{L}{2,}/u.test(n.initializer.text)) add(n, n.initializer.text);
    else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && looksLikeProse(n.text) && !ts.isImportDeclaration(n.parent) && !ts.isJsxAttribute(n.parent) && !ts.isExportDeclaration(n.parent)) add(n, n.text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const byFile = new Map<string, number>();
for (const f of found) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);
if (args.includes("--detail")) for (const f of found) console.log(`${f.file}:${f.line}  ${f.text}`);
else for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${f}`);
console.log(`\nTextes écrits dans les composants du site : ${found.length} dans ${byFile.size} fichiers.`);
if (args.includes("--strict") && found.length) process.exit(1);
