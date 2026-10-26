/**
 * Génère LEGAL-A-COMPLETER.md à partir du registre content/legal/fields.ts.
 * Usage : npm run legal:todo
 *
 * Le début du fichier (informations de l'entreprise, conditions commerciales) est produit ici. La
 * suite, tenue à la main par les équipes (pièces de la collection, écarts entre les CGV officielles
 * et le site, autres informations, avant la mise en ligne), est reprise telle quelle du fichier
 * existant, à partir du titre HAND_START : relancer le script ne l'efface jamais.
 */
import fs from "node:fs";
import path from "node:path";
import { commercialChecks, legalFields } from "../content/legal/fields.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const file = path.join(root, "LEGAL-A-COMPLETER.md");
const pageNames: Record<string, string> = {
  "mentions-legales": "Mentions légales",
  cgv: "CGV",
  cgu: "CGU",
  confidentialite: "Confidentialité",
  "propriete-intellectuelle": "Propriété intellectuelle",
  retractation: "Rétractation",
  "livraison-retours": "Livraison et retours",
  "assistant-ia": "Notice de l’assistante IA",
};

/** Premier titre de la partie tenue à la main. */
const HAND_START = "## Pièces de la collection Hypnotic Lace";

/** Partie tenue à la main, quand le fichier n'existe pas encore ou l'a perdue. */
const HAND_DEFAULT = [
  "## Autres informations à confirmer",
  "",
  "- [ ] Nom de domaine du site : variable `NEXT_PUBLIC_SITE_URL` (par défaut « https://www.awreaparis.com », adresse citée par les mentions légales officielles ; les CGV officielles citent encore l’adresse du site Wix).",
  "- [ ] Adresse e-mail de contact : « awrea.contact@gmail.com » (mentions légales officielles), reprise dans `content/brand/identity.ts` → `email`. Les e-mails du site partent de `EMAIL_FROM` : une adresse Gmail ne peut pas servir d’expéditrice vérifiée (Resend) ; prévoir une adresse du domaine pour l’envoi.",
  "- [ ] Adresse de l’atelier où la créatrice reçoit sur rendez-vous (publiée seulement si elle est renseignée) : `content/brand/identity.ts` → `address` ; l’adresse de l’entreprise est à Croissy-sur-Seine (`legalAddress`).",
  "- [ ] Année de création de la Maison (publiée seulement si renseignée) : `content/brand/identity.ts` → `foundingYear`. L’entreprise est inscrite au RNE depuis le 05/02/2026, début d’activité le 01/04/2026.",
  "- [ ] Durée de conservation des demandes de rendez-vous sans suite (champ `delaiConservationDevis`).",
  "",
  "## Avant la mise en ligne",
  "",
  "- [ ] Faire relire l’ensemble des pages légales (CGV, CGU, confidentialité, cookies, mentions légales, propriété intellectuelle, notice de l’assistante IA) par une ou un juriste.",
  "- [ ] Mettre à jour les CGV et les mentions légales officielles, puis les reporter mot pour mot dans l’éditeur « Édition » (documents « Conditions générales de vente » et « Mentions légales »).",
  "- [ ] Signer la convention avec un médiateur de la consommation et renseigner le champ `mediateur`.",
  "- [ ] Vérifier dans Shopify : politiques (CGV, confidentialité, retours) liées au checkout, moyens de paiement activés (article 4 des CGV), zones de livraison (article 5).",
  "- [ ] Tenir le registre des traitements (RGPD, article 30) : la page Confidentialité en fournit la base.",
  "- [ ] Conserver les contrats de cession de droits (photographes, vidéastes) et les autorisations de droit à l’image des mannequins.",
  "",
].join("\n");

const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const at = previous.indexOf(`\n${HAND_START}\n`);
const handKept = at >= 0 ? previous.slice(at + 1) : HAND_DEFAULT;

const entries = Object.entries(legalFields);
const notApplicable = entries.filter(([, f]) => f.sansObjet);
const missing = entries.filter(([, f]) => !f.value && !f.sansObjet);
const done = entries.filter(([, f]) => f.value);
const counted = entries.length - notApplicable.length;

const lines: string[] = [];
lines.push("# Informations légales à compléter — Awrea Paris", "");
lines.push(
  "> Fichier généré par `npm run legal:todo` à partir de `content/legal/fields.ts`. Aucune information sur l’entreprise n’a été inventée :",
  "> tant qu’un champ est vide, il apparaît sur le site sous la forme d’un repère « [À COMPLÉTER : …] ».",
  "> Pour compléter : renseigner la valeur dans `content/legal/fields.ts`, puis relancer `npm run legal:todo`.",
  "> Les informations déjà renseignées viennent des mentions légales et des CGV officielles de la créatrice (`ressources-awrea/`).",
  "",
);
lines.push(`**${missing.length} information(s) à fournir** sur ${counted}.`, "");
lines.push("## Informations de l’entreprise", "");
lines.push("| Champ | Information attendue | Où la trouver | Pages concernées |", "|---|---|---|---|");
for (const [key, f] of missing) {
  lines.push(`| \`${key}\` | ${f.label} | ${f.source} | ${f.pages.map((p) => `${pageNames[p] ?? p} (\`/${p}\`)`).join(", ")} |`);
}
if (done.length) {
  lines.push("", "### Déjà renseignées", "");
  for (const [key, f] of done) lines.push(`- \`${key}\` — ${f.label} : ${f.value}`);
}
if (notApplicable.length) {
  lines.push("", "### Sans objet", "");
  for (const [key, f] of notApplicable) lines.push(`- \`${key}\` — ${f.label}`);
}
lines.push("", "## Conditions commerciales à confirmer", "");
lines.push("Ces valeurs viennent des réglages de démonstration du site (`content/settings.ts`) et sont reprises automatiquement dans la page Livraison et retours :", "");
for (const c of commercialChecks) lines.push(`- [ ] ${c}`);
lines.push("");

fs.writeFileSync(file, `${lines.join("\n")}\n${handKept}`);
console.log(`LEGAL-A-COMPLETER.md : ${missing.length} champ(s) à compléter sur ${counted} ; partie tenue à la main ${at >= 0 ? "reprise" : "remise par défaut"}.`);
