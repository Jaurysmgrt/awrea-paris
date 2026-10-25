import ts from "typescript";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { looksLikeProse } from "../../lib/writing/rules.ts";
const root = "/home/user/awrea-paris";
function walk(d: string, out: string[] = []) { const a = path.join(root, d); if (!existsSync(a)) return out; for (const n of readdirSync(a)) { const r = `${d}/${n}`; if (statSync(path.join(root, r)).isDirectory()) walk(r, out); else if (/\.tsx?$/.test(n)) out.push(r); } return out; }
const rows: [string, number, number][] = [];
for (const f of [...walk("app"), ...walk("components"), ...walk("lib")]) {
  const src = readFileSync(path.join(root, f), "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let jsx = 0, lit = 0, chars = 0;
  const v = (n: ts.Node) => {
    if (ts.isJsxText(n) && /\p{L}{2,}/u.test(n.text)) { jsx++; chars += n.text.trim().length; }
    else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && looksLikeProse(n.text) && /[a-zà-ÿ]{3,}\s[a-zà-ÿ]{2,}/i.test(n.text) && !(n.parent && ts.isImportDeclaration(n.parent))) { lit++; chars += n.text.length; }
    else if (ts.isTemplateExpression(n)) { const t = n.head.text + n.templateSpans.map(s=>s.literal.text).join(" "); if (looksLikeProse(t) && /[a-zà-ÿ]{3,}\s[a-zà-ÿ]{2,}/i.test(t)) { lit++; chars += t.length; } }
    ts.forEachChild(n, v);
  };
  v(sf);
  if (jsx + lit) rows.push([f, jsx + lit, chars]);
}
const groups = new Map<string, [number, number, number]>();
for (const [f, n, c] of rows) { const g = f.split("/").slice(0, f.startsWith("app/(site)") || f.startsWith("app/gestion") || f.startsWith("app/api") ? 2 : 2).join("/"); const x = groups.get(g) ?? [0,0,0]; groups.set(g, [x[0]+1, x[1]+n, x[2]+c]); }
for (const [g, [files, n, c]] of [...groups].sort((a,b)=>b[1][2]-a[1][2])) console.log(g.padEnd(32), "fichiers", String(files).padStart(3), "textes", String(n).padStart(5), "caractères", c);
console.log("TOTAL", rows.length, rows.reduce((s,r)=>s+r[1],0), rows.reduce((s,r)=>s+r[2],0));
