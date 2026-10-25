/**
 * Paragraphes d'une description Shopify. La description « texte » de la Storefront API tient sur
 * une seule ligne (balises retirées) : les paragraphes se lisent donc dans `descriptionHtml`,
 * découpé aux fins de bloc. Les espaces insécables de la typographie française sont gardés.
 *
 * Module pur (sans accès réseau) : couvert par les tests unitaires.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "’",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  // guillemets écrits par leur code : une chaîne réduite à « » n'est pas du texte à contrôler
  laquo: String.fromCodePoint(0xab),
  raquo: String.fromCodePoint(0xbb),
  hellip: "…",
};

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });

/** Espaces ordinaires et retours à la ligne seulement : l'espace insécable (U+00A0) reste. */
const squash = (s: string) => s.replace(/[ \t\r\n]+/g, " ").trim();

export function paragraphsOf(html: string | null | undefined, plain = ""): string[] {
  if (html?.trim()) {
    const parts = html
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
      .split(/<\/(?:p|div|h[1-6]|li|blockquote)>|\n{2,}/i)
      .map((x) => squash(decode(x.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""))))
      .filter(Boolean);
    if (parts.length) return parts;
  }
  return plain
    .split(/\n{2,}/)
    .map(squash)
    .filter(Boolean);
}
