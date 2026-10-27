"use client";
/**
 * Justification sans trou entre les mots (cahier des modifications du 27/10). Sur tablette et
 * ordinateur, les corps de texte sont justifiés (styles/base.css) ; ce composant :
 *  1. place les coupures possibles des mots longs (lib/typo/cesure.ts), pour que chaque ligne se
 *     remplisse sans élargir les espaces, quel que soit le navigateur ;
 *  2. mesure ensuite chaque ligne et, comme les logiciels de mise en page, essaie de très légères
 *     variations de l'interlettrage et de l'espace entre les mots (TRACKING et WORDS, invisibles à
 *     l'œil) : chacune déplace quelques coupures de ligne, et la meilleure répartition est gardée ;
 *  3. une colonne trop étroite pour être justifiée sans trou (moins de MIN_CHARS caractères par
 *     ligne), ou un paragraphe dont un espace dépasse encore MAX_GAP fois l'espace normal (une
 *     adresse e-mail ou un lien qu'on ne coupe pas), passe au fer à gauche plutôt que de garder un
 *     trou (data-justif="gauche"). Tout est refait quand la largeur de la fenêtre change.
 * Les essais se font sur une copie invisible du paragraphe (.justif-mesure), par tranches de
 * BUDGET millisecondes au plus : la page n'est jamais bloquée (le défilement et le fondu entre les
 * pages restent fluides) et le texte visible ne bouge qu'une fois, au réglage retenu.
 * Rien sur téléphone (texte au fer à gauche, motifs de césure jamais téléchargés), rien dans
 * l'Édition (les textes modifiés ne doivent jamais recevoir de coupure invisible).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hyphenateText, type Hyphenate } from "@/lib/typo/cesure";

/** Plus grand espace accepté entre deux mots d'une ligne justifiée, en espaces normaux. */
export const MAX_GAP = 2;
/** Colonne la plus étroite justifiée, en caractères par ligne (en dessous, fer à gauche). */
export const MIN_CHARS = 50;
/** Variations d'interlettrage (em) et d'espace entre les mots (em) essayées, des plus discrètes aux plus fortes. */
const TRACKING = [0, -0.0025, 0.0025, -0.005, 0.005, -0.0075, 0.0075, -0.01, 0.01, -0.0125, 0.0125, -0.015, 0.015];
const WORDS = [0, -0.04];
const WIDE = "(min-width: 48rem)";
/** Travail continu le plus long (ms) avant de rendre la main au navigateur. */
const BUDGET = 8;
/** Ce qui décide des coupures de ligne : recopié du paragraphe sur sa copie de mesure. */
const TYPO = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-stretch",
  "font-variant",
  "font-feature-settings",
  "font-variation-settings",
  "font-optical-sizing",
  "font-kerning",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-transform",
  "text-align",
  "text-align-last",
  "text-indent",
  "hyphens",
  "-webkit-hyphens",
  "hyphenate-limit-chars",
  "text-rendering",
  "white-space",
  "overflow-wrap",
  "word-break",
];

const patterns = new Map<string, Promise<Hyphenate>>();
function loadPatterns(lang: string): Promise<Hyphenate> {
  const key = lang.startsWith("en") ? "en" : "fr";
  if (!patterns.has(key)) {
    const mod = key === "en" ? import("hyphen/en-gb") : import("hyphen/fr");
    patterns.set(key, mod.then((m) => ((m as { hyphenateSync?: Hyphenate }).hyphenateSync ?? (m as unknown as { default: { hyphenateSync: Hyphenate } }).default.hyphenateSync)));
  }
  return patterns.get(key)!;
}

/** Plus grand espace entre deux mots d'une même ligne (dernière ligne exclue), en espaces normaux. */
export function widestGap(p: HTMLElement): number {
  const cs = getComputedStyle(p);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const space = ctx.measureText(" ").width || 1;
  const lines: { top: number; boxes: { l: number; r: number }[] }[] = [];
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    for (const m of node.data.matchAll(/[^\s  ]+/g)) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      for (const r of range.getClientRects()) {
        if (!r.width) continue;
        const mid = r.top + r.height / 2;
        let line = lines.find((x) => Math.abs(x.top - mid) < r.height / 3);
        if (!line) lines.push((line = { top: mid, boxes: [] }));
        line.boxes.push({ l: r.left, r: r.right });
      }
    }
  }
  lines.sort((a, b) => a.top - b.top);
  let worst = 0;
  for (const line of lines.slice(0, -1)) {
    const boxes = line.boxes.sort((a, b) => a.l - b.l);
    for (let i = 1; i < boxes.length; i++) worst = Math.max(worst, (boxes[i].l - boxes[i - 1].r) / space);
  }
  return worst;
}

