#!/usr/bin/env node
/**
 * Recherche de clés secrètes dans les fichiers suivis par git (intégration continue et contrôle
 * hebdomadaire). Règle de la maison : toutes les clés (Shopify, Supabase, Claude, e-mails…) vivent
 * uniquement dans les variables d'environnement, jamais dans le code ni sur GitHub.
 * Code de sortie 1 si un motif de clé est trouvé.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const PATTERNS = [
  ["Clé Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["Jeton Shopify", /shp(?:at|ca|pa|ss)_[a-fA-F0-9]{20,}/],
  ["Clé Supabase (JWT)", /eyJhbGciOi[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["Clé Supabase (secrète)", /sb_secret_[A-Za-z0-9_-]{20,}/],
  ["Clé Resend", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["Clé Brevo", /xkeysib-[a-f0-9]{40,}/],
  ["Clé Klaviyo privée", /\bpk_[a-f0-9]{30,}/],
  ["Clé AWS", /AKIA[0-9A-Z]{16}/],
  ["Jeton GitHub", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["Jeton Upstash", /\bA[A-Za-z0-9]{40,}=?\b(?=.*upstash)/i],
  ["Clé privée", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ["Jeton Slack", /xox[abposr]-[A-Za-z0-9-]{10,}/],
];
const SKIP = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|webp|avif|gif|ico|mp4|webm|woff2?|pdf|zip))$/i;

const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter((f) => f && !SKIP.test(f) && fs.existsSync(f));
const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("\u0000")) continue; // binaire
  text.split("\n").forEach((line, i) => {
    if (line.includes("secret-scan: ignore")) return;
    // les images intégrées en base64 (data:…) produisent des suites de caractères sans signification
    const clean = line.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "");
    for (const [name, re] of PATTERNS) if (re.test(clean)) hits.push(`${file}:${i + 1}  ${name}`);
  });
}
if (hits.length) {
  console.error(`Clé(s) secrète(s) trouvée(s) dans le dépôt :\n${hits.map((h) => `  ${h}`).join("\n")}\nRetirez-les, révoquez-les chez le fournisseur et placez-les dans les variables d'environnement.`);
  process.exit(1);
}
console.log(`Aucune clé secrète dans les ${files.length} fichiers suivis.`);
