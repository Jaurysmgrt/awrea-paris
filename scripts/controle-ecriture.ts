/**
 * Contrôle d'écriture : parcourt tous les textes visibles et fait échouer la mise en ligne s'il
 * trouve un tiret de ponctuation, une formulation interdite, un point d'exclamation, un emoji, une
 * apostrophe droite ou une faute de typographie française (règles : lib/writing/rules.ts).
 *
 *   npm run audit:ecriture                        sources : contenus, composants, e-mails, messages
 *   npm run audit:ecriture -- --fix               applique les corrections typographiques sûres
 *   npm run audit:ecriture -- --site <adresse>    contrôle aussi les pages rendues par le serveur
 *   npm run audit:ecriture -- --json <fichier>    rapport lisible par l'agent de maintenance
 *   npm run audit:ecriture -- --conseils          affiche aussi les conseils (non bloquants)
 *
 * Exceptions : un commentaire « ecriture-ok : raison » sur la ligne (ou juste au-dessus) d'une
 * chaîne technique ; les textes que la créatrice a gardés malgré un signalement sont listés dans
 * content/ecriture-acceptes.json par l'éditeur visuel, et ne bloquent pas.
 */
import ts from "typescript";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkText, fixTypography, looksLikeCode, looksLikeProse, type Lang, type TextContext, type WritingIssue } from "../lib/writing/rules.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const FIX = args.includes("--fix");
const SHOW_TIPS = args.includes("--conseils");
const SITE = args.includes("--site") ? args[args.indexOf("--site") + 1] : undefined;
const JSON_OUT = args.includes("--json") ? args[args.indexOf("--json") + 1] : undefined;

const SCAN = ["content", "data", "app", "components", "lib", "emails"];
const EXCLUDE = [/^app\/\(lab\)\//, /^lib\/writing\/rules\.ts$/, /\.d\.ts$/, /\.test\.tsx?$/];
const PUBLIC_TEXT = ["public/llms.txt", "public/llms-full.txt"];

interface Finding extends WritingIssue {
  where: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];
const accepted = new Set<string>(
  existsSync(path.join(root, "content/ecriture-acceptes.json"))
    ? (JSON.parse(readFileSync(path.join(root, "content/ecriture-acceptes.json"), "utf8")) as { texte: string }[]).map((a) => a.texte)
    : [],
);

// ------------------------------------------------------------------ contexte des chaînes
/** Attributs JSX techniques : jamais lus par la cliente. */
const SKIP_ATTRS = new Set(
  "className class href src srcSet id key rel type name role as method target htmlFor inputMode autoComplete pattern sizes media lang hrefLang dir d viewBox fill stroke xmlns strategy crossOrigin referrerPolicy loading decoding fetchPriority encType action formAction accept capture enterKeyHint step min max form headers scope wrap style tabIndex colSpan rowSpan width height x y cx cy r rx ry x1 x2 y1 y2 points transform gradientUnits offset stopColor fillRule clipRule strokeWidth strokeLinecap strokeLinejoin strokeDasharray preserveAspectRatio poster value defaultValue mode variant size align justify gap tone icon nonce sandbox allow integrity charSet httpEquiv property itemProp itemType itemScope slot part path query sitekey theme".split(" "),
);
const SKIP_ATTR_PREFIX = /^(data-|aria-(?!label|roledescription|valuetext|description|placeholder))/;
/** Clés d'objets techniques. */
const SKIP_KEYS = new Set(
  "href src image images img video poster slug handle id key path url icon className class type kind status variant email tel sku color colour font weight locale lang currency code provider env method route pattern regex mime contentType ext format unit anchor hash target rel schema @type @context sameAs latitude longitude ratio aspect focal crop width height sizes srcSet cron scope scopes metafield namespace field fields segment storageKey cookie cookieName header token secret query param params selector event events media mediaId file filename folder dir prefix suffix separator mode tone theme align layout template block blocks component name_en en ua as viewBox d fill stroke fit position objectPosition easing ease duration delay icon2 shortcut domain host origin redirect redirects source destination permanent".split(" "),
);
/** Appels dont les arguments sont techniques (journaux du serveur, stockage, sélecteurs…). */
const SKIP_CALL = /^(console\.\w+|require|import|kv\.\w+|fetch|URL|URLSearchParams|RegExp|\w+\.(?:get|set|has|delete|append|getAll|querySelector|querySelectorAll|closest|matches|getElementById|addEventListener|removeEventListener|setAttribute|getAttribute|removeAttribute|hasAttribute|toggleAttribute|setProperty|getPropertyValue|startsWith|endsWith|includes|indexOf|lastIndexOf|split|join|padStart|padEnd|localeCompare|toLocaleString|toLocaleDateString|toLocaleTimeString|replaceAll|replace|match|matchAll|search|test|exec|update|digest|createHash|createHmac|from|toString|push|prefetch|replaceState|pushState|postMessage|track|dispatchEvent|createElement|insertAdjacentHTML)|matchMedia|revalidateTag|revalidatePath|updateTag|redirect|permanentRedirect|notFound|encodeURIComponent|decodeURIComponent|createHmac|createHash|Buffer\.from|Intl\.\w+|gsap\.\w+|gsap|dur|easeFn|cookies|headers|draftMode|unstable_cache|cacheTag|cacheLife|localStorage\.\w+|sessionStorage\.\w+|z\.\w+|parseInt|parseFloat|Number|Date|new Date|structuredClone|JSON\.\w+|setTimeout|clearTimeout|navigator\.\w+|document\.\w+|window\.\w+|router\.\w+|useRouter|usePathname|useSearchParams|signal|logError|trace|t\.\w+)$/;

const SECTION_LANG = (file: string): Lang => (/(^|\/)en(\/|\.)/.test(file) ? "en" : "fr");

function isTypePosition(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return true;
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isImportTypeNode(n) || ts.isExternalModuleReference(n)) return true;
    if (ts.isBlock(n) || ts.isSourceFile(n)) return false;
  }
  return false;
}

