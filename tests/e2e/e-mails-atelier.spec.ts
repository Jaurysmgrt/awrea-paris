/**
 * Atelier › E-mails (demande de la créatrice du 02/11) : la lettre (essai, envoi gardé), les
 * inscrites et leur tableur, les e-mails partis, les e-mails automatiques.
 */
import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";
import { outbox } from "./helpers";

test("E-mails : la lettre, les inscrites, les envoyés et les automatiques", async ({ page }) => {
  test.setTimeout(120_000);
  await adminLogin(page);
  await page.goto(`${ATELIER}/e-mails`);
  const onglets = page.getByRole("navigation", { name: "Rubriques des e-mails" });
  await expect(onglets.getByRole("link", { name: "La lettre" })).toHaveAttribute("aria-current", "page");

  // la lettre d'origine est encore entre crochets : elle ne part pas, même en forçant l'adresse
  await expect(page.getByText(/encore des textes entre crochets/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Envoyer à \d+ inscrites?$/ })).toBeDisabled();
  const force = await page.request.post(`${ATELIER}/api/lettre`, { data: { action: "envoi", nombre: 1 } });
  expect(force.status()).toBe(409);
  expect((await force.json()).error).toMatch(/entre crochets/);
  expect((await page.request.post(`${ATELIER}/api/lettre`, { data: { action: "tout" } })).status()).toBe(400);

  // l'essai part à la créatrice connectée
  await page.getByRole("button", { name: "M’envoyer un essai" }).click();
  await expect(page.locator(".lettre__actions").getByRole("status")).toContainText("Essai envoyé à contact@awreaparis.com");
  expect(outbox().some((m) => m.to === "contact@awreaparis.com")).toBeTruthy();

  // inscrites : le nombre, le tableau et le tableur
  await onglets.getByRole("link", { name: "Inscrites" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /^\d+ inscrites?$/ })).toBeVisible();
  const csv = await page.request.get(`${ATELIER}/api/lettre/inscrites`);
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("\"E-mail\";\"Prénom\";\"Nom\"");

  // envoyés : l'essai est là, le plus récent en tête
  await page.goto(`${ATELIER}/e-mails/envoyes`);
  await expect(page.locator(".envoye").first()).toContainText("Essai de la lettre");

  // automatiques : la galerie, sans la lettre elle-même
  await page.goto(`${ATELIER}/e-mails/automatiques`);
  await expect(page.getByRole("heading", { name: "Retard de confection" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lettre de la Maison", exact: true })).toHaveCount(0);

  // hors de l'Atelier : rien
  const visiteuse = await page.context().browser()!.newContext();
  const base = page.url().split(ATELIER)[0];
  expect((await visiteuse.request.get(`${base}${ATELIER}/api/lettre/inscrites`)).status()).not.toBe(200);
  expect((await visiteuse.request.post(`${base}${ATELIER}/api/lettre`, { data: { action: "essai" } })).status()).not.toBe(200);
  await visiteuse.close();
});
