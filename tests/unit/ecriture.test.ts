/** Contrôle d'écriture de la créatrice (lib/writing/rules.ts, lib/writing/agents.ts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkText, cleanGenerated, fixTypography, softenDashes } from "@/lib/writing/rules";
import { cleanTexts, streamCleaner } from "@/lib/writing/agents";

const rules = (t: string, ctx = {}) => checkText(t, ctx).filter((i) => i.severity === "erreur").map((i) => i.rule);

test("tirets de ponctuation : long, moyen, isolé, listes", () => {
  assert.ok(rules("La robe — en dentelle — est prête.").includes("tiret"));
  assert.ok(rules("De 10–12 jours.").includes("tiret"));
  assert.ok(rules("Paris - France, en atelier.").includes("tiret"));
  assert.ok(rules("Nos pièces :\n- la robe\n- le body").includes("liste-tirets"));
  // les traits d'union des mots composés restent permis
  assert.deepEqual(rules("Du prêt-à-porter, c’est-à-dire peut-être sur-mesure."), []);
});

test("formulations interdites et superlatifs", () => {
  for (const t of [
    "Plongez dans la collection.",
    "Découvrez notre univers.",
    "Bien plus qu’un vêtement.",
    "Il ne s’agit pas seulement de mode.",
    "Non seulement belle, mais aussi solide.",
    "Que vous soyez à Paris ou ailleurs.",
    "Une élégance intemporelle.",
    "Un savoir-faire d’exception.",
    "Pour sublimer la silhouette.",
    "Elle incarne la Maison.",
    "Un écrin de dentelle.",
    "Allier le satin et la dentelle.",
    "Un véritable travail.",
    "Un voyage au cœur de Paris.",
    "Révélez votre féminité.",
    "Chaque pièce raconte une histoire.",
    "L’art de la dentelle.",
    "Une ode à Paris.",
    "Pensée pour la femme moderne.",
    "Une pièce unique en son genre.",
    "Un incontournable de la saison.",
    "Un travail exceptionnel.",
  ]) assert.ok(rules(t).some((r) => r === "formule" || r === "superlatif"), t);
  // un usage juridique n'est pas un superlatif
  assert.deepEqual(rules("Sauf circonstances exceptionnelles, la livraison a lieu sous cinq jours."), []);
});

test("point d’exclamation, emoji, apostrophe droite, typographie", () => {
  assert.ok(rules("Merci !").includes("exclamation"));
  assert.ok(rules("Bientôt 🖤").includes("emoji"));
  assert.ok(rules("L'atelier est ouvert.").includes("apostrophe"));
  assert.deepEqual(rules("Total\u00a0: 690 €"), []);
  assert.ok(rules("Total : 690 €").includes("espace-insecable"));
  assert.deepEqual(rules("© Awrea Paris"), []);
  assert.deepEqual(rules("if (!ok) return"), []);
});

test("rôles : titre sans deux-points, bouton sans « Découvrir »", () => {
  assert.ok(rules("Coulisses : une journée", { role: "titre" }).includes("titre-deux-points"));
  assert.ok(rules("Découvrir la robe", { role: "bouton" }).includes("bouton-decouvrir"));
  assert.deepEqual(rules("Voir la robe", { role: "bouton" }), []);
});

test("corrections typographiques sûres", () => {
  assert.equal(fixTypography('Il a dit "oui" : c\'est l\'atelier... Vraiment ?'), "Il a dit «\u00a0oui\u00a0»\u00a0: c’est l’atelier… Vraiment\u00a0?");
  assert.equal(fixTypography("« déjà »"), "«\u00a0déjà\u00a0»");
  assert.equal(fixTypography("https://awreaparis.com à 18:30"), "https://awreaparis.com à 18:30");
});

test("textes générés : tirets adoucis, exclamation calmée", () => {
  assert.equal(softenDashes("La robe — en dentelle — est prête"), "La robe, en dentelle, est prête");
  assert.equal(softenDashes("De 10–12 jours"), "De 10 à 12 jours");
  assert.equal(cleanGenerated("Merci ! À très vite !"), "Merci. À très vite.");
  assert.equal(cleanGenerated("C'est prêt 🖤"), "C’est prêt");
});

test("réponse diffusée par morceaux : nettoyée sans couper un tiret", () => {
  const c = streamCleaner();
  let out = "";
  for (const part of ["La robe —", " en dentelle", " — part demain. Merci", " !"]) out += c.push(part);
  out += c.flush();
  assert.equal(out, "La robe, en dentelle, part demain. Merci.");
});

test("textes des agents : champs techniques intacts, formulations signalées", () => {
  const { value, issues } = cleanTexts({ handle: "robe-odessa", title: "Robe Odessa — dentelle", description: ["Une élégance intemporelle !"] });
  assert.equal(value.handle, "robe-odessa");
  assert.equal(value.title, "Robe Odessa, dentelle");
  assert.equal(value.description[0], "Une élégance intemporelle.");
  assert.ok(issues.some((i) => i.rule === "formule" && i.path === "description[0]"));
});
