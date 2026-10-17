/**
 * Repérage, dans la page, des textes et images marqués (lib/edition/stega.ts) : chaque élément
 * modifiable reçoit data-ed-src (document|langue|chemin), chaque image data-ed-img.
 */
import { hasStega, stegaClean, stegaSources, type Source } from "@/lib/edition/stega";

export const key = (s: Source) => `${s.doc}|${s.locale}|${s.path}`;
export const parseKey = (k: string): Source => {
  const [doc, locale, path] = k.split("|");
  return { doc, locale, path };
};

const ATTRS = ["alt", "aria-label", "title", "placeholder"] as const;

export interface Found {
  docs: Set<string>;
  texts: number;
  images: number;
}

/** Marque les éléments modifiables de la page ; renvoie les documents rencontrés. */
export function scan(root: ParentNode = document.body): Found {
  const docs = new Set<string>();
  let texts = 0;
  let images = 0;
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!hasStega(node.data)) continue;
    const el = node.parentElement;
    if (!el || el.closest("[data-edition-ui]") || el.closest("title, script, style")) continue;
    const sources = stegaSources(node.data);
    if (!sources.length) continue;
    for (const s of sources) docs.add(s.doc);
    if (!el.dataset.edSrc) {
      el.dataset.edSrc = key(sources[0]);
      if (!el.hasAttribute("tabindex") && !el.closest("a, button")) el.tabIndex = 0;
      texts++;
    }
  }
  for (const attr of ATTRS) {
    for (const el of Array.from((root as Element).querySelectorAll?.(`[${attr}]`) ?? [])) {
      const v = el.getAttribute(attr) ?? "";
      if (!hasStega(v) || el.closest("[data-edition-ui]")) continue;
      const [s] = stegaSources(v);
      if (!s) continue;
      docs.add(s.doc);
      const isImage = el.tagName === "IMG" || el.hasAttribute("data-image-vide");
      if (isImage && attr !== "title") {
        const target = el.closest(".media") ?? el;
        (target as HTMLElement).dataset.edImg = key({ ...s, path: s.path.replace(/\.alt$/, "") });
        images++;
      } else if (!(el as HTMLElement).dataset.edAttr) (el as HTMLElement).dataset.edAttr = `${attr}~${key(s)}`;
    }
  }
  return { docs, texts, images };
}

/** Texte visible d'un élément, sans marques. */
export const visibleText = (el: Element) => stegaClean(el.textContent ?? "");

/** L'élément ne contient qu'un texte (modifiable sur place, sans fenêtre). */
export const editableInPlace = (el: HTMLElement) => el.children.length === 0;

/** Écriture directe dans la page (texte modifié sur place) : hors du rendu de React. */
export function setPageText(el: HTMLElement, text: string) {
  el.textContent = text;
}
export function setEditable(el: HTMLElement, on: boolean) {
  el.contentEditable = on ? "plaintext-only" : "false";
}
