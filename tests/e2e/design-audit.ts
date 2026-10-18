/**
 * Audit d'homogénéité d'une page, exécuté dans le navigateur (testeur « homogénéité ») :
 * familles de polices (les deux polices officielles, Fraunces et Cormorant Garamond), italiques
 * (seulement les titres en Fraunces), textes sous 16 px, couleurs saturées (aucune dorure dans
 * l'interface), espacements sur la grille de 8 px, interlignage 1,6 du texte courant, mesure
 * (caractères par ligne) et régularité des espaces entre les mots des paragraphes justifiés.
 *
 * La césure : Chromium sans interface n'embarque pas les dictionnaires de césure que les
 * navigateurs des visiteuses utilisent. Avant de mesurer, `hyphenateJustified` pose donc des
 * césures conditionnelles françaises dans les paragraphes justifiés, pour mesurer ce que voient
 * réellement les visiteuses.
 */
import type { Page } from "@playwright/test";
import { hyphenateSync } from "hyphen/fr";

export interface DesignAudit {
  families: string[];
  /** italiques hors de la police des titres (Cormorant n'a pas de face italique) */
  italics: string[];
  /** textes sous 16 px (le minimum du design system) */
  small: string[];
  saturated: string[];
  spacing: string[];
  leading: string[];
  justified: { selector: string; lines: number; chars: number; maxGap: number; looseLines: number; width: number; firstScreen: boolean }[];
}

declare global {
  interface Window {
    __hyphNodes?: Text[];
  }
}

export async function hyphenateJustified(page: Page) {
  const texts = await page.evaluate(() => {
    window.__hyphNodes = [];
    for (const p of Array.from(document.querySelectorAll("p"))) {
      if (getComputedStyle(p).textAlign !== "justify") continue;
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) window.__hyphNodes.push(w.currentNode as Text);
    }
    return window.__hyphNodes.map((n) => n.data);
  });
  const hy = texts.map((t) => hyphenateSync(t, { hyphenChar: "­", minWordLength: 5 }));
  await page.evaluate((hy) => window.__hyphNodes?.forEach((n, i) => (n.data = hy[i])), hy);
}

