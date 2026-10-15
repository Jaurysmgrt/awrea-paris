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

  await adminLogin(page);
  for (const id of ROLES) {
    const r = await page.request.post(`${ATELIER}/api/equipe/${id}`);
    expect(r.ok(), `${id} : ${await r.text()}`).toBeTruthy();
    const { report } = await r.json();
    expect(report.resume.length, id).toBeGreaterThan(5);
    expect(report.erreurs, id).toEqual([]);
  }
  await page.goto(`${ATELIER}/equipe`);
  await expect(page.getByRole("heading", { level: 1, name: "Équipe" })).toBeVisible();
  await expect(page.getByText(/Dernier passage le/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gardien de l’éditeur" })).toBeVisible();
});