/** Remonte jusqu'au contexte qui dit à quoi sert la chaîne. */
function contextOf(node: ts.Node, sf: ts.SourceFile): { skip: boolean; key?: string; role?: TextContext["role"]; forceProse?: boolean } {
  let child: ts.Node = node;
  for (let n: ts.Node | undefined = node.parent; n; child = n, n = n.parent) {
    if (ts.isJsxAttribute(n)) {
      const name = n.name.getText(sf);
      if (SKIP_ATTRS.has(name) || SKIP_ATTR_PREFIX.test(name)) return { skip: true };
      return { skip: false, key: name, role: /^(cta|label|submitLabel|actionLabel)$/i.test(name) ? "bouton" : /^(title|heading|kicker)$/i.test(name) ? "titre" : undefined, forceProse: /^(alt|title|aria-label|placeholder|label)$/.test(name) };
    }
    if (ts.isPropertyAssignment(n) && child === n.initializer) {
      const key = n.name.getText(sf).replace(/^["']|["']$/g, "");
      if (SKIP_KEYS.has(key)) return { skip: true };
      return { skip: false, key, role: /^(cta|ctaLabel|button|bouton|action|actionLabel|submit|submitLabel|link|linkLabel|more)$/i.test(key) ? "bouton" : /^(title|titre|h1|h2|heading|headline|kicker|eyebrow)$/i.test(key) ? "titre" : /legal|juridique/i.test(sf.fileName) ? "juridique" : undefined };
    }
    if (ts.isPropertyAssignment(n) && child === n.name) return { skip: true };
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const callee = n.expression.getText(sf).replace(/\s+/g, "");
      // consignes données au modèle (schémas de sortie) : texte vérifié, sans rôle de titre ou de bouton
      if (/\.describe$/.test(callee)) return { skip: false, forceProse: true };
      if (SKIP_CALL.test(callee) || SKIP_CALL.test(callee.split(".").slice(-2).join("."))) return { skip: true };
    }
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(n.operatorToken.kind)) return { skip: true };
    if (ts.isCaseClause(n) || ts.isElementAccessExpression(n)) return { skip: true };
    if (ts.isJsxExpression(n) || ts.isJsxElement(n)) break;
    if (ts.isVariableDeclaration(n) || ts.isReturnStatement(n) || ts.isExpressionStatement(n) || ts.isSourceFile(n)) break;
  }
  return { skip: false };
}

