/**
 * Documents de contenu de l'éditeur « Édition » : lecture (publiée ou brouillon), brouillons,
 * publication immédiate ou programmée, historique des versions et retour en arrière en un clic.
 *
 * Base : content/site/<langue>/<document>.json (dans Git). Mode `fichiers` : la publication réécrit
 * ce fichier. Mode `stockage` : la version publiée vit dans le stockage technique et prime sur la
 * base, puis est recopiée dans Git si la recopie est branchée (lib/edition/github.ts).
 * Les brouillons ne sont jamais lus par le site public : seulement en mode Édition (lib/edition/read.ts).
 */
import "server-only";
import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { revalidateTag } from "next/cache";
import { kv } from "@/lib/store";
import { DEFAULT_LOCALE, editionStorage, type Locale } from "./config";
import { changedPaths, getAt, setAt, type Path } from "./paths";
import { localize, withFallback } from "./merge";
import { removeFromGit, syncToGit } from "./github";
import { LOCALES } from "./config";

export interface Draft {
  content: unknown;
  updatedAt: string;
  by: string;
}

export interface Version {
  id: string;
  at: string;
  by: string;
  /** chemins modifiés par rapport à la version précédente */
  changed: string[];
  note?: string;
  content: unknown;
}

export interface Scheduled {
  id: string;
  doc: string;
  locale: Locale;
  at: string;
  by: string;
  content: unknown;
  createdAt: string;
}

const draftKey = (doc: string, locale: Locale) => `edition:brouillon:${doc}:${locale}`;
const publishedKey = (doc: string, locale: Locale) => `edition:publie:${doc}:${locale}`;
const historyKey = (doc: string, locale: Locale) => `edition:historique:${doc}:${locale}`;
const SCHEDULE_KEY = "edition:programme";
const HISTORY_MAX = 50;

const DOC_ID = /^[a-z0-9][a-z0-9-]{0,80}$/;
export const isDocId = (id: string) => DOC_ID.test(id);

export const contentDir = () => path.join(process.cwd(), "content", "site");
const fileOf = (doc: string, locale: Locale) => path.join(contentDir(), locale, `${doc}.json`);

// ------------------------------------------------------------------ base (fichiers du dépôt)
const fileCache = new Map<string, { mtime: number; data: unknown }>();

/** Contenu du fichier du dépôt, relu dès qu'il change sur le disque. */
export async function baseDoc(doc: string, locale: Locale): Promise<unknown | null> {
  if (!isDocId(doc)) return null;
  const file = fileOf(doc, locale);
  let mtime = 0;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    return null;
  }
  const hit = fileCache.get(file);
  if (hit && hit.mtime === mtime) return hit.data;
  try {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    fileCache.set(file, { mtime, data });
    return data;
  } catch {
    return null;
  }
}

async function writeBase(doc: string, locale: Locale, content: unknown) {
  const file = fileOf(doc, locale);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(content, null, 2)}\n`);
  await fs.rename(tmp, file);
  fileCache.delete(file);
}

// ------------------------------------------------------------------ lecture
/** Version publiée (sans repli sur une autre langue). */
export async function publishedDoc(doc: string, locale: Locale): Promise<unknown | null> {
  if (editionStorage() === "stockage") {
    const stored = await kv.get<{ content: unknown }>(publishedKey(doc, locale)).catch(() => null);
    if (stored) return stored.content;
  }
  return baseDoc(doc, locale);
}

export async function draftOf(doc: string, locale: Locale): Promise<Draft | null> {
  return kv.get<Draft>(draftKey(doc, locale)).catch(() => null);
}

/** Contenu à afficher : publié (site public), ou brouillon s'il existe (mode Édition). */
export async function readDoc(doc: string, locale: Locale, opts: { draft?: boolean } = {}): Promise<unknown | null> {
  const own = (opts.draft ? (await draftOf(doc, locale))?.content : undefined) ?? (await publishedDoc(doc, locale));
  if (locale === DEFAULT_LOCALE) return own;
  const fr = (opts.draft ? (await draftOf(doc, DEFAULT_LOCALE))?.content : undefined) ?? (await publishedDoc(doc, DEFAULT_LOCALE));
  return withFallback(own, fr);
}

// ------------------------------------------------------------------ brouillons
export async function saveDraftContent(doc: string, locale: Locale, content: unknown, by: string): Promise<Draft> {
  const draft: Draft = { content, updatedAt: new Date().toISOString(), by };
  await kv.set(draftKey(doc, locale), draft);
  return draft;
}

/** Modifie une valeur du brouillon (créé à partir de la version publiée au premier changement). */
export async function saveDraftValue(doc: string, locale: Locale, at: Path, value: unknown, by: string): Promise<Draft> {
  const current = (await draftOf(doc, locale))?.content ?? (await publishedDoc(doc, locale)) ?? {};
  if (locale === DEFAULT_LOCALE) return saveDraftContent(doc, locale, setAt(current, at, value), by);
  const fr = (await draftOf(doc, DEFAULT_LOCALE))?.content ?? (await publishedDoc(doc, DEFAULT_LOCALE));
  const { content, path: own } = localize(fr, current, at);
  return saveDraftContent(doc, locale, setAt(content, own, value), by);
}

export async function draftValue(doc: string, locale: Locale, at: Path): Promise<unknown> {
  const current = (await draftOf(doc, locale))?.content ?? (await publishedDoc(doc, locale));
  return getAt(current, at);
}

export async function discardDraft(doc: string, locale: Locale) {
  await kv.del(draftKey(doc, locale));
}

// ------------------------------------------------------------------ publication
function refresh(doc: string) {
  try {
    revalidateTag(`contenu:${doc}`, { expire: 0 });
    revalidateTag("contenu", { expire: 0 });
  } catch {
    /* hors requête (tâche planifiée locale, script) */
  }
}

export async function historyOf(doc: string, locale: Locale): Promise<Version[]> {
  return (await kv.get<Version[]>(historyKey(doc, locale)).catch(() => null)) ?? [];
}

/** Publie un contenu : la version en ligne part dans l'historique, la nouvelle la remplace. */
export async function publishContent(doc: string, locale: Locale, content: unknown, by: string, note?: string): Promise<Version> {
  const previous = await publishedDoc(doc, locale);
  const now = new Date().toISOString();
  const version: Version = { id: `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at: now, by, changed: changedPaths(previous, content), note, content };
  const history = await historyOf(doc, locale);
  // l'historique garde chaque version publiée, la plus récente en tête (la première est la base du dépôt)
  const seeded = history.length || previous === null ? history : [{ id: "v-depot", at: "", by: "dépôt", changed: [], note: "Version d’origine", content: previous }];
  await kv.set(historyKey(doc, locale), [version, ...seeded].slice(0, HISTORY_MAX));
  if (editionStorage() === "fichiers") await writeBase(doc, locale, content);
  else await kv.set(publishedKey(doc, locale), { content, at: now, by, versionId: version.id });
  refresh(doc);
  void syncToGit(doc, locale, content, `Édition : ${doc} (${locale}) publié par ${by}`).catch((e) => console.error("[édition] recopie Git", e));
  return version;
}

