/**
 * Textes gardés par la créatrice malgré un signalement du contrôle d'écriture : ils ne bloquent pas
 * la mise en ligne (scripts/controle-ecriture.ts lit content/ecriture-acceptes.json). En ligne, la
 * liste vit dans le stockage technique et part dans Git avec la recopie, si elle est branchée.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { kv } from "@/lib/store";
import { editionStorage } from "./config";
import { stegaClean } from "./stega";

export interface Accepted {
  texte: string;
  par: string;
  date: string;
  raison?: string;
}

const FILE = () => path.join(process.cwd(), "content", "ecriture-acceptes.json");
const KEY = "edition:acceptes";

export async function acceptedTexts(): Promise<Accepted[]> {
  if (editionStorage() === "fichiers") {
    try {
      return JSON.parse(await fs.readFile(FILE(), "utf8")) as Accepted[];
    } catch {
      return [];
    }
  }
  return (await kv.get<Accepted[]>(KEY).catch(() => null)) ?? [];
}

export async function acceptText(texte: string, par: string, raison?: string) {
  const clean = stegaClean(texte).trim();
  const list = (await acceptedTexts()).filter((a) => a.texte !== clean);
  const next = [...list, { texte: clean, par, date: new Date().toISOString(), raison }];
  if (editionStorage() === "fichiers") await fs.writeFile(FILE(), `${JSON.stringify(next, null, 2)}\n`);
  else await kv.set(KEY, next);
}
