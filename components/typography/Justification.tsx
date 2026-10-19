"use client";
/**
 * Justification régulière (MARQUE.md § 3).
 *
 * Le navigateur justifie ligne à ligne : quand le mot suivant ne tient pas, il étire les espaces
 * de la ligne, parfois jusqu'à creuser des trous. Comme un typographe, on choisit pour chaque
 * paragraphe, parmi quelques réglages très légers de l'espacement des mots et des lettres
 * (±1 % au plus), celui qui donne les espaces les plus réguliers : on mesure les espaces réels de
 * chaque ligne (Range), on compare à l'espace naturel de la police, on garde le meilleur.
 * L'espace naturel est mesuré dans la police réelle du paragraphe (Cormorant Garamond pour le texte
 * courant : 0,234 em ; style, graisse, taille et famille calculés), une fois les polices chargées.
 *
 * - Amélioration progressive : sans JavaScript, la justification et la césure du navigateur
 *   restent en place. Seul le style du paragraphe change, jamais son contenu (aucun conflit avec
 *   React).
 * - Aucun décalage visible : un paragraphe déjà à l'écran garde son nombre de lignes.
 * - Paresseux : seuls les paragraphes proches de l'écran sont traités, par petites tranches,
 *   pendant les temps morts du navigateur ; un changement de largeur les fait reprendre.
 * - Dernier recours : si aucun réglage n'évite un trou (colonne étroite, mot très long, texte
 *   récrit dans l'éditeur), le paragraphe passe en fer à gauche plutôt que de garder une lézarde.
 *   Les lignes restent les mêmes (l'alignement ne change pas les coupures) : rien ne bouge.
 * - Les tests (tests/e2e/homogeneite.spec.ts) relancent le calcul avec l'évènement
 *   « awrea:justifier » (detail.tout : toute la page) et attendent `data-justification="pret"`.
 */
import { useEffect } from "react";

/** [espacement des mots, espacement des lettres], en em, du plus proche au plus éloigné du réglage d'origine */
const VARIANTS: [number, number][] = [
  [0, 0],
  [-0.02, 0],
  [-0.04, 0],
  [0, -0.005],
  [0, 0.005],
  [-0.06, 0],
  [-0.03, -0.005],
  [-0.03, 0.005],
  [-0.06, -0.008],
  [-0.05, 0.008],
];
/** réglages de secours, essayés seulement si un trou subsiste (toujours dans ±1 %) */
const EXTRA: [number, number][] = [
  [-0.08, 0],
  [-0.08, -0.01],
  [-0.01, -0.01],
  [-0.02, 0.01],
  [-0.07, 0.01],
];
/** recherche fine (paragraphes à l'écran, tenus de garder leur nombre de lignes, et trous tenaces) */
const FINE: [number, number][] = [];
for (let ws = -0.08; ws <= 0.021; ws += 0.02) for (let ls = -0.012; ls <= 0.0121; ls += 0.004) FINE.push([Math.round(ws * 100) / 100, Math.round(ls * 1000) / 1000]);
const GOOD = 1.3; // au-delà, on cherche un meilleur réglage
const LOOSE = 1.8; // au-delà, on essaie aussi les réglages de secours
const STUBBORN = 2; // au-delà, recherche fine
/** espace le plus large toléré (rapporté à l'espace naturel) ; au-delà, fer à gauche */
const HOLE = () => (window.innerWidth < 400 ? 2.35 : 1.9);

type Measure = { lines: number; gaps: number[] };

const canvas = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
const naturalSpace = new Map<string, number>();