/** Publie le brouillon du document ; rien à faire s'il n'y en a pas. */
export async function publishDraft(doc: string, locale: Locale, by: string): Promise<Version | null> {
  const draft = await draftOf(doc, locale);
  if (!draft) return null;
  const version = await publishContent(doc, locale, draft.content, by);
  await discardDraft(doc, locale);
  return version;
}

/** Retour en arrière en un clic : la version choisie est republiée telle quelle. */
export async function rollback(doc: string, locale: Locale, versionId: string, by: string): Promise<Version | null> {
  const target = (await historyOf(doc, locale)).find((v) => v.id === versionId);
  if (!target) return null;
  return publishContent(doc, locale, target.content, by, `Retour à la version du ${target.at ? new Date(target.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "dépôt"}`);
}

// ------------------------------------------------------------------ programmation
export async function scheduled(): Promise<Scheduled[]> {
  return ((await kv.get<Scheduled[]>(SCHEDULE_KEY).catch(() => null)) ?? []).sort((a, b) => a.at.localeCompare(b.at));
}

/** Programme la publication d'une copie du brouillon ; le brouillon reste modifiable. */
export async function scheduleDraft(doc: string, locale: Locale, at: Date, by: string): Promise<Scheduled | null> {
  const draft = await draftOf(doc, locale);
  if (!draft) return null;
  const item: Scheduled = { id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, doc, locale, at: at.toISOString(), by, content: draft.content, createdAt: new Date().toISOString() };
  await kv.set(SCHEDULE_KEY, [...(await scheduled()).filter((s) => !(s.doc === doc && s.locale === locale)), item]);
  return item;
}

export async function cancelScheduled(id: string) {
  await kv.set(SCHEDULE_KEY, (await scheduled()).filter((s) => s.id !== id));
}

/** Publie ce qui est arrivé à échéance (tâche planifiée, et à chaque ouverture de l'Atelier). */
export async function runScheduled(now = new Date()): Promise<Scheduled[]> {
  const all = await scheduled();
  const due = all.filter((s) => new Date(s.at) <= now);
  if (!due.length) return [];
  await kv.set(SCHEDULE_KEY, all.filter((s) => !due.includes(s)));
  for (const s of due) {
    await publishContent(s.doc, s.locale, s.content, s.by, "Publication programmée");
    const draft = await draftOf(s.doc, s.locale);
    if (draft && JSON.stringify(draft.content) === JSON.stringify(s.content)) await discardDraft(s.doc, s.locale);
  }
  return due;
}

/**
 * Supprime un document entier (page créée depuis un modèle) : brouillons, version publiée,
 * historique, programmations et fichier, dans toutes les langues. Irréversible : l'Atelier le
 * demande à la créatrice avant.
 */
export async function removeDoc(doc: string, by: string) {
  if (!isDocId(doc)) return;
  await kv.set(SCHEDULE_KEY, (await scheduled()).filter((s) => s.doc !== doc));
  for (const locale of LOCALES) {
    await Promise.all([kv.del(draftKey(doc, locale)), kv.del(publishedKey(doc, locale)), kv.del(historyKey(doc, locale))]);
    await fs.rm(fileOf(doc, locale), { force: true });
    fileCache.delete(fileOf(doc, locale));
    void removeFromGit(doc, locale, `Édition : ${doc} (${locale}) supprimé par ${by}`).catch((e) => console.error("[édition] suppression Git", e));
  }
  refresh(doc);
}
