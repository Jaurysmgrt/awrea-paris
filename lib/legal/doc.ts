/**
 * Pages légales : un seul gabarit (components/ui/LegalView.tsx) pour deux sources.
 *
 *  - Les textes officiels de la Maison (conditions générales de vente, mentions légales) : documents
 *    de contenu content/site/fr/<doc>.json, modifiables dans l'éditeur « Édition ». Ils sont repris
 *    mot pour mot des ressources officielles et marqués "officiel": true (section ou préambule) :
 *    le contrôle d'écriture n'y vérifie que la typographie, et la page les rend avec data-officiel.
 *  - Les autres pages légales et pratiques (content/fr/legal.ts), écrites dans la voix de la Maison :
 *    elles reprennent des réglages du site (délais, tarifs) et restent cohérentes avec les CGV.
 *
 * Module pur, sans dépendance : importable par les tests.
 */

export type LegalWidget = "cookie-table" | "cookie-settings" | "withdrawal-form" | "withdrawal-model";

/**
 * Bloc d'une page légale. Les textes suivent les conventions de components/legal/LegalText.tsx :
 * {{champ}} (registre légal), [libellé](/chemin) (lien), **mise en valeur**.
 */
export type LegalBlock =
  | string
  | { list: string[] }
  | { lines: string[] }
  | { h3: string; id?: string }
  | { h4: string }
  | { table: { caption: string; head: string[]; rows: string[][] } }
  | { box: { title?: string; paragraphs: string[] } }
  | { widget: LegalWidget };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

/** Page légale écrite dans le code (content/fr/legal.ts). */
export interface LegalPage {
  slug: string;
  title: string;
  seo: { title: string; description: string };
  updated: string;
  version?: string;
  intro: string;
  sections: LegalSection[];
}

// ------------------------------------------------------------------ documents de contenu (JSON)
/** Bloc d'un document juridique de l'éditeur (clés en français, comme les autres documents). */
export type DocBlock =
  | { texte: string }
  | { lignes: string[] }
  | { liste: string[] }
  | { intertitre: string; id?: string }
  | { sousTitre: string }
  | { type: LegalWidget };

export interface DocSection {
  id: string;
  titre: string;
  /** texte officiel de la créatrice, repris mot pour mot */
  officiel?: boolean;
  blocs: DocBlock[];
}

export interface LegalDocContent {
  seo: { title: string; description: string };
  titre: string;
  chapeau?: string;
  /** date de mise à jour, AAAA-MM-JJ */
  misAJour: string;
  /** texte placé sous le titre de la page, avant la première section */
  preambule?: { officiel?: boolean; blocs: DocBlock[] };
  sections: DocSection[];
}

// ------------------------------------------------------------------ vue commune
export interface LegalSectionView extends LegalSection {
  /** texte officiel : rendu avec data-officiel (seule la typographie y est contrôlée) */
  official: boolean;
}

export interface LegalPageView {
  path: string;
  title: string;
  lead?: string;
  updated: string;
  version?: string;
  preamble?: { official: boolean; blocks: LegalBlock[] };
  sections: LegalSectionView[];
}

const WIDGETS: readonly LegalWidget[] = ["cookie-table", "cookie-settings", "withdrawal-form", "withdrawal-model"];

/** Bloc d'un document de l'éditeur → bloc du gabarit. Un bloc inconnu devient un paragraphe vide (ignoré). */
export function blockFromDoc(b: DocBlock): LegalBlock | null {
  if ("texte" in b) return b.texte;
  if ("lignes" in b) return { lines: b.lignes };
  if ("liste" in b) return { list: b.liste };
  if ("intertitre" in b) return b.id ? { h3: b.intertitre, id: b.id } : { h3: b.intertitre };
  if ("sousTitre" in b) return { h4: b.sousTitre };
  if ("type" in b && WIDGETS.includes(b.type)) return { widget: b.type };
  return null;
}

const blocksFromDoc = (blocs: DocBlock[] = []) => blocs.map(blockFromDoc).filter((b): b is LegalBlock => b !== null);

export function fromDoc(doc: LegalDocContent, path: string, extra: { version?: string } = {}): LegalPageView {
  return {
    path,
    title: doc.titre,
    lead: doc.chapeau || undefined,
    updated: doc.misAJour,
    version: extra.version,
    preamble: doc.preambule?.blocs?.length ? { official: doc.preambule.officiel === true, blocks: blocksFromDoc(doc.preambule.blocs) } : undefined,
    sections: doc.sections.map((s) => ({ id: s.id, title: s.titre, official: s.officiel === true, blocks: blocksFromDoc(s.blocs) })),
  };
}

export function fromPage(p: LegalPage): LegalPageView {
  return {
    path: `/${p.slug}`,
    title: p.title,
    lead: p.intro || undefined,
    updated: p.updated,
    version: p.version,
    sections: p.sections.map((s) => ({ ...s, official: false })),
  };
}

// ------------------------------------------------------------------ sommaire
/** Texte lisible d'un intertitre : sans lien ni mise en valeur (conventions de LegalText). */
export const plainText = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");

/** Ancre tirée d'un intertitre : minuscules, sans accents ni ponctuation. */
export const slugify = (s: string) =>
  plainText(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export interface TocEntry {
  id: string;
  title: string;
  official: boolean;
  /** intertitres de la section (deuxième niveau du sommaire) */
  subs: { id: string; title: string }[];
}

/**
 * Sommaire à deux niveaux (rubriques, puis leurs intertitres) : chaque intertitre reçoit une ancre
 * s'il n'en a pas, unique dans la page, pour que tous les liens du sommaire mènent à leur section.
 */
export function withToc(view: LegalPageView): { view: LegalPageView; toc: TocEntry[] } {
  const used = new Set(view.sections.map((s) => s.id));
  const sections = view.sections.map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => {
      if (typeof b !== "object" || !("h3" in b) || b.id) return b;
      const base = slugify(b.h3) || "rubrique";
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      return { ...b, id };
    }),
  }));
  const toc = sections.map((s) => ({
    id: s.id,
    title: s.title,
    official: s.official,
    subs: s.blocks.flatMap((b) => (typeof b === "object" && "h3" in b && b.id ? [{ id: b.id, title: plainText(b.h3) }] : [])),
  }));
  return { view: { ...view, sections }, toc };
}

/** Ancres d'une page (sections et intertitres), pour vérifier les liens « /cgv#… ». */
export function anchorsOf(view: LegalPageView): string[] {
  const ids: string[] = [];
  for (const s of view.sections) {
    ids.push(s.id);
    for (const b of s.blocks) if (typeof b === "object" && "h3" in b && b.id) ids.push(b.id);
  }
  return ids;
}
