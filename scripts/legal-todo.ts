/**
 * Génère LEGAL-A-COMPLETER.md à partir du registre content/legal/fields.ts.
 * Usage : npm run legal:todo
 */
import fs from "node:fs";
import path from "node:path";
import { commercialChecks, legalFields } from "../content/legal/fields.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pageNames: Record<string, string> = {
  "mentions-legales": "Mentions légales",
  cgv: "CGV",
  cgu: "CGU",
  confidentialite: "Confidentialité",
  "propriete-intellectuelle": "Propriété intellectuelle",
  retractation: "Rétractation",
};

const entries = Object.entries(legalFields);
const missing = entries.filter(([, f]) => !f.value);
const done = entries.filter(([, f]) => f.value);

const lines: string[] = [];
lines.push("# Informations légales à compléter — Awrea Paris", "");
lines.push(
  "> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :",
  "> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère doré « [À COMPLÉTER : …] ».",
  "> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.",
  "",
);
lines.push(`**${missing.length} information(s) à fournir** sur ${entries.length}.`, "");
lines.push("## Informations de l’entreprise", "");
lines.push("| Champ | Information attendue | Où la trouver | Pages concernées |", "|---|---|---|---|");
for (const [key, f] of missing) {
  lines.push(`| \`${key}\` | ${f.label} | ${f.source} | ${f.pages.map((p) => `${pageNames[p] ?? p} (\`/${p}\`)`).join(", ")} |`);
}
if (done.length) {
  lines.push("", "### Déjà renseignées", "");
  for (const [key, f] of done) lines.push(`- \`${key}\` — ${f.label} : ${f.value}`);
}
lines.push("", "## Conditions commerciales à confirmer", "");
lines.push("Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans les CGV et la page Livraison et retours :", "");
for (const c of commercialChecks) lines.push(`- [ ] ${c}`);
lines.push("", "## Autres informations à confirmer", "");
lines.push(
  "- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », hypothèse à confirmer — l’ancien site était publié sur GitHub Pages).",
  "- [ ] Adresse e-mail de contact publiée partout sur le site : `content/brand/identity.ts` → `email` (actuellement « contact@awreaparis.com », à confirmer ou remplacer).",
  "- [ ] Adresse e-mail presse : `content/fr/legal.ts` → `press.contact.email` (actuellement « presse@awreaparis.com », à confirmer).",
  "- [ ] Téléphone et adresse de l’atelier (facultatifs, publiés seulement s’ils sont renseignés) : `content/brand/identity.ts` → `phone`, `address`.",
  "- [ ] Année de création de la maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`.",
  "- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).",
  "",
  "## Avant la mise en ligne",
  "",
  "- [ ] Faire relire l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste.",
  "- [ ] Signer la convention avec un médiateur de la consommation et renseigner le champ `mediateur`.",
  "- [ ] Vérifier dans Shopify : politiques (CGV, confidentialité, retours) liées au checkout, droits et taxes (Shopify Markets), paiement en plusieurs fois.",
  "- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.",
  "- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.",
  "",
);
fs.writeFileSync(path.join(root, "LEGAL-A-COMPLETER.md"), lines.join("\n"));
console.log(`LEGAL-A-COMPLETER.md : ${missing.length} champ(s) à compléter sur ${entries.length}.`);
