#!/usr/bin/env node
/**
 * Facteurs d'émission du site, calculés avec CO2.js (The Green Web Foundation) selon le
 * modèle Sustainable Web Design v4. Le résultat (quelques nombres) est écrit dans
 * lib/eco/constants.json : la bibliothèque elle-même n'est jamais envoyée aux visiteuses.
 * Relancer après une mise à jour de CO2.js : npm run eco:constants
 */
import fs from "node:fs";
import path from "node:path";
import { co2 } from "@tgwf/co2";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const swd = new co2({ model: "swd", version: 4 });
const GB = 1e9;
const out = {
  model: "Sustainable Web Design v4 (CO2.js)",
  generatedWith: JSON.parse(fs.readFileSync(path.join(root, "node_modules/@tgwf/co2/package.json"), "utf8")).version,
  /** grammes d'équivalent CO2 par octet transféré, hébergement vert certifié ou non */
  gramsPerByteGreen: Number(swd.perByte(GB, true)) / GB,
  gramsPerByteGrey: Number(swd.perByte(GB, false)) / GB,
};
fs.writeFileSync(path.join(root, "lib/eco/constants.json"), JSON.stringify(out, null, 2) + "\n");
console.log(out);
