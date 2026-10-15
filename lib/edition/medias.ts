/**
 * Photos déposées dans l'éditeur : recadrées selon leur orientation, compressées et déclinées en
 * plusieurs largeurs (WebP), avec un point focal réglable qui guide tous les recadrages
 * (object-position) et un texte alternatif proposé puis modifiable.
 *
 * Où vont les fichiers :
 *  - mode `fichiers` (local) : public/media/edition/, donc dans Git (servis aussi par
 *    app/media/edition/[fichier]/route.ts quand le serveur a été compilé avant leur dépôt) ;
 *  - mode `stockage` avec Supabase : le compartiment public « medias » de Supabase Storage ;
 *  - mode `stockage` sans Supabase (démonstration en ligne) : le stockage technique, une seule taille.
 * Jamais d'image générée ni de banque d'images : seulement ce que la créatrice dépose.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/db/supabase";
import { editionStorage } from "./config";
import type { Img } from "./blocks";

export const WIDTHS = [480, 960, 1200, 1920] as const;
const BUCKET = "medias";
export const MEDIA_DIR = () => path.join(process.cwd(), "public", "media", "edition");
const LIBRARY_KEY = "edition:medias";
export const MAX_UPLOAD = 12 * 1024 * 1024;

export interface MediaEntry extends Img {
  id: string;
  name: string;
  at: string;
  by: string;
}

/** Nom de fichier d'une déclinaison, selon la convention de lib/media.ts (1200 px : sans suffixe). */
const variantName = (id: string, w: number) => (w === 1200 ? `${id}.webp` : `${id}-${w}.webp`);

async function store(id: string, files: { name: string; data: Buffer }[]): Promise<string> {
  if (editionStorage() === "fichiers") {
    await fs.mkdir(MEDIA_DIR(), { recursive: true });
    for (const f of files) await fs.writeFile(path.join(MEDIA_DIR(), f.name), f.data);
    return `/media/edition/${id}`;
  }
  if (isSupabaseConfigured && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const f of files) {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/edition/${f.name}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "image/webp", "Cache-Control": "31536000", "x-upsert": "false" },
        body: new Uint8Array(f.data),
      });
      if (!res.ok) throw new Error(`stockage des images ${res.status}`);
    }
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/edition/${id}`;
  }
  // démonstration en ligne : une seule taille, dans le stockage technique
  const main = files.find((f) => f.name === `${id}.webp`) ?? files[files.length - 1];
  const kvId = id.replace(/[^a-z0-9]/g, "").slice(0, 40);
  await kv.set(`media:${kvId}`, { id: kvId, name: main.name, mediaType: "image/webp", data: main.data.toString("base64"), width: 0, height: 0 });
  return `/api/media/${kvId}`;
}

/** Traite une photo déposée et renvoie l'image prête pour un document (point focal au centre). */
export async function ingestImage(input: Buffer, name: string, by: string, alt: string): Promise<MediaEntry> {
  if (input.length > MAX_UPLOAD) throw new Error("Cette photo est trop lourde (12 Mo au plus).");
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Ce fichier n’est pas une photo lisible.");
  const ratio = meta.height / meta.width;
  const id = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(5).toString("hex")}`;
  const widths = WIDTHS.filter((w) => w <= Math.max(meta.width!, 480));
  const files = await Promise.all(
    widths.map(async (w) => ({ name: variantName(id, w), data: await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer() })),
  );
  // la convention des images locales demande la taille 1200 : la plus grande disponible en tient lieu
  if (!files.some((f) => f.name === `${id}.webp`)) files.push({ name: `${id}.webp`, data: files[files.length - 1].data });
  for (const w of [480, 960]) if (!files.some((f) => f.name === variantName(id, w))) files.push({ name: variantName(id, w), data: files[0].data });
  const src = await store(id, files);
  const width = Math.min(meta.width, 1200);
  const entry: MediaEntry = { id, name: name.slice(0, 120), src, alt, width, height: Math.round(width * ratio), focal: { x: 50, y: 50 }, at: new Date().toISOString(), by };
  const library = (await kv.get<MediaEntry[]>(LIBRARY_KEY).catch(() => null)) ?? [];
  await kv.set(LIBRARY_KEY, [entry, ...library].slice(0, 400));
  return entry;
}

export async function mediaLibrary(): Promise<MediaEntry[]> {
  return (await kv.get<MediaEntry[]>(LIBRARY_KEY).catch(() => null)) ?? [];
}

/** Texte alternatif de départ, tiré du nom du fichier (« robe-odessa-dos.jpg » → « Robe odessa dos »). */
export function altFromName(name: string): string {
  const words = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\b(img|dsc|photo|image|copie|copy|final|\d{3,})\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return words.length >= 3 ? words[0].toUpperCase() + words.slice(1) : "";
}