/** Rôle d'un texte JSX selon la balise qui l'entoure (titre, bouton, lien). */
function jsxRole(node: ts.Node, sf: ts.SourceFile): TextContext["role"] {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isJsxElement(n)) {
      const tag = n.openingElement.tagName.getText(sf);
      if (/^h[1-6]$/.test(tag)) return "titre";
      if (/^(button|Button|a|Link|ButtonLink|Cta)$/.test(tag)) return "bouton";
      if (!/^(span|em|strong|b|i|small|abbr|Justify|Justification|T)$/.test(tag)) return undefined;
    }
  }
  return undefined;
}

const ENTITIES: Record<string, string> = { "&apos;": "'", "&#39;": "'", "&quot;": '"', "&#34;": '"', "&nbsp;": " ", "&amp;": "&", "&mdash;": "—", "&ndash;": "–", "&laquo;": "«", "&raquo;": "»", "&hellip;": "…", "&rsquo;": "’", "&lsquo;": "‘", "&lt;": "<", "&gt;": ">", "&#8217;": "’", "&#8212;": "—", "&#8211;": "–", "&#160;": " " };
const decode = (s: string) => s.replace(/&(?:#\d+|[a-z]+);/gi, (e) => ENTITIES[e.toLowerCase()] ?? (e.startsWith("&#") ? String.fromCodePoint(Number(e.slice(2, -1))) : e));

/** Texte lisible d'une chaîne HTML (gabarits d'e-mails). */
function htmlText(s: string): string {
  return decode(
    s
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(?:br|\/p|\/div|\/td|\/tr|\/h\d|\/li|\/table)[^>]*>/gi, "\n")
      // les séparateurs de React (<!-- -->) et les balises en ligne ne sont pas des espaces :
      // « </mark>\u00a0: » se lit « ]\u00a0: », pas « ] \u00a0: »
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?(?:a|abbr|b|bdi|bdo|cite|code|data|del|dfn|em|i|ins|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|wbr)\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " "),
  );
}

function hasIgnore(sf: ts.SourceFile, node: ts.Node): boolean {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const lines = sf.text.split("\n");
  return /ecriture-ok/.test(lines[line] ?? "") || /ecriture-ok/.test(lines[line - 1] ?? "");
}

interface Piece {
  start: number;
  end: number;
  raw: string;
  quote?: string;
  /** suit directement une expression (\${…} ou {…}) : une ponctuation haute en tête prend son espace */
  afterExpression?: boolean;
}