/** Caractères par ligne d'un paragraphe : largeur de la colonne / chasse moyenne de son texte. */
function charsPerLine(p: HTMLElement): number {
  const cs = getComputedStyle(p);
  const ctx = document.createElement("canvas").getContext("2d");
  const text = (p.textContent ?? "").replace(/\u00ad/g, "");
  if (!ctx || !text) return 0;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return p.getBoundingClientRect().width / (ctx.measureText(text).width / text.length);
}

/** Paragraphes justifiés par la feuille de style (ou passés au fer à gauche par le garde-fou). */
const paragraphs = () => Array.from(document.querySelectorAll<HTMLElement>("main p")).filter((p) => p.dataset.justif === "gauche" || getComputedStyle(p).textAlign === "justify");

/** Rend la main au navigateur (une image peut s'afficher, un défilement se poursuivre). */
const pause = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const reset = (p: HTMLElement) => {
  p.style.removeProperty("letter-spacing");
  p.style.removeProperty("word-spacing");
};
const apply = (p: HTMLElement, tracking: number, words: number) => {
  if (tracking) p.style.letterSpacing = `${tracking}em`;
  else p.style.removeProperty("letter-spacing");
  if (words) p.style.wordSpacing = `${words}em`;
  else p.style.removeProperty("word-spacing");
};

/** Copie invisible du paragraphe, de même largeur et même typographie, pour essayer les réglages. */
function measuringCopy(p: HTMLElement, box: HTMLElement): { copy: HTMLElement; letter: string; word: string } {
  const cs = getComputedStyle(p);
  const copy = p.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.removeAttribute("style");
  for (const prop of TYPO) copy.style.setProperty(prop, cs.getPropertyValue(prop));
  const width = p.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
  copy.style.width = `${width}px`;
  copy.lang = p.closest<HTMLElement>("[lang]")?.lang ?? document.documentElement.lang;
  box.replaceChildren(copy);
  return { copy, letter: cs.letterSpacing, word: cs.wordSpacing };
}

export function Justification({ active }: { active: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!active) return;
    const wide = window.matchMedia(WIDE);
    let cancelled = false;
    let timer = 0;
    let generation = 0;

    // repère lu par les tests : la césure et la mesure sont faites
    const done = () => (document.documentElement.dataset.justification = "1");
    const run = async () => {
      const mine = ++generation;
      const alive = () => !cancelled && mine === generation;
      if (!wide.matches) return done();
      const hyphenate = await loadPatterns(document.documentElement.lang || "fr");
      await document.fonts.ready;
      if (!alive()) return;
      let since = performance.now();
      const breathe = async () => {
        if (performance.now() - since > BUDGET) {
          await pause();
          since = performance.now();
        }
        return alive();
      };
      const box = document.createElement("div");
      box.className = "justif-mesure";
      box.setAttribute("aria-hidden", "true");
      document.body.append(box);
      try {
        for (const p of paragraphs()) {
          if (!p.isConnected) continue;
          if (!p.dataset.cesure) {
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const nodes: Text[] = [];
            while (walker.nextNode()) nodes.push(walker.currentNode as Text);
            for (const n of nodes) {
              const next = hyphenateText(n.data, hyphenate);
              if (next !== n.data) n.data = next;
            }
            p.dataset.cesure = "1";
          }
          // pour chaque paragraphe, le réglage qui donne les espaces les plus réguliers
          delete p.dataset.justif;
          reset(p);
          if (charsPerLine(p) < MIN_CHARS) {
            p.dataset.justif = "gauche";
            if (!(await breathe())) return;
            continue;
          }
          const { copy, letter, word } = measuringCopy(p, box);
          let best = { gap: widestGap(copy), tracking: 0, words: 0 };
          search: for (const words of WORDS) {
            for (const tracking of TRACKING) {
              if (best.gap <= 1.5) break search;
              if (!tracking && !words) continue;
              copy.style.letterSpacing = tracking ? `${tracking}em` : letter;
              copy.style.wordSpacing = words ? `${words}em` : word;
              const gap = widestGap(copy);
              if (gap < best.gap - 0.05) best = { gap, tracking, words };
              if (!(await breathe())) return;
            }
          }
          if (!p.isConnected) continue;
          apply(p, best.tracking, best.words);
          // contrôle sur le vrai paragraphe : aucun trou ne passe, même si la copie différait
          if (best.gap > MAX_GAP || widestGap(p) > MAX_GAP) {
            reset(p);
            p.dataset.justif = "gauche";
          }
          if (!(await breathe())) return;
        }
        done();
      } finally {
        box.remove();
      }
    };
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), 200);
    };
    void run();
    wide.addEventListener("change", later);
    window.addEventListener("resize", later);
    // contenus affichés après coup (filtres, onglets, pages légales dépliées)
    const main = document.querySelector("main");
    const observer = new MutationObserver((records) => {
      if (records.some((r) => r.type === "childList" && r.addedNodes.length)) later();
    });
    if (main) observer.observe(main, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      wide.removeEventListener("change", later);
      window.removeEventListener("resize", later);
      observer.disconnect();
    };
  }, [active, pathname]);
  return null;
}
