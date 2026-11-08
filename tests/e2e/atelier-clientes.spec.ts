import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Clientes de l'Atelier (lot 3 de la refonte) : recherche, catégories d'activité, fiche avec ses
 * commandes et vos notes, données remises à sa demande, effacement gardé par l'adresse recopiée.
 * Cliente de démonstration : Inès M. (commandes AW-1032 et AW-1039, sans compte).
 */
test("clientes : recherche, catégorie, fiche, note interne, données et effacement gardé", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/clientes`);
  await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible();
  const categories = page.getByRole("navigation", { name: "Catégories de clientes" });
  await expect(categories.getByRole("link", { name: /^Toutes \(\d+\)$/ })).toHaveAttribute("aria-current", "true");

  // recherche sans accent, puis la catégorie « Régulières » (deux commandes)
  await page.getByLabel("Chercher une cliente").fill("ines");
  await page.getByRole("button", { name: "Chercher" }).click();
  await expect(page).toHaveURL(/q=ines/);
  await categories.getByRole("link", { name: /^Régulières/ }).click();
  await expect(page).toHaveURL(/categorie=reguliere/);
  const ines = page.getByRole("link", { name: "Inès", exact: true });
  await expect(ines).toBeVisible();
  await expect(page.getByRole("row", { name: /Inès/ })).toContainText("Régulière");

  // la fiche : ses commandes, et une note interne gardée après rechargement
  await ines.click();
  await expect(page.getByRole("heading", { level: 1, name: "Inès" })).toBeVisible();
  await expect(page.getByRole("link", { name: "AW-1039" })).toBeVisible();
  await expect(page.getByText(/aucun\s: elle a commandé sans créer de compte/)).toBeVisible();
  const note = `Préfère être appelée le matin ${Date.now().toString(36)}`;
  await page.getByLabel("Nouvelle note").fill(note);
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Note ajoutée." })).toBeVisible();
  await page.reload();
  await expect(page.locator(".commande-notes").last()).toContainText(note);

  // ses données, remises en fichier
  const id = decodeURIComponent(page.url().split("/").pop()!);
  const donnees = await page.request.get(`${ATELIER}/api/clientes/${encodeURIComponent(id)}/donnees`);
  expect(donnees.status()).toBe(200);
  expect(donnees.headers()["content-disposition"]).toMatch(/^attachment/);
  const json = await donnees.json();
  expect(json.orders.map((o: { number: string }) => o.number)).toContain("AW-1039");

  // l'effacement : refusé sans la bonne adresse, et sans compte il n'y a rien à effacer
  const mauvaise = await page.request.post(`${ATELIER}/api/clientes/${encodeURIComponent(id)}/effacer`, { data: { email: "quelquun@exemple.fr" } });
  expect(mauvaise.status()).toBe(400);
  expect((await mauvaise.json()).error).toMatch(/ne correspond pas/);
  const sansCompte = await page.request.post(`${ATELIER}/api/clientes/${encodeURIComponent(id)}/effacer`, { data: { email: "ines.demo@exemple.fr" } });
  expect(sansCompte.status()).toBe(400);
  expect((await sansCompte.json()).error).toMatch(/pas de compte/);
  await expect(page.getByText(/Sans compte, il n’y a rien à effacer/)).toBeVisible();
});

test("clientes : une fiche inconnue n'existe pas, une visiteuse n'a accès à rien", async ({ page, browser }) => {
  await adminLogin(page);
  expect((await page.goto(`${ATELIER}/clientes/inconnue-0000`))?.status()).toBe(404);
  const visiteuse = await browser.newContext();
  try {
    const r = await visiteuse.request.get(`${ATELIER}/api/clientes/d_000000/donnees`);
    expect([401, 404]).toContain(r.status());
    expect(r.headers()["content-type"] ?? "").not.toMatch(/attachment/);
  } finally {
    await visiteuse.close();
  }
});