/** Correction typographique d'un morceau de source, échappements compris. */
function fixPiece(piece: Piece, lang: Lang): string {
  let raw = piece.raw.replace(/\\u00a0|\\xa0/gi, "\u00a0");
  if (piece.quote === "'") raw = raw.replace(/(?<=\p{L})\\'(?=\p{L})/gu, "’");
  raw = raw.replace(/(?<=\p{L})(?:&apos;|&#39;)(?=\p{L})/gu, "’");
  const canQuote = !raw.includes('\\"') && piece.quote !== '"';
  let fixed = canQuote ? fixTypography(raw, lang) : fixTypography(raw.replace(/"/g, "\u0000"), lang).replace(/\u0000/g, '"');
  if (lang === "fr" && piece.afterExpression) fixed = fixed.replace(/^([;:!?»])/, "\u00a0$1");
  return fixed;
}

/** Texte JSX tel que React l'affiche : les blancs qui contiennent un retour à la ligne disparaissent. */
function jsxVisible(raw: string): string {
  return raw
    .replace(/^[ \t]*\n\s*/, "")
    .replace(/\s*\n[ \t]*$/, "")
    .replace(/[ \t]*\n\s*/g, " ");
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function record(file: string, line: number, text: string, issues: WritingIssue[]) {
  for (const i of issues) {
    if (i.severity === "conseil" && !SHOW_TIPS) continue;
    if (accepted.has(text.trim())) continue;
    const before = text.slice(0, i.index);
    findings.push({ ...i, where: file, line: line + (before.match(/\n/g)?.length ?? 0), text });
  }
}

// ------------------------------------------------------------------ fichiers TS / TSX
function scanTs(file: string) {
  const abs = path.join(root, file);
  const src = readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lang = SECTION_LANG(file);
  const isContent = file.startsWith("content/");
  const edits: Edit[] = [];

  const visit = (node: ts.Node) => {
    let text: string | undefined;
    let ctx: TextContext = { lang };
    let fixable: Piece | undefined;
    let pieces: Piece[] = [];

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTypePosition(node) && !hasIgnore(sf, node)) {
        const c = contextOf(node, sf);
        if (!c.skip) {
          const value = node.text;
          const html = /<\/?[a-z][^>]*>/i.test(value);
          text = html ? htmlText(value) : value;
          const prose = c.forceProse || html || (isContent ? !looksLikeCode(text) && /\p{L}/u.test(text) : looksLikeProse(text));
          ctx = { lang, role: c.role, prose };
          const start = node.getStart(sf) + 1;
          const end = node.getEnd() - 1;
          if (!html) fixable = { start, end, raw: src.slice(start, end), quote: src[start - 1] };
        }
      }
    } else if (ts.isTemplateExpression(node)) {
      if (!hasIgnore(sf, node)) {
        const c = contextOf(node, sf);
        if (!c.skip) {
          const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
          const joined = parts.join("‹›");
          const html = /<\/?[a-z][^>]*>/i.test(joined);
          text = html ? htmlText(joined) : joined;
          ctx = { lang, role: c.role, prose: c.forceProse || html || looksLikeProse(parts.join(" ")) };
          if (!html) {
            const lits = [node.head, ...node.templateSpans.map((x) => x.literal)];
            pieces = lits.map((lit, i) => {
              const start = lit.getStart(sf) + 1;
              const end = lit.getEnd() - (ts.isTemplateTail(lit) ? 1 : 2);
              return { start, end, raw: src.slice(start, end), quote: "`", afterExpression: i > 0 };
            });
          }
        }
      }
    } else if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      if (raw.trim() && !hasIgnore(sf, node)) {
        text = jsxVisible(decode(raw));
        ctx = { lang, role: jsxRole(node, sf), prose: true };
        const prev = node.parent && ts.isJsxElement(node.parent) ? node.parent.children[node.parent.children.indexOf(node) - 1] : undefined;
        fixable = { start: node.getStart(sf), end: node.getEnd(), raw, afterExpression: Boolean(prev && ts.isJsxExpression(prev)) };
      }
    }

    if (text !== undefined && text.trim()) {
      const issues = checkText(text, ctx);
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      if (fixable) pieces = [fixable];
      if (FIX && pieces.length && issues.some((i) => i.autofix)) {
        for (const piece of pieces) {
          const fixed = fixPiece(piece, lang);
          if (fixed !== piece.raw) edits.push({ start: piece.start, end: piece.end, text: fixed });
        }
        record(file, line + 1, text, checkText(fixTypography(text, lang), ctx));
      } else {
        record(file, line + 1, text, issues);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (FIX && edits.length) {
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    writeFileSync(abs, out);
  }
}

// ------------------------------------------------------------------ fichiers JSON / texte
function scanJson(file: string) {
  const data = JSON.parse(readFileSync(path.join(root, file), "utf8"));
  const lang = SECTION_LANG(file);
  const walk = (v: unknown, key: string, trail: string) => {
    if (typeof v === "string") {
      if (SKIP_KEYS.has(key) || !/\p{L}/u.test(v) || looksLikeCode(v)) return;
      const role = /^(cta|button|label|link)$/i.test(key) ? "bouton" : /^(title|titre|heading|kicker)$/i.test(key) ? "titre" : undefined;
      record(`${file} › ${trail}`, 1, v, checkText(v, { lang, role, prose: true }));
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, key, `${trail}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k, trail ? `${trail}.${k}` : k);
  };
  walk(data, "", "");
}

function scanPlain(file: string) {
  const lines = readFileSync(path.join(root, file), "utf8").split("\n");
  lines.forEach((l, i) => l.trim() && !/^#|^>|^\s*[-*]\s|^https?:/.test(l) && record(file, i + 1, l, checkText(l, { lang: "fr", prose: true })));
}

function walkDir(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(root, rel)).isDirectory()) walkDir(rel, out);
    else if (/\.(tsx?|json)$/.test(name) && !EXCLUDE.some((re) => re.test(rel))) out.push(rel);
  }
  return out;
}

// ------------------------------------------------------------------ pages rendues
async function scanSite(base: string) {
  const origin = base.replace(/\/$/, "");
  const urls = new Set<string>();
  try {
    const xml = await (await fetch(`${origin}/sitemap.xml`)).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(new URL(m[1]).pathname);
  } catch {
    console.error(`Plan du site illisible sur ${origin}.`);
  }
  for (const p of ["/", "/commande", "/compte", "/suivi", "/recherche?q=dentelle", "/liste-envies", "/rendez-vous", "/page-inexistante-controle"]) urls.add(p);
  const seen = new Map<string, number>();
  for (const u of urls) {
    let html = "";
    try {
      html = await (await fetch(origin + u, { headers: { cookie: "awrea_consent=refuse" } })).text();
    } catch {
      continue;
    }
    const lang: Lang = /<html[^>]*lang="en/.test(html) ? "en" : "fr";
    const attrs = [...html.matchAll(/\s(?:alt|title|aria-label|placeholder)="([^"]*)"/g)].map((m) => decode(m[1]));
    const metas = [...html.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)"[^>]+content="([^"]*)"/g)].map((m) => decode(m[1]));
    const title = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
    const body = htmlText(html.replace(/<head[\s\S]*?<\/head>/i, " ").replace(/<(svg|template)[\s\S]*?<\/\1>/gi, " ").replace(/<(?:p|li|h\d|button|a|label|figcaption|dt|dd|blockquote|summary|th|option|span)[^>]*>/gi, "\n$&"));
    const blocks = [...body.split(/\n+/), ...attrs, ...metas, ...title].map((b) => b.replace(/[ \t\r\n]+/g, " ").trim()).filter((b) => /\p{L}/u.test(b));
    for (const b of blocks) {
      const issues = checkText(b, { lang, prose: true });
      for (const i of issues) {
        const k = `${i.rule}|${i.excerpt}`;
        if (seen.has(k)) continue;
        seen.set(k, 1);
        if (i.severity === "conseil" && !SHOW_TIPS) continue;
        if (accepted.has(b)) continue;
        findings.push({ ...i, where: `page ${u}`, line: 0, text: b });
      }
    }
  }
}

// ------------------------------------------------------------------ exécution
const files = SCAN.flatMap((d) => walkDir(d));
for (const f of files) (f.endsWith(".json") ? scanJson : scanTs)(f);
for (const f of PUBLIC_TEXT) if (existsSync(path.join(root, f))) scanPlain(f);
if (SITE) await scanSite(SITE);

const errors = findings.filter((f) => f.severity === "erreur");
const byRule = new Map<string, number>();
for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ date: new Date().toISOString(), errors: errors.length, findings }, null, 2));

let current = "";
for (const f of findings) {
  if (f.where !== current) {
    current = f.where;
    console.log(`\n${f.where}`);
  }
  console.log(`  ${f.line ? `${f.line} ` : ""}[${f.severity === "erreur" ? f.rule : `conseil · ${f.rule}`}] ${f.message}\n      « ${f.excerpt} »${f.suggestion ? `\n      → ${f.suggestion}` : ""}`);
}
console.log(`\nContrôle d’écriture : ${files.length} fichiers${SITE ? ` et les pages de ${SITE}` : ""}, ${errors.length} erreur(s)${SHOW_TIPS ? `, ${findings.length - errors.length} conseil(s)` : ""}.`);
if (byRule.size) console.log([...byRule].map(([r, n]) => `${r} ${n}`).join(" · "));
if (FIX) console.log("Corrections typographiques sûres appliquées ; relancer sans --fix pour vérifier.");
process.exit(errors.length ? 1 : 0);
