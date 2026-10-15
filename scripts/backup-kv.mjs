#!/usr/bin/env node
/**
 * Export du stockage technique (Upstash Redis : commandes de démonstration, journaux, preuves de
 * consentement, propositions des agents…) dans un fichier JSON, pour la sauvegarde quotidienne
 * chiffrée (.github/workflows/backup.yml). Les compteurs de limitation de débit (rl:*), éphémères,
 * sont ignorés.
 * Usage : KV_REST_API_URL=… KV_REST_API_TOKEN=… node scripts/backup-kv.mjs sortie.json
 */
import fs from "node:fs";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const out = process.argv[2] ?? "kv.json";
if (!url || !token) {
  console.error("KV_REST_API_URL et KV_REST_API_TOKEN sont requis.");
  process.exit(1);
}

async function cmd(...args) {
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`${args[0]} : ${res.status}`);
  return (await res.json()).result;
}

const data = {};
let cursor = "0";
do {
  const [next, keys] = await cmd("SCAN", cursor, "COUNT", 500);
  cursor = String(next);
  for (const key of keys) {
    if (key.startsWith("rl:")) continue;
    const type = await cmd("TYPE", key);
    const ttl = await cmd("TTL", key);
    if (type === "string") data[key] = { type, ttl, value: await cmd("GET", key) };
    else if (type === "list") data[key] = { type, ttl, value: await cmd("LRANGE", key, 0, -1) };
    else if (type === "hash") data[key] = { type, ttl, value: await cmd("HGETALL", key) };
    else if (type === "set") data[key] = { type, ttl, value: await cmd("SMEMBERS", key) };
  }
} while (cursor !== "0");

fs.writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), keys: Object.keys(data).length, data }));
console.log(`${Object.keys(data).length} clé(s) exportée(s) dans ${out}`);
