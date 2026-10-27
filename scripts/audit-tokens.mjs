#!/usr/bin/env node
/**
 * Audit d'homogénéité du design system.
 * Signale toute valeur écrite en dur hors de styles/tokens.css :
 *   couleurs (#hex, rgb, hsl), tailles (px, rem, em hors letter-spacing), durées, courbes,
 *   styles en ligne et valeurs arbitraires Tailwind dans les composants.
 * Une ligne peut être exemptée explicitement avec le commentaire « token-ok » (cas justifiés :
 * unités du viewBox SVG, tuile de texture…).
 * Vérifie aussi que styles/tokens.ts (miroir pour e-mails, WebGL, métadonnées) correspond au CSS,
 * et qu'il n'existe qu'une durée (--dur) et une courbe (--ease) pour toutes les animations.
 *
 * Ressources officielles (RESSOURCES.md, DESIGN.md) : deux polices seulement, Fraunces (grands
 * titres en 120pt Light droite, petits titres en 72pt Italic) et Cormorant Garamond (textes) ; l'italique est réservé aux règles qui posent la police
 * des titres, et toute règle qui pose la police des textes remet le style droit (les titres h1 à h4
 * sont en italique par défaut) ; Fraunces jamais sous 25 px ; aucune police retirée (Instrument
 * Serif, Inter Tight, General Sans) ni la police du logo (licence personnelle), ni dans le code, ni
 * dans les contenus, ni dans les gabarits d'e-mails de Supabase ; arrondis par les tokens
 * --radius-* ; aucun texte sous 16 px ; interlignages sur la grille de 8 px.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const problems = [];
const report = (file, line, msg, text) => problems.push(`${path.relative(root, file)}:${line}  ${msg}  →  ${text.trim().slice(0, 110)}`);

// polices retirées par les ressources officielles, et police du logo (Croisan, licence personnelle :
// jamais chargée par le site, le logo s'affiche à partir des fichiers officiels)
const RETIRED_FONT = /instrument[ -]?serif|inter[ -]?tight|general[ -]?sans|croisan/i;

// ------------------------------------------------------------------ CSS
const cssDir = path.join(root, "styles");
// les media queries ne peuvent pas lire de variables CSS : leurs valeurs doivent être
// exactement les points de rupture du design system (min) ou leur valeur − 0,01 rem (max)
const tokensCss = fs.readFileSync(path.join(cssDir, "tokens.css"), "utf8");
const breakpoints = [...tokensCss.matchAll(/--breakpoint-[a-z0-9]+:\s*([\d.]+)rem/g)].map((m) => parseFloat(m[1]));
const allowedMedia = new Set(breakpoints.flatMap((b) => [String(b), (b - 0.01).toFixed(2)]));
for (const f of fs.readdirSync(cssDir).filter((f) => f.endsWith(".css") && f !== "tokens.css")) {
  const file = path.join(cssDir, f);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((raw, i) => {
    if (raw.includes("token-ok")) return;
    const line = raw.replace(/\/\*.*?\*\//g, "").replace(/url\([^)]*\)/g, "");
    if (/^\s*@media/.test(line)) {
      for (const m of line.matchAll(/([\d.]+)rem/g)) if (!allowedMedia.has(String(parseFloat(m[1]))) && !allowedMedia.has(parseFloat(m[1]).toFixed(2))) report(file, i + 1, "point de rupture hors tokens", raw);
      return;
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) report(file, i + 1, "couleur en dur", raw);
    if (/\b(rgb|rgba|hsl|hsla)\(/.test(line)) report(file, i + 1, "couleur en dur", raw);
    if (/cubic-bezier\(/.test(line)) report(file, i + 1, "courbe en dur", raw);
    // mouvement : une seule durée, une seule courbe (MARQUE.md, consigne d'homogénéité)
    if (/var\(--(dur-(fast|base|slow)|ease-(silk|drape))\)/.test(line)) report(file, i + 1, "ancien token de mouvement (utiliser --dur et --ease)", raw);
    if (/\b(ease|ease-in|ease-out|ease-in-out|step-start|step-end)\b\s*[,;]|\bsteps\(/.test(line) && /(transition|animation|var\(--dur)/.test(line)) report(file, i + 1, "courbe hors de --ease", raw);
    if (/\blinear\b/.test(line) && !/\b0s linear\b/.test(line) && /(transition|animation|var\(--dur)/.test(line)) report(file, i + 1, "courbe hors de --ease", raw);
    if (/^\s+[a-z-]+\s+\d*\.?\d+m?s\b/.test(line) && !/^\s+[a-z-]+\s+0s\b/.test(line)) report(file, i + 1, "durée en dur", raw);
    if (/(transition|animation)[^:]*:[^;]*\b\d*\.?\d+m?s\b/.test(line) && !/var\(--dur/.test(line)) report(file, i + 1, "durée en dur", raw);
    if (/:\s*[^;]*\b\d*\.?\d+px\b/.test(line)) report(file, i + 1, "px en dur", raw);
    if (/:\s*[^;]*\b\d*\.?\d+rem\b/.test(line)) report(file, i + 1, "rem en dur", raw);
    if (/^\s*letter-spacing:\s*-?\d/.test(line) && !/:\s*0;/.test(line)) report(file, i + 1, "interlettrage en dur", raw);
    if (/^\s*font-size:\s*\d/.test(line)) report(file, i + 1, "taille de police en dur", raw);
    // direction artistique : ni doré dans l'interface, ni calligraphie (MARQUE.md)
    if (/gold/i.test(line)) report(file, i + 1, "doré interdit dans l'interface", raw);
    // l'italique passe par le token des titres (vérifié bloc par bloc plus bas)
    if (/font-style:\s*(italic|oblique)/.test(line)) report(file, i + 1, "italique en dur (utiliser var(--font-style-display) avec la police des titres)", raw);
    if (/--font-(script|serif)\b/.test(line)) report(file, i + 1, "famille hors des deux polices", raw);
    if (RETIRED_FONT.test(line)) report(file, i + 1, "police retirée ou police du logo (deux polices officielles seulement)", raw);
    if (/border-radius:/.test(line) && !/border-radius:\s*(0|inherit|var\(--radius-[a-z]+\))\s*;/.test(line)) report(file, i + 1, "arrondi hors des tokens --radius-*", raw);
    if (/backdrop-filter|filter:\s*blur/.test(line)) report(file, i + 1, "verre dépoli ou flou interdit", raw);
  });
  // règle par règle : les deux polices et leur style, le plancher de Fraunces, la grille des
  // interlignages
  const source = fs.readFileSync(file, "utf8");
  for (const m of source.matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
    const line = source.slice(0, m.index).split("\n").length;
    const selector = source.slice(Math.max(0, source.lastIndexOf("\n", m.index) + 1), m.index + 1);
    const display = /font-family:\s*var\(--font-display\)/.test(body);
    // italique : seulement dans une règle qui pose aussi la police des titres (Fraunces n'existe
    // qu'en italique ; Cormorant n'a pas de face italique, le navigateur l'imiterait)
    if (/font-style:\s*var\(--font-style-(display|title)\)/.test(body) && !display) report(file, line, "style des titres hors de la police des titres", selector);
    if (/font-weight:\s*var\(--font-weight-title\)/.test(body) && !display) report(file, line, "graisse des titres hors de la police des titres", selector);
    // police des textes : style droit explicite, sinon un titre (h2.t-label…) garde l'italique de base
    if (/font-family:\s*var\(--font-(body|sans)\)/.test(body) && !/font-style:\s*normal/.test(body)) report(file, line, "police des textes sans « font-style: normal » (italique hérité des titres)", selector);
    // Fraunces 72pt est dessinée pour le grand format : jamais sous 25 px (--text-step-1)
    if (display && /font-size:\s*var\(--text-step-(0|-1|-2)\)/.test(body)) report(file, line, "police des titres sous 25 px (utiliser la police des textes)", selector);
    // 18 px × 1,6 = 28,8 px : hors de la grille de 8 px (les notes prennent --leading-note)
    if (/font-size:\s*var\(--text-step--1\)/.test(body) && /line-height:\s*var\(--leading-text\)/.test(body)) report(file, line, "interlignage hors de la grille (18 px × 1,6) : utiliser --leading-note", selector);
  }
}

// ------------------------------------------------ une durée, une courbe
{
  const curves = [...tokensCss.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/cubic-bezier\([^)]*\)/g)].map((m) => m[0].replace(/\s+/g, ""));
  if (new Set(curves).size !== 1) problems.push(`styles/tokens.css  ${new Set(curves).size} courbes d'animation (une seule attendue : --ease)`);
  const durations = [...tokensCss.matchAll(/--dur(-[a-z]+)?:\s*([\d.]+m?s)\s*;/g)].filter((m) => !/^0\.01s$|^0s$/.test(m[2]));
  const named = new Set(durations.map((m) => m[2]));
  if (named.size !== 1 || durations.some((m) => m[1] && m[1] !== "-stagger")) problems.push(`styles/tokens.css  durées multiples (${[...named].join(", ")}) : une seule attendue (--dur), les autres en dérivent`);
}

// ------------------------------------------------ grille de 8 px (tokens)
for (const m of tokensCss.matchAll(/--(spacing-[a-z0-9-]+|lh-step--?\d|leading-(?:label|note)):\s*([\d.]+)rem/g)) {
  if ((parseFloat(m[2]) * 16) % 8 !== 0) problems.push(`styles/tokens.css  --${m[1]} = ${m[2]}rem : hors de la grille de 8 px`);
}

// ---------------------------------------- jamais de texte sous 16 px (Cormorant a un petit œil)
for (const m of tokensCss.matchAll(/--(text-step--?\d):\s*([\d.]+)rem/g)) {
  if (parseFloat(m[2]) < 1) problems.push(`styles/tokens.css  --${m[1]} = ${m[2]}rem : texte sous 16 px`);
}

// ------------------------------------- deux polices officielles, rien d'autre (fichiers et code)
for (const f of fs.readdirSync(path.join(root, "styles", "fonts"))) {
  if (!/^(fraunces-|cormorant-garamond-|OFL-(fraunces|cormorant-garamond)\.txt$)/.test(f)) problems.push(`styles/fonts/${f}  fichier hors des deux polices officielles`);
}

// ------------------------------------------------- composants et pages
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
// polices retirées : jamais dans une chaîne du code (familles, fichiers chargés)
for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "components")), ...walk(path.join(root, "lib")), path.join(root, "styles/tokens.ts")]) {
  fs.readFileSync(file, "utf8").split("\n").forEach((raw, i) => {
    for (const str of raw.matchAll(/(["'`])((?:(?!\1).)*)\1/g)) if (RETIRED_FONT.test(str[2])) report(file, i + 1, "police retirée ou police du logo dans le code", raw);
  });
}
// ni dans les contenus ni dans les gabarits d'e-mails envoyés par Supabase (code de connexion)
// EN_ATTENTE : gabarits dont la mise aux polices officielles est confiée à une autre équipe
// (signalés à chaque passage ; l'entrée doit disparaître dès que le fichier est corrigé)
const EN_ATTENTE = new Set([]);
function walkAll(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(p, ext, out);
    else if (ext.test(e.name)) out.push(p);
  }
  return out;
}
for (const file of [...walkAll(path.join(root, "content"), /\.(json|ts|md)$/), ...walkAll(path.join(root, "supabase", "templates"), /\.html$/)]) {
  const rel = path.relative(root, file);
  const hits = fs.readFileSync(file, "utf8").split("\n").flatMap((raw, i) => (RETIRED_FONT.test(raw) ? [[i + 1, raw]] : []));
  if (EN_ATTENTE.has(rel)) {
    if (hits.length) console.log(`  en attente : ${rel} (${hits.length} ligne(s) avec une police retirée, confiée à une autre équipe)`);
    else problems.push(`${rel}  corrigé : retirer son entrée de EN_ATTENTE (scripts/audit-tokens.mjs)`);
    continue;
  }
  for (const [line, raw] of hits) report(file, line, "police retirée ou police du logo", raw);
}

const allowColorFiles = new Set(["styles/tokens.ts"]);
for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "components"))]) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((raw, i) => {
    if (raw.includes("token-ok")) return;
    if (!allowColorFiles.has(rel) && /["'`]#[0-9a-fA-F]{3,8}["'`]/.test(raw)) report(file, i + 1, "couleur en dur dans un composant", raw);
    if (/\bt-script\b|handwrite|btn--gold|palette\.gold|fontStacks\.(script|serif)/.test(raw)) report(file, i + 1, "doré ou calligraphie (abandonnés)", raw);
    // animations JS : la courbe unique (EASE) et la durée unique (dur()), jamais de valeur écrite
    if (/\bease:\s*["'](?!none["'])/.test(raw)) report(file, i + 1, "courbe d'animation hors de EASE (lib/motion.ts)", raw);
    if (/\bduration:\s*\d/.test(raw)) report(file, i + 1, "durée d'animation en dur (utiliser dur())", raw);
    if (/className=["{][^"}]*\b[a-z-]+-\[[^\]]+\]/.test(raw)) report(file, i + 1, "valeur arbitraire Tailwind", raw);
    const style = raw.match(/style=\{\{([^}]*)\}\}/);
    if (style && /\b\d+(px|rem|em|ms|s)\b|#[0-9a-f]{3,6}/i.test(style[1])) report(file, i + 1, "style en ligne avec valeur en dur", raw);
  });
}

// ------------------------------------------- miroir TypeScript des couleurs
const css = fs.readFileSync(path.join(cssDir, "tokens.css"), "utf8");
const ts = fs.readFileSync(path.join(root, "styles/tokens.ts"), "utf8");
for (const name of ["ink", "ivory", "pearl", "taupe"]) {
  const a = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();
  const b = ts.match(new RegExp(`${name}:\\s*"(#[0-9a-fA-F]{6})"`))?.[1]?.toLowerCase();
  if (!a || a !== b) problems.push(`styles/tokens.ts  couleur « ${name} » différente du CSS (${b} ≠ ${a})`);
}

if (problems.length) {
  console.log(`Audit d'homogénéité : ${problems.length} écart(s)\n`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("Audit d'homogénéité : aucun écart. Toutes les valeurs passent par le design system.");
