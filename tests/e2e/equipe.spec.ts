/**
 * Rôles de gestion quotidienne : chacun se lance depuis l'Atelier › Équipe, rend un résumé, et le
 * Contrôle relit son passage. (L'anti-fraude, qui met de côté des commandes, a ses règles testées à
 * part : tests/unit/roles.test.ts.)
 */
import { expect, test, type Page } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";
import { outbox } from "./helpers";

/** « Les autres rôles » sont repliés, sauf quand l'un d'eux signale une urgence : on les déplie. */
async function ouvrirLesRoles(page: Page) {
  const roles = page.locator("details.equipe-roles");
  if (!(await roles.evaluate((d) => (d as HTMLDetailsElement).open))) await roles.locator("summary").click();
}

const ROLES = ["gardien-editeur", "avis", "retours", "logistique", "comptabilite", "rgpd", "cercle", "drops", "sur-mesure", "rendez-vous", "production", "presse", "instagram", "publicite", "accessibilite", "performance", "sauvegarde", "design"];

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
  await expect(page.getByRole("heading", { level: 1, name: "Agents" })).toBeVisible();
  // les rôles du quotidien sont repliés sous « Les autres rôles »
  await ouvrirLesRoles(page);
  await expect(page.getByText(/Dernier passage le/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gardien de l’éditeur" })).toBeVisible();
  // modèle « sur demande » : les rôles parlent d'avant-premières et de confection, jamais de stock
  await expect(page.getByRole("heading", { name: "Avant-premières", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confection", exact: true })).toBeVisible();
  // les agents principaux et les rôles : aucune trace de stock dans l'une ou l'autre liste
  for (const team of await page.locator(".team").all()) await expect(team).not.toContainText(/liste d’attente|précommande|rupture/i);
});

// retour de la créatrice du 01/11 : « quand je les lance, il se passe rien, on les voit pas travailler »
test("Équipe : on voit l'agent travailler, étape par étape, puis son compte rendu", async ({ page }) => {
  test.setTimeout(240_000);
  await adminLogin(page);
  await page.goto(`${ATELIER}/equipe`);
  await ouvrirLesRoles(page);
  // le rôle Design relit les pages du site, une à une
  const design = page.locator(".team__agent", { has: page.getByRole("heading", { name: "Design", exact: true }) });
  await design.getByRole("button", { name: "Lancer maintenant" }).click();
  await expect(design.getByRole("button", { name: "Design travaille…" })).toBeDisabled();
  await expect(design.locator(".agent-run__fil")).toBeVisible();
  const etapes = design.locator(".agent-run__etape");
  await expect(etapes.first()).toContainText("Design se met au travail.");
  await expect(design.getByText("Relit l’accueil.")).toBeVisible({ timeout: 60_000 });
  await expect(design.getByText(/^Terminé en \d+ s\.$/)).toBeVisible({ timeout: 180_000 });
  expect(await etapes.count()).toBeGreaterThan(5);
  await expect(design.locator(".agent-run__fin")).toContainText(/pages relues/);
  await expect(design.getByRole("button", { name: "Relancer" })).toBeEnabled();
  // un agent principal : ses actions, puis ce qu'il a fait et ce qui vous attend
  const rapport = page.locator(".team__agent", { has: page.getByRole("heading", { name: "Rapport", exact: true }) });
  await rapport.getByRole("button", { name: "Lancer maintenant" }).click();
  await expect(rapport.getByText(/^Terminé en \d+ s\.$/)).toBeVisible({ timeout: 120_000 });
  await expect(rapport.locator(".agent-run__fin")).toContainText(/action/);
  await rapport.getByRole("button", { name: "Fermer" }).click();
  await expect(rapport.locator(".agent-run")).toHaveCount(0);
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

  // l'accueil parle de la journée ; les agents sont dans les coulisses (Équipe)
  await page.goto(ATELIER);
  await expect(page.locator(".kpis").getByText("En confection", { exact: true })).toBeVisible();
  await page.goto(`${ATELIER}/equipe`);
  await expect(page.getByRole("heading", { name: "Commandes et confection", exact: true })).toBeVisible();

  // un retard : la cliente est prévenue par l'agent lui-même (autonomie allumée par défaut),
  // avec l'e-mail « Retard de confection » de la Maison, une seule fois par commande
  const retards = () => outbox().filter((m) => /^Votre commande AW-/.test(m.subject) && /un peu plus de temps/.test(m.text));
  expect(retards().length).toBeGreaterThan(0);
  const avant = retards().length;
  expect((await page.request.post(`${ATELIER}/api/agents/commandes-confection`)).ok()).toBeTruthy();
  expect(retards().length).toBe(avant);

  // prix et délais provisoires : rien ne change sans la créatrice ; plus de message de retard à valider
  await page.goto(`${ATELIER}/validations`);
  await expect(page.getByRole("heading", { name: /confirmer le (prix|délai)/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Prévenir .* d’un retard de confection/ })).toHaveCount(0);
});

test("Réglages : ce que les agents font seuls se coupe et se rallume", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/reglages`);
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Ce que les agents font seuls" }) });
  for (const titre of ["Prévenir une cliente d’un retard", "Corriger le site", "Publier les avis vérifiés", "Relances et mots d’accueil"]) await expect(section.getByRole("switch", { name: titre })).toHaveAttribute("aria-checked", "true");
  // l'argent reste sa décision, et c'est écrit
  await expect(section).toContainText(/Toujours votre décision.*rembourser une commande/);
  const avis = section.getByRole("switch", { name: "Publier les avis vérifiés" });
  await avis.click();
  await expect(avis).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(section.getByRole("switch", { name: "Publier les avis vérifiés" })).toHaveAttribute("aria-checked", "false");
  // une autonomie inconnue ou une valeur invalide : refusé
  expect((await page.request.patch(`${ATELIER}/api/autonomie`, { data: { autonomie: "remboursements", actif: true } })).status()).toBe(400);
  await section.getByRole("switch", { name: "Publier les avis vérifiés" }).click();
  await expect(section.getByRole("switch", { name: "Publier les avis vérifiés" })).toHaveAttribute("aria-checked", "true");
  // hors de l'Atelier : refusé
  const visiteuse = await page.context().browser()!.newContext();
  expect((await visiteuse.request.patch(`${page.url().split(ATELIER)[0]}${ATELIER}/api/autonomie`, { data: { autonomie: "avis", actif: false } })).status()).not.toBe(200);
  await visiteuse.close();
});
