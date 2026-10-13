/**
 * Persistance clé-valeur minimale, utilisée pour :
 * liste d'attente, newsletter, messages, commandes de démo, stocks de démo,
 * propositions et journal d'actions des agents.
 *
 * Pilotes :
 *  - Upstash Redis (REST) si KV_REST_API_URL / KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_*) sont définis
 *    (interrupteur STORE_PROVIDER, lib/config/providers.ts) ;
 *  - fichier JSON local sinon (.data/store.json, ou /tmp sur un environnement en lecture seule).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { providerOf } from "@/lib/config/providers";

export interface KV {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  /** Ajoute en tête de liste et tronque à `cap` éléments */
  push<T>(key: string, value: T, cap?: number): Promise<void>;
  list<T>(key: string, limit?: number): Promise<T[]>;
  /** Incrémente un compteur qui expire après `ttlSeconds` (fenêtres de limitation de débit) */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** Lit un compteur sans l'incrémenter (0 s'il n'existe pas ou a expiré) */
  peek(key: string): Promise<number>;
}

const restUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

class UpstashKV implements KV {
  constructor(private url: string, private token: string) {}
  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV ${args[0]} : ${res.status}`);
    const json = (await res.json()) as { result: T };
    return json.result;
  }
  async get<T>(key: string) {
    const raw = await this.cmd<string | null>("GET", key);
    return raw == null ? null : (JSON.parse(raw) as T);
  }
  async set<T>(key: string, value: T) {
    await this.cmd("SET", key, JSON.stringify(value));
  }
  async del(key: string) {
    await this.cmd("DEL", key);
  }
  async push<T>(key: string, value: T, cap = 1000) {
    await this.cmd("LPUSH", key, JSON.stringify(value));
    await this.cmd("LTRIM", key, 0, cap - 1);
  }
  async list<T>(key: string, limit = 100) {
    const raw = await this.cmd<string[]>("LRANGE", key, 0, limit - 1);
    return (raw ?? []).map((r) => JSON.parse(r) as T);
  }
  async incr(key: string, ttlSeconds: number) {
    const n = await this.cmd<number>("INCR", key);
    if (n === 1) await this.cmd("EXPIRE", key, ttlSeconds);
    return n;
  }
  async peek(key: string) {
    return Number((await this.cmd<string | null>("GET", key)) ?? 0);
  }
}

type FileData = Record<string, unknown>;

class FileKV implements KV {
  private cache: FileData | null = null;
  private writing: Promise<void> = Promise.resolve();
  constructor(private file: string) {}

  private async load(): Promise<FileData> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs.readFile(this.file, "utf8")) as FileData;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }
  private async save() {
    const data = JSON.stringify(this.cache ?? {}, null, 1);
    this.writing = this.writing.then(async () => {
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(this.file, data);
      } catch {
        /* système de fichiers en lecture seule : on reste en mémoire */
      }
    });
    await this.writing;
  }
  async get<T>(key: string) {
    const d = await this.load();
    return (d[key] as T) ?? null;
  }
  async set<T>(key: string, value: T) {
    const d = await this.load();
    d[key] = value;
    await this.save();
  }
  async del(key: string) {
    if (this.counters.delete(key)) return;
    const d = await this.load();
    delete d[key];
    await this.save();
  }
  async push<T>(key: string, value: T, cap = 1000) {
    const d = await this.load();
    const arr = ((d[key] as T[]) ?? []).slice(0, cap - 1);
    d[key] = [value, ...arr];
    await this.save();
  }
  async list<T>(key: string, limit = 100) {
    const d = await this.load();
    return ((d[key] as T[]) ?? []).slice(0, limit);
  }
  // compteurs en mémoire seulement : inutile de réécrire le fichier à chaque requête
  private counters = new Map<string, { n: number; exp: number }>();
  async incr(key: string, ttlSeconds: number) {
    const now = Date.now();
    const c = this.counters.get(key);
    const next = c && c.exp > now ? { n: c.n + 1, exp: c.exp } : { n: 1, exp: now + ttlSeconds * 1000 };
    this.counters.set(key, next);
    if (this.counters.size > 5000) for (const [k, v] of this.counters) if (v.exp <= now) this.counters.delete(k);
    return next.n;
  }
  async peek(key: string) {
    const c = this.counters.get(key);
    return c && c.exp > Date.now() ? c.n : 0;
  }
}

function fileLocation() {
  if (process.env.AWREA_STORE_FILE) return process.env.AWREA_STORE_FILE;
  // fichier distinct (tests de bout en bout menés à côté du serveur de développement, par exemple)
  if (process.env.STORE_FILE) return path.resolve(process.env.STORE_FILE);
  if (process.env.VERCEL) return "/tmp/awrea-store.json";
  return path.join(process.cwd(), ".data", "store.json");
}

const g = globalThis as unknown as { __awreaKV?: KV };

export const storeMode: "upstash" | "file" = providerOf("store") === "upstash" ? "upstash" : "file";

export const kv: KV = g.__awreaKV ?? (g.__awreaKV = storeMode === "upstash" ? new UpstashKV(restUrl!, restToken!) : new FileKV(fileLocation()));
