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

export function Justification({ active }: { active: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!active) return;
    const wide = window.matchMedia(WIDE);
    let cancelled = false;
    let timer = 0;

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
    // pour chaque paragraphe, le réglage qui donne les espaces les plus réguliers
    const check = () => {
      for (const p of paragraphs()) {
        delete p.dataset.justif;
        reset(p);
        if (charsPerLine(p) < MIN_CHARS) {
          p.dataset.justif = "gauche";
          continue;
        }
        let best = { gap: widestGap(p), tracking: 0, words: 0 };
        search: for (const words of WORDS) {
          for (const tracking of TRACKING) {
            if (best.gap <= 1.5) break search;
            if (!tracking && !words) continue;
            apply(p, tracking, words);
            const gap = widestGap(p);
            if (gap < best.gap - 0.05) best = { gap, tracking, words };
          }
        }
        if (best.gap > MAX_GAP) {
          reset(p);
          p.dataset.justif = "gauche";
        } else apply(p, best.tracking, best.words);
      }
    };
    // repère lu par les tests : la césure et la mesure sont faites
    const done = () => (document.documentElement.dataset.justification = "1");
    const run = async () => {
      if (!wide.matches) return done();
      const hyphenate = await loadPatterns(document.documentElement.lang || "fr");
      await document.fonts.ready;
      if (cancelled) return;
      for (const p of paragraphs()) {
        if (p.dataset.cesure) continue;
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const n of nodes) {
          const next = hyphenateText(n.data, hyphenate);
          if (next !== n.data) n.data = next;
        }
        p.dataset.cesure = "1";
      }
      check();
      done();
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
