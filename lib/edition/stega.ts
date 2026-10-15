/**
 * Marquage invisible des textes en mode Édition.
 *
 * En mode Édition seulement (jamais sur le site public), chaque chaîne d'un document de contenu
 * reçoit à sa fin une courte suite de caractères invisibles qui dit d'où elle vient : document,
 * langue, chemin. L'éditeur, dans la page, retrouve ainsi le texte cliqué sans que chaque composant
 * ait à le déclarer. Fonctions pures, partagées par le serveur et l'éditeur.
 */
const START = "\u2063";
const END = "\u2064";
const DIGITS = ["\u200b", "\u200c", "\u200d", "\u2060"];
const MARK = /\u2063([\u200b\u200c\u200d\u2060]+)\u2064/g;

export interface Source {
  doc: string;
  locale: string;
  path: string;
}

function encodePayload(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (const b of bytes) out += DIGITS[(b >> 6) & 3] + DIGITS[(b >> 4) & 3] + DIGITS[(b >> 2) & 3] + DIGITS[b & 3];
  return out;
}

function decodePayload(zw: string): string {
  const digits = [...zw].map((c) => DIGITS.indexOf(c));
  const bytes = new Uint8Array(Math.floor(digits.length / 4));
  for (let i = 0; i < bytes.length; i++) bytes[i] = (digits[4 * i] << 6) | (digits[4 * i + 1] << 4) | (digits[4 * i + 2] << 2) | digits[4 * i + 3];
  return new TextDecoder().decode(bytes);
}

export const stegaMark = (s: Source) => `${START}${encodePayload(`${s.doc}|${s.locale}|${s.path}`)}${END}`;

/** Sources marquées dans un texte (souvent une seule). */
export function stegaSources(text: string): Source[] {
  const out: Source[] = [];
  for (const m of text.matchAll(MARK)) {
    const [doc, locale, path] = decodePayload(m[1]).split("|");
    if (doc && locale && path !== undefined) out.push({ doc, locale, path });
  }
  return out;
}

export const hasStega = (text: string) => text.includes(START);

/** Texte sans ses marques invisibles. */
export const stegaClean = (text: string) => text.replace(MARK, "");

/** Clés jamais marquées : liens, identifiants, réglages techniques. */
const RAW_KEYS = /^(href|src|url|slug|handle|id|key|type|kind|variant|layout|theme|tone|align|ratio|focal|width|height|mime|mediaType|video|poster|image|images|lang|locale|icon|email|tel|anchor|target|rel|template|collection|products|product|pieces|at|date|status|path)$/i;

/** Marque toutes les chaînes lisibles d'un document (mode Édition seulement). */
export function stegaEncodeDeep<T>(value: T, doc: string, locale: string, path: (string | number)[] = []): T {
  const walk = (v: unknown, p: (string | number)[], key: string): unknown => {
    if (typeof v === "string") {
      if (RAW_KEYS.test(key) || !/\p{L}/u.test(v) || /^(https?:|mailto:|tel:|\/|#)/.test(v)) return v;
      return v + stegaMark({ doc, locale, path: p.join(".") });
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, [...p, i], key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...p, k], k)]));
    return v;
  };
  return walk(value, path, "") as T;
}
