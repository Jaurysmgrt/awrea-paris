#!/usr/bin/env node
/**
 * Contrôle de sécurité quotidien (lancé par l'agent de maintenance, .github/workflows/maintenance.yml) :
 *  1. certificat TLS du domaine : validité restante (alerte sous 21 jours) ;
 *  2. HTTP → HTTPS et version unique du domaine (www / sans www) ;
 *  3. en-têtes de sécurité (CSP, HSTS avec préchargement, X-Frame-Options, nosniff,
 *     Referrer-Policy, Permissions-Policy) et absence de « unsafe-inline » dans les scripts ;
 *  4. vulnérabilités des dépendances (npm audit, niveau élevé et critique) ;
 *  5. journal interne des dernières 24 heures (/api/cron/security, avec CRON_SECRET) :
 *     échecs et blocages de connexion à l'Atelier, connexions inhabituelles, requêtes refusées.
 *
 * Usage : node scripts/security-check.mjs [https://www.awreaparis.com] [--json rapport.json]
 * Code de sortie 1 si un point critique est trouvé (le flux de maintenance ouvre alors une alerte).
 */
import tls from "node:tls";
import fs from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const site = new URL(args.find((a) => a.startsWith("http")) ?? process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.awreaparis.com");
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const findings = [];
const add = (level, check, message) => findings.push({ level, check, message });

function certificateDays(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert?.valid_to ? Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000) : null);
    });
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function head(url, redirect = "manual") {
  return fetch(url, { method: "GET", redirect, headers: { "User-Agent": "AwreaSecurityCheck/1.0", Accept: "text/html" } });
}

// 1. certificat
const days = await certificateDays(site.hostname);
if (days === null) add("critique", "TLS", `Certificat illisible pour ${site.hostname}.`);
else if (days < 21) add(days < 7 ? "critique" : "alerte", "TLS", `Le certificat expire dans ${days} jour(s) (renouvellement automatique Vercel à vérifier).`);
else add("ok", "TLS", `Certificat valide encore ${days} jours.`);

// 2. redirections
try {
  const http = await head(`http://${site.host}/`);
  const loc = http.headers.get("location") ?? "";
  if (![301, 308].includes(http.status) || !loc.startsWith("https://")) add("critique", "HTTPS", `http:// ne redirige pas en permanence vers https:// (statut ${http.status}).`);
  else add("ok", "HTTPS", "http:// redirige vers https://.");
  const other = site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`;
  const alt = await head(`https://${other}/`).catch(() => null);
  if (!alt) add("alerte", "Domaine unique", `${other} est injoignable : déclarer les deux versions du domaine dans Vercel (l'une redirigée vers l'autre).`);
  else if (![301, 308].includes(alt.status)) add("alerte", "Domaine unique", `${other} ne redirige pas vers ${site.hostname} (statut ${alt.status}).`);
  else add("ok", "Domaine unique", `${other} redirige vers ${site.hostname}.`);
} catch (e) {
  add("alerte", "HTTPS", `Vérification des redirections impossible : ${e.message}`);
}

// 3. en-têtes
try {
  const res = await head(site.href, "follow");
  const h = (k) => res.headers.get(k) ?? "";
  const csp = h("content-security-policy");
  const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  if (!csp) add("critique", "CSP", "Aucune politique de sécurité du contenu.");
  else if (scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes("'nonce-")) add("alerte", "CSP", "La CSP autorise « unsafe-inline » pour les scripts (mode statique) : note A au lieu de A+ sur securityheaders.com.");
  else add("ok", "CSP", "CSP stricte (nonce + strict-dynamic).");
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) if (csp && !csp.includes(d)) add("alerte", "CSP", `Directive manquante : ${d}.`);
  const hsts = h("strict-transport-security");
  const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
  if (!hsts || maxAge < 31_536_000 || !hsts.includes("includeSubDomains") || !hsts.includes("preload")) add("critique", "HSTS", `En-tête HSTS insuffisant : « ${hsts || "absent"} ».`);
  else add("ok", "HSTS", "HSTS deux ans, sous-domaines, préchargement.");
  const expect = { "x-frame-options": /deny/i, "x-content-type-options": /nosniff/i, "referrer-policy": /strict-origin/i, "permissions-policy": /camera=\(\)/ };
  for (const [k, re] of Object.entries(expect)) if (!re.test(h(k))) add("alerte", "En-têtes", `${k} absent ou trop permissif.`);
  if (h("x-powered-by")) add("alerte", "En-têtes", "x-powered-by révèle la technologie du site.");
} catch (e) {
  add("critique", "En-têtes", `Site injoignable : ${e.message}`);
}

// 4. dépendances
try {
  let out;
  try {
    out = execSync("npm audit --omit=dev --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    out = e.stdout; // npm audit sort en erreur dès qu'il trouve une vulnérabilité
  }
  const v = JSON.parse(out || "{}").metadata?.vulnerabilities ?? {};
  if ((v.critical ?? 0) > 0) add("critique", "Dépendances", `${v.critical} vulnérabilité(s) critique(s) en production (npm audit).`);
  else if ((v.high ?? 0) > 0) add("alerte", "Dépendances", `${v.high} vulnérabilité(s) élevée(s) en production (npm audit).`);
  else add("ok", "Dépendances", `Aucune vulnérabilité élevée ou critique en production (${v.moderate ?? 0} modérée(s), ${v.low ?? 0} faible(s)).`);
} catch (e) {
  add("alerte", "Dépendances", `npm audit indisponible : ${e.message}`);
}

// 5. journal interne
if (process.env.CRON_SECRET) {
  try {
    const res = await fetch(new URL("/api/cron/security", site), { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const j = await res.json();
    const d = j.digest ?? {};
    add(j.ok ? "ok" : "alerte", "Journal", `24 h : ${d.adminLogins ?? 0} connexion(s), ${d.adminFailures ?? 0} échec(s), ${d.adminBlocked ?? 0} blocage(s), ${d.unusualLogins ?? 0} inhabituelle(s), ${d.csrfBlocked ?? 0} origine(s) étrangère(s), ${d.rateLimited ?? 0} excès de débit.`);
    for (const w of j.warnings ?? []) add(/inhabituelle|suspects/.test(w) ? "critique" : "alerte", "Réglages", w);
  } catch (e) {
    add("alerte", "Journal", `Journal de sécurité illisible : ${e.message}`);
  }
} else add("alerte", "Journal", "CRON_SECRET absent : journal interne non lu.");

const order = { critique: 0, alerte: 1, ok: 2 };
findings.sort((a, b) => order[a.level] - order[b.level]);
const icon = { critique: "✗", alerte: "!", ok: "✓" };
const report = [`Contrôle de sécurité — ${site.hostname} — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, ...findings.map((f) => `${icon[f.level]} [${f.check}] ${f.message}`)].join("\n");
console.log(report);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ site: site.href, at: new Date().toISOString(), findings }, null, 2));
process.exit(findings.some((f) => f.level === "critique") ? 1 : 0);
