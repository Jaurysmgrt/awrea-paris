/** Réglages › Connexions en mots simples (lib/admin/connexions.ts, parcours UX du 23/11). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { connexionsAtelier, lienGuideActivation, type EtatConnexions } from "@/lib/admin/connexions";
import { resolveService, SERVICES, type ServiceId } from "@/lib/config/providers";
import { checkText } from "@/lib/writing/rules";

const etat = (env: Record<string, string> = {}, autre: Partial<EtatConnexions> = {}): EtatConnexions => ({
  services: Object.fromEntries((Object.keys(SERVICES) as ServiceId[]).map((id) => [id, resolveService(id, env)])) as EtatConnexions["services"],
  paiement: { enLigne: false, enTest: false, boutiqueReelle: false, raison: "Stripe n’est pas branché : la démonstration utilise le paiement d’essai." },
  notifications: false,
  tachesPlanifiees: false,
  motDePassePersonnel: false,
  modele: "modele-essai",
  ...autre,
});

test("un service par ligne : le paiement en ligne n’apparaît qu’une fois", () => {
  const lignes = connexionsAtelier(etat());
  const noms = lignes.map((l) => l.nom);
  assert.equal(new Set(noms).size, noms.length);
  assert.equal(noms.filter((n) => /paiement/i.test(n)).length, 1);
  assert.equal(new Set(lignes.map((l) => l.id)).size, lignes.length);
});

test("état en mots simples et phrase de ce qu’apporte le service, sans aucun nom de variable ni de fichier", () => {
  const technique = /[A-Z]{2,}_[A-Z_]+|\.md\b|\.json\b|\bmock\b|Simulation ·|sk_(test|live)_/;
  for (const l of connexionsAtelier(etat())) {
    assert.ok(["Branché", "Pas encore branché", "Réglé", "Pas encore réglé"].includes(l.etat), l.etat);
    assert.ok(l.apporte.length > 20, l.nom);
    for (const visible of [l.nom, l.etat, l.apporte, l.precision ?? ""]) {
      assert.doesNotMatch(visible, technique, visible);
      assert.deepEqual(checkText(visible, { lang: "fr" }).filter((i) => i.severity === "erreur"), [], visible);
    }
    // le détail technique, lui, garde les noms utiles à la personne qui s'occupe du site
    assert.match(l.technique, /ACTIVATION\.md/);
  }
});

test("branché ou non selon la présence des clés ; paiement en mode test signalé", () => {
  const avecResend = connexionsAtelier(etat({ RESEND_API_KEY: "cle" }));
  assert.equal(avecResend.find((l) => l.id === "email")!.etat, "Branché");
  assert.equal(avecResend.find((l) => l.id === "store")!.etat, "Pas encore branché");
  const test = connexionsAtelier(etat({}, { paiement: { enLigne: true, enTest: true, boutiqueReelle: false, raison: null } })).find((l) => l.id === "paiement")!;
  assert.equal(test.etat, "Branché");
  assert.match(test.precision!, /mode test/);
  const fermee = connexionsAtelier(etat({}, { paiement: { enLigne: false, enTest: false, boutiqueReelle: true, raison: "x" } })).find((l) => l.id === "paiement")!;
  assert.match(fermee.precision!, /aucune commande payée/);
});

test("lien vers le guide d’activation seulement quand l’adresse du dépôt est connue et sûre", () => {
  assert.equal(lienGuideActivation({}), null);
  assert.equal(lienGuideActivation({ VERCEL_GIT_REPO_OWNER: "maison", VERCEL_GIT_REPO_SLUG: "site" }), "https://github.com/maison/site/blob/main/ACTIVATION.md");
  assert.equal(lienGuideActivation({ EDITION_GITHUB_REPO: "maison/site", EDITION_GITHUB_BRANCH: "prod" }), "https://github.com/maison/site/blob/prod/ACTIVATION.md");
  assert.equal(lienGuideActivation({ EDITION_GITHUB_REPO: "maison/site\"><script>" }), null);
});
