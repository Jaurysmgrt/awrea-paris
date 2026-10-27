/**
 * Audit d'homogénéité d'une page, exécuté dans le navigateur (testeur « homogénéité ») :
 * familles de polices (les deux polices officielles, Fraunces et Cormorant Garamond), italiques
 * (seulement les titres en Fraunces), textes sous 16 px, couleurs saturées (aucune dorure dans
 * l'interface), espacements sur la grille de 8 px, interlignage 1,6 du texte courant (et notes sur
 * la grille), paragraphes justifiés seulement sur tablette et ordinateur, avec césure et assez de
 * caractères par ligne pour qu'aucun trou ne se creuse entre les mots, et mesure des paragraphes
 * (75 caractères par ligne au plus).
 */
export interface DesignAudit {
  families: string[];
  /** italiques hors de la police des titres (Cormorant n'a pas de face italique) */
  italics: string[];
  /** textes sous 16 px (le minimum du design system) */
  small: string[];
  saturated: string[];
  spacing: string[];
  leading: string[];
  /** paragraphes justifiés (alignés à gauche sur téléphone, justifiés au-delà) */
  justified: string[];
  /** paragraphes justifiés sans césure, ou trop étroits (moins de 45 caractères par ligne) */
  gappy: string[];
  /** paragraphes de plusieurs lignes plus larges que 75 caractères */
  wide: string[];
  /** titres alignés à gauche dont le texte qui suit ne commence pas au même bord (à 2 px près) */
  misaligned: string[];
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
      // l'italique appartient aux titres en Fraunces (petits titres en Fraunces 72pt Italic)
      if ((cs.fontStyle === "italic" || cs.fontStyle.startsWith("oblique")) && !/fraunces/i.test(cs.fontFamily)) italics.add(describe(el));
      const size = parseFloat(cs.fontSize);
      if (size > 0 && size < 15.9) small.add(`${describe(el)} ${cs.fontSize}`);
      // interlignage des paragraphes en Cormorant : toujours sur la grille de 8 px ; 1,6 pour le texte
      // courant et les chapeaux (20 → 32, 25 → 40) ; les notes de 18 px prennent la ligne du texte
      // courant (32 px), car 18 × 1,6 sortirait de la grille
      if (el.tagName === "P" && /cormorant/i.test(cs.fontFamily) && cs.textTransform !== "uppercase") {
        const lh = parseFloat(cs.lineHeight);
        const ratio = lh / size;
        if (off8(lh) || (size >= 19.5 && Math.abs(ratio - 1.6) > 0.02)) leading.add(`${describe(el)} ${cs.fontSize}/${cs.lineHeight}`);
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

  // ------------------------------------------------- alignement à gauche et mesure
  const justified: string[] = [];
  const gappy: string[] = [];
  const wide: string[] = [];
  for (const p of Array.from(document.querySelectorAll("p"))) {
    if (skip(p) || !shown(p) || !ownText(p)) continue;
    const cs = getComputedStyle(p);
    // capacité de la colonne en caractères : largeur / chasse moyenne du texte du paragraphe
    const text = p.textContent ?? "";
    ctx.font = `${cs.fontStyle === "normal" ? "" : `${cs.fontStyle} `}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const advance = ctx.measureText(text).width / Math.max(1, text.length);
    const lines = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
    const chars = Math.round(p.getBoundingClientRect().width / advance);
    if (lines > 1 && chars > 75) wide.push(`${describe(p)} ${chars} caractères`);
    if (cs.textAlign === "justify") {
      justified.push(describe(p));
      if (lines > 1 && (chars < 45 || cs.hyphens !== "auto")) gappy.push(`${describe(p)} ${chars} caractères, césure ${cs.hyphens}`);
    }
  }

  // ------------------------------------------------- textes alignés sur leur titre
  // un titre aligné à gauche et le premier paragraphe qui le suit dans le même bloc commencent au
  // même bord, à 2 px près (cahier des modifications du 27/10)
  const misaligned: string[] = [];
  for (const h of Array.from(document.querySelectorAll("h1, h2, h3"))) {
    if (skip(h) || !shown(h) || !/^(left|start)$/.test(getComputedStyle(h).textAlign)) continue;
    let p: Element | null = null;
    let n = h.nextElementSibling;
    for (let i = 0; n && i < 3 && !p; i++, n = n.nextElementSibling) p = n.matches("p") ? n : n.querySelector(":scope > p");
    if (!p || skip(p) || !shown(p) || /^(center|right|end)$/.test(getComputedStyle(p).textAlign)) continue;
    const dx = Math.abs(p.getBoundingClientRect().left - h.getBoundingClientRect().left);
    if (dx > 2) misaligned.push(`${describe(h)} / ${describe(p)} ${Math.round(dx)} px`);
  }

  return {
    families: Array.from(families),
    italics: Array.from(italics),
    small: Array.from(small),
    saturated: Array.from(saturated),
    spacing: Array.from(spacing),
    leading: Array.from(leading),
    justified,
    gappy,
    wide,
    misaligned,
  };
}