/** Exécutée dans la page. */
export function auditInPage(): DesignAudit {
  const describe = (el: Element) => {
    const cls = typeof (el as HTMLElement).className === "string" ? (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
  };
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
  };
  const skip = (el: Element) => Boolean(el.closest("svg, .sr-only, [data-audit-skip], .consent, script, style, noscript, canvas, video, iframe, nextjs-portal"));
  const ownText = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 1);
  // couleurs normalisées en sRGB par un canevas (les mélanges color-mix arrivent en oklab)
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const cache = new Map<string, number[]>();
  const rgb = (c: string) => {
    let v = cache.get(c);
    if (!v) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      v = [d[0], d[1], d[2], d[3] / 255];
      cache.set(c, v);
    }
    return v;
  };
  // chroma (écart entre la plus forte et la plus faible composante) : 0,05 pour le taupe, 0,37 pour l'ancien doré
  const saturation = (c: string) => {
    const [r, g, b, a = 1] = rgb(c);
    if (r === undefined || a < 0.05) return 0;
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  };
  const off8 = (v: number) => Math.abs(v) > 1.01 && Math.abs(v / 8 - Math.round(v / 8)) * 8 > 0.51;

  const families = new Set<string>();
  const italics = new Set<string>();
  const small = new Set<string>();
  const saturated = new Set<string>();
  const spacing = new Set<string>();
  const leading = new Set<string>();

  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (skip(el) || !shown(el)) continue;
    const cs = getComputedStyle(el);
    if (ownText(el)) {
      families.add(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
      // l'italique appartient aux titres : Fraunces 72pt Italic est la seule face des titres
      if ((cs.fontStyle === "italic" || cs.fontStyle.startsWith("oblique")) && !/fraunces/i.test(cs.fontFamily)) italics.add(describe(el));
      const size = parseFloat(cs.fontSize);
      if (size > 0 && size < 15.9) small.add(`${describe(el)} ${cs.fontSize}`);
      if (el.tagName === "P" && /cormorant/i.test(cs.fontFamily) && cs.textTransform !== "uppercase") {
        const ratio = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
        if (Math.abs(ratio - 1.6) > 0.02) leading.add(`${describe(el)} ${cs.fontSize}/${cs.lineHeight}`);
      }
    }
    for (const prop of ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "outlineColor"] as const) {
      const v = cs[prop];
      if (prop.startsWith("border") && cs[prop.replace("Color", "Width") as "borderTopWidth"] === "0px") continue;
      if (saturation(v) > 0.12) saturated.add(`${describe(el)} ${prop} ${v}`);
    }
    if (cs.display === "inline" || cs.display === "contents") continue;
    const checks: [string, number][] = [
      ["margin-top", parseFloat(cs.marginTop)],
      ["margin-bottom", parseFloat(cs.marginBottom)],
      ["padding-top", parseFloat(cs.paddingTop)],
      ["padding-bottom", parseFloat(cs.paddingBottom)],
      ["padding-left", parseFloat(cs.paddingLeft)],
      ["padding-right", parseFloat(cs.paddingRight)],
    ];
    const ml = parseFloat(cs.marginLeft);
    const mr = parseFloat(cs.marginRight);
    if (Math.abs(ml - mr) > 0.5) checks.push(["margin-left", ml], ["margin-right", mr]);
    if (/flex|grid/.test(cs.display)) {
      if (cs.rowGap !== "normal") checks.push(["row-gap", parseFloat(cs.rowGap)]);
      if (cs.columnGap !== "normal") checks.push(["column-gap", parseFloat(cs.columnGap)]);
    }
    for (const [k, v] of checks) if (off8(v)) spacing.add(`${describe(el)} ${k} ${Math.round(v * 10) / 10}px`);
  }

  // ---------------------------------------------------------------- justification
  const justified: DesignAudit["justified"] = [];
  for (const p of Array.from(document.querySelectorAll("p"))) {
    if (skip(p) || !shown(p)) continue;
    const cs = getComputedStyle(p);
    if (cs.textAlign !== "justify") continue;
    const text = (p.textContent ?? "").replace(/­/g, "");
    const spaces: { node: Text; i: number }[] = [];
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode as Text;
      for (let i = 0; i < n.data.length; i++) if (n.data[i] === " ") spaces.push({ node: n, i });
    }
    const measure = () =>
      spaces.map(({ node, i }) => {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const b = r.getBoundingClientRect();
        return { top: Math.round(b.top), width: b.width };
      });
    const justifiedW = measure();
    ctx.font = `${cs.fontStyle === "normal" ? "" : `${cs.fontStyle} `}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const nat = ctx.measureText(" ").width;
    const natural = justifiedW.map((s) => ({ ...s, width: nat }));
    const lineTops = Array.from(new Set(justifiedW.filter((s) => s.width > 0).map((s) => s.top))).sort((a, b) => a - b);
    const range = document.createRange();
    range.selectNodeContents(p);
    const allTops = Array.from(new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))));
    const lines = Math.max(1, new Set(allTops.map((t) => Math.round(t / 4))).size);
    let maxGap = 1;
    let loose = 0;
    const lastTop = Math.max(...lineTops);
    for (const top of lineTops) {
      if (top === lastTop) continue; // dernière ligne : jamais étirée
      const onLine = justifiedW.map((s, k) => ({ s, n: natural[k] })).filter(({ s }) => s.top === top && s.width > 0);
      if (onLine.length < 2) continue;
      const ratios = onLine.slice(0, -1).map(({ s, n }) => (n.width > 0 ? s.width / n.width : 1));
      const r = ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] ?? 1;
      if (r > maxGap) maxGap = r;
      if (r > 1.5) loose++;
    }
    // capacité de la colonne en caractères : largeur / chasse moyenne du texte du paragraphe
    const width = p.getBoundingClientRect().width;
    const advance = ctx.measureText(text).width / Math.max(1, text.length);
    // à l'écran dès l'ouverture : l'équilibreur doit lui garder son nombre de lignes (aucun décalage)
    const firstScreen = p.getBoundingClientRect().top + window.scrollY < window.innerHeight;
    justified.push({ selector: describe(p), lines, chars: Math.round(width / advance), maxGap: Math.round(maxGap * 100) / 100, looseLines: loose, width: Math.round(width), firstScreen });
  }

  return {
    families: Array.from(families),
    italics: Array.from(italics),
    small: Array.from(small),
    saturated: Array.from(saturated),
    spacing: Array.from(spacing),
    leading: Array.from(leading),
    justified,
  };
}
