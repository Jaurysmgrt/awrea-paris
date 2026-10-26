/**
 * Rôles de gestion quotidienne : chacun se lance depuis l'Atelier › Équipe, rend un résumé, et le
 * Contrôle relit son passage. (L'anti-fraude, qui met de côté des commandes, a ses règles testées à
 * part : tests/unit/roles.test.ts.)
 */
import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

const ROLES = ["gardien-editeur", "avis", "retours", "logistique", "comptabilite", "rgpd", "cercle", "drops", "sur-mesure", "rendez-vous", "production", "presse", "instagram", "publicite", "accessibilite", "performance", "sauvegarde"];

test("Équipe : chaque rôle passe, rend un résumé, et apparaît dans l'Atelier", async ({ page, request }) => {
  test.setTimeout(240_000);
  // sans session, ni l'Atelier ni le passage planifié ne s'ouvrent
  expect((await request.post(`${ATELIER}/api/equipe/avis`)).status()).toBe(404);
  expect((await request.get("/api/cron/equipe")).status()).toBe(401);

  // une erreur du navigateur arrive au suivi des erreurs, sans jeton ni adresse
  expect((await request.post("/api/erreurs", { data: { message: "Essai d’erreur pour l’Équipe, contact camille@exemple.fr", path: "/boutique?jeton=secret" } })).status()).toBe(204);

  await adminLogin(page);
  for (const id of ROLES) {
    const r = await page.request.post(`${ATELIER}/api/equipe/${id}`);
    expect(r.ok(), `${id} : ${await r.text()}`).toBeTruthy();
    const { report } = await r.json();
    expect(report.resume.length, id).toBeGreaterThan(5);
    expect(report.erreurs, id).toEqual([]);
    if (id === "performance") {
      const f = report.findings.find((x: { detail?: string }) => x.detail?.includes("Essai d’erreur"));
      expect(f, JSON.stringify(report.findings)).toBeTruthy();
      expect(f.detail).not.toContain("camille@exemple.fr");
    }
  }
  await page.goto(`${ATELIER}/equipe`);
  await expect(page.getByRole("heading", { level: 1, name: "Équipe" })).toBeVisible();
  await expect(page.getByText(/Dernier passage le/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gardien de l’éditeur" })).toBeVisible();
  // modèle « sur demande » : les rôles parlent d'avant-premières et de confection, jamais de stock
  await expect(page.getByRole("heading", { name: "Avant-premières", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confection", exact: true })).toBeVisible();
  await expect(page.locator(".team")).not.toContainText(/liste d’attente|précommande|rupture/i);
});

test("Agents : Commandes et confection, bilan du catalogue, propositions à valider", async ({ page }) => {
  test.setTimeout(180_000);
  await adminLogin(page);
  for (const id of ["commandes-confection", "catalogue"]) {
    const r = await page.request.post(`${ATELIER}/api/agents/${id}`);
    expect(r.ok(), `${id} : ${await r.text()}`).toBeTruthy();
    const { run } = await r.json();
    expect(run.errors, id).toEqual([]);
    expect(run.summary, id).not.toMatch(/stock|rupture/i);
  }
  // l'ancien identifiant (tâche planifiée, bouton de l'onglet Commandes) lance le nouvel agent
  const legacy = await page.request.post(`${ATELIER}/api/agents/commandes-stock`);
  expect(legacy.ok()).toBeTruthy();
  expect((await legacy.json()).run.agent).toBe("commandes-confection");

  await page.goto(ATELIER);
  await expect(page.getByRole("heading", { name: "Commandes et confection", exact: true })).toBeVisible();
  await expect(page.locator(".kpis").getByText("En confection", { exact: true })).toBeVisible();

  // prix et délais provisoires, message de retard préparé : rien ne part sans la créatrice
  await page.goto(`${ATELIER}/validations`);
  await expect(page.getByRole("heading", { name: /confirmer le (prix|délai)/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Prévenir .* d’un retard de confection/ }).first()).toBeVisible();
});