function measure(p: HTMLElement): Measure {
  const cs = getComputedStyle(p);
  // police réelle du paragraphe : le style compte (un paragraphe en Fraunces est en italique)
  const font = `${cs.fontStyle === "normal" ? "" : `${cs.fontStyle} `}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  let nat = naturalSpace.get(font);
  if (!nat && canvas) {
    canvas.font = font;
    nat = canvas.measureText(" ").width;
    naturalSpace.set(font, nat);
  }
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
  const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh));
  if (!nat || lines < 2) return { lines, gaps: [] };
  const byLine = new Map<number, number[]>();
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const data = node.data;
    for (let i = data.indexOf(" "); i !== -1; i = data.indexOf(" ", i + 1)) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width <= 0) continue;
      const top = Math.round(r.top);
      const list = byLine.get(top);
      if (list) list.push(r.width);
      else byLine.set(top, [r.width]);
    }
  }
  const tops = Array.from(byLine.keys()).sort((a, b) => a - b);
  tops.pop(); // la dernière ligne n'est jamais étirée
  const gaps: number[] = [];
  for (const t of tops) {
    const ws = byLine.get(t)!.sort((a, b) => a - b);
    if (ws.length < 2) continue;
    // l'espace en fin de ligne déborde : la médiane donne l'espace de la ligne
    gaps.push(ws[Math.floor((ws.length - 1) / 2)] / nat);
  }
  return { lines, gaps };
}

const score = (m: Measure) => (m.gaps.length ? Math.max(...m.gaps) + 0.15 * m.gaps.reduce((s, g) => s + Math.max(0, g - 1.4), 0) : 0);

function apply(p: HTMLElement, [ws, ls]: [number, number]) {
  p.style.wordSpacing = ws ? `${ws}em` : "";
  p.style.letterSpacing = ls ? `${ls}em` : "";
  p.style.textAlign = "";
  delete p.dataset.ferAGauche;
}

function balance(p: HTMLElement) {
  apply(p, [0, 0]);
  const base = measure(p);
  p.dataset.justifie = "1";
  if (!base.gaps.length || Math.max(...base.gaps) <= GOOD) return;
  const r = p.getBoundingClientRect();
  const onScreen = r.bottom > 0 && r.top < window.innerHeight;
  let best = { v: [0, 0] as [number, number], s: score(base) };
  const tryAll = (list: [number, number][]) => {
    for (const v of list) {
      if (v[0] === 0 && v[1] === 0) continue;
      apply(p, v);
      const m = measure(p);
      // à l'écran, le paragraphe garde sa hauteur : rien ne bouge autour de lui
      if (onScreen && m.lines !== base.lines) continue;
      const s = score(m);
      if (s < best.s - 0.01) best = { v, s };
    }
  };
  tryAll(VARIANTS);
  if (best.s > LOOSE) tryAll(EXTRA);
  if (best.s > STUBBORN || (onScreen && best.s > LOOSE)) tryAll(FINE);
  apply(p, best.v);
  const widest = Math.max(0, ...measure(p).gaps);
  if (widest > HOLE()) {
    // aucun réglage ne suffit : fer à gauche, sans réglage d'espacement (mêmes lignes, rien ne bouge)
    apply(p, [0, 0]);
    p.style.textAlign = "left";
    p.dataset.ferAGauche = "1";
  }
}

const candidate = (p: Element): p is HTMLParagraphElement =>
  p instanceof HTMLParagraphElement && !p.closest("[contenteditable], [data-justification='natif']") && getComputedStyle(p).textAlign === "justify";

export function Justification() {
  useEffect(() => {
    if (!canvas || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    // le composant est monté : les tests peuvent envoyer « awrea:justifier »
    root.dataset.justification ??= "en-cours";
    const queue = new Set<HTMLElement>();
    const widths = new WeakMap<Element, number>();
    let scheduled = false;
    let alive = true;

    // Safari n'a pas requestIdleCallback : petites tranches de 8 ms
    const idle = (cb: (deadline?: IdleDeadline) => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 400 }) : setTimeout(() => cb(), 16);

    const run = (deadline?: IdleDeadline) => {
      scheduled = false;
      const start = performance.now();
      for (const p of queue) {
        queue.delete(p);
        if (p.isConnected && p.getBoundingClientRect().width > 0) {
          balance(p);
          widths.set(p, Math.round(p.getBoundingClientRect().width));
        }
        const budget = deadline ? deadline.timeRemaining() > 2 : performance.now() - start < 8;
        if (!budget) break;
      }
      if (queue.size) schedule();
      else root.dataset.justification = "pret";
    };
    const schedule = () => {
      if (scheduled || !alive) return;
      scheduled = true;
      root.dataset.justification = "en-cours";
      idle(run);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const p = e.target as HTMLElement;
          if (p.dataset.justifie) continue;
          queue.add(p);
        }
        schedule();
      },
      { rootMargin: "100% 0px" },
    );
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const p = e.target as HTMLElement;
        const w = Math.round(e.contentRect.width);
        if (!p.dataset.justifie || widths.get(p) === w) continue;
        delete p.dataset.justifie;
        apply(p, [0, 0]);
        io.unobserve(p);
        io.observe(p);
      }
    });
    const watched = new WeakSet<Element>();
    const scan = (scope: ParentNode) => {
      for (const p of Array.from(scope.querySelectorAll("p"))) {
        if (watched.has(p) || !candidate(p)) continue;
        watched.add(p);
        io.observe(p);
        ro.observe(p);
      }
    };
    // « awrea:justifier » : tout recalculer (par exemple après une césure ajoutée) ; avec
    // { detail: { tout: true } }, tous les paragraphes sont traités sans attendre le défilement
    const reset = (e: Event) => {
      const all = Boolean((e as CustomEvent<{ tout?: boolean }>).detail?.tout);
      for (const p of Array.from(document.querySelectorAll<HTMLElement>("p[data-justifie]"))) {
        delete p.dataset.justifie;
        apply(p, [0, 0]);
        io.unobserve(p);
        io.observe(p);
      }
      scan(document);
      if (all) for (const p of Array.from(document.querySelectorAll("p"))) if (candidate(p)) queue.add(p);
      root.dataset.justification = "en-cours";
      schedule();
    };

    let mo: MutationObserver | null = null;
    document.fonts.ready.then(() => {
      if (!alive) return;
      scan(document);
      schedule();
      // nouvelles pages (navigation sans rechargement) et textes qui changent
      let pending = 0;
      mo = new MutationObserver((records) => {
        for (const r of records) {
          const p = (r.target instanceof Element ? r.target : r.target.parentElement)?.closest("p[data-justifie]") as HTMLElement | null;
          if (p) {
            delete p.dataset.justifie;
            queue.add(p);
          }
        }
        window.clearTimeout(pending);
        pending = window.setTimeout(() => {
          scan(document);
          schedule();
        }, 120);
      });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    window.addEventListener("awrea:justifier", reset);
    return () => {
      alive = false;
      io.disconnect();
      ro.disconnect();
      mo?.disconnect();
      window.removeEventListener("awrea:justifier", reset);
    };
  }, []);
  return null;
}
