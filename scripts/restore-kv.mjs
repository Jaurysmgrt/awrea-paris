#!/usr/bin/env node
/**
 * Restauration du stockage technique depuis un export de scripts/backup-kv.mjs (déchiffré).
 * Par prudence, rien n'est écrit sans --confirmer ; les clés existantes sont remplacées.
 * Usage : KV_REST_API_URL=… KV_REST_API_TOKEN=… node scripts/restore-kv.mjs kv.json --confirmer
 */
import fs from "node:fs";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const file = process.argv[2];
const confirmed = process.argv.includes("--confirmer");
if (!file) {
  console.error("Usage : node scripts/restore-kv.mjs kv.json --confirmer");
  process.exit(1);
}
const dump = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`Export du ${dump.exportedAt} : ${dump.keys} clé(s).`);
if (!confirmed || !url || !token) {
  console.log(confirmed ? "KV_REST_API_URL et KV_REST_API_TOKEN sont requis." : "Vérification seule (ajoutez --confirmer pour écrire).");
  process.exit(confirmed ? 1 : 0);
}

async function cmd(...args) {
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`${args[0]} : ${res.status}`);
  return (await res.json()).result;
}

for (const [key, { type, ttl, value }] of Object.entries(dump.data)) {
  await cmd("DEL", key);
  if (type === "string") await cmd("SET", key, value);
  else if (type === "list" && value.length) await cmd("RPUSH", key, ...value);
  else if (type === "hash") await cmd("HSET", key, ...Object.entries(value).flat());
  else if (type === "set" && value.length) await cmd("SADD", key, ...value);
  if (ttl > 0) await cmd("EXPIRE", key, ttl);
}
console.log("Restauration terminée.");
