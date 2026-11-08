import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Produits de l'Atelier (refonte du 07/11, « Shopify simplifié ») : la liste se cherche et se
 * filtre ; une pièce se duplique en brouillon, se renomme, se met en ligne puis s'archive ; une pièce
 * en brouillon ou archivée n'est jamais visible sur le site. Le parcours travaille sur une copie,
 * archivée à la fin, pour ne pas toucher aux pièces des autres tests.
 */
test("liste des produits : recherche, filtres, une ligne ouvre la fiche", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue`);
  await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ajouter un produit" })).toHaveAttribute("href", `${ATELIER}/catalogue/nouveau`);
  const filtres = page.getByRole("group", { name: "Afficher" });
  await expect(filtres.getByRole("button", { name: /^Toutes/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Chercher une pièce").fill("odessa");
  await expect(page.getByRole("link", { name: /La robe Odessa/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Le top Kira/ })).toHaveCount(0);
  await page.getByLabel("Chercher une pièce").fill("pièce qui n’existe pas");
  await expect(page.getByText(/Aucune pièce ne s’appelle/)).toBeVisible();
  await page.getByLabel("Chercher une pièce").fill("");
  await page.getByRole("link", { name: /Le top Kira/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Le top Kira" })).toBeVisible();
  await expect(page.locator(".piece-tete .status")).toHaveText("En ligne");
  await expect(page.getByRole("link", { name: "Voir la pièce sur le site" })).toHaveAttribute("href", "/boutique/top-kira");
});

test("une pièce : copie en brouillon, textes, mise en ligne, archive, jamais visible hors ligne", async ({ page, browser }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue/robe-odessa`);
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/catalogue/robe-odessa-copie(-\\d+)?$`));
  const handle = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { level: 1, name: "La robe Odessa (copie)" })).toBeVisible();
  await expect(page.locator(".piece-tete .status")).toHaveText("Brouillon");
  await expect(page.getByText("Visible sur le site une fois mise en ligne.")).toBeVisible();

  const visiteuse = await browser.newContext();
  const site = await visiteuse.newPage();
  try {
    // brouillon : introuvable sur le site
    expect((await site.goto(`/boutique/${handle}`))?.status()).toBe(404);

    // les textes : nom et accroche
    const nom = `Robe Essai ${Date.now().toString(36).slice(-4)}`;
    await page.getByLabel("Nom", { exact: true }).fill(nom);
    await page.getByLabel("Accroche").fill("Une pièce d’essai, créée pour les tests.");
    await page.getByRole("button", { name: "Enregistrer les textes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "C’est enregistré" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: nom })).toBeVisible();

    // en ligne : visible sur le site, avec son nouveau nom
    await page.getByRole("button", { name: "Mettre en ligne" }).click();
    await expect(page.locator(".piece-tete .status")).toHaveText("En ligne");
    await site.goto(`/boutique/${handle}`);
    await expect(site.getByRole("heading", { level: 1, name: nom })).toBeVisible();

    // archivée (après confirmation) : elle quitte le site, et se retrouve dans le filtre des archives
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Archiver" }).click();
    await expect(page.locator(".piece-tete .status")).toHaveText("Archivée");
    expect((await site.goto(`/boutique/${handle}`))?.status()).toBe(404);
    await site.goto("/boutique");
    await expect(site.getByRole("heading", { name: nom })).toHaveCount(0);
    await page.goto(`${ATELIER}/catalogue`);
    await page.getByRole("group", { name: "Afficher" }).getByRole("button", { name: /^Archivées/ }).click();
    await expect(page.getByRole("link", { name: new RegExp(nom) })).toContainText("Archivée");
  } finally {
    await visiteuse.close();
    // quoi qu'il arrive, la copie ne reste pas en ligne
    await page.request.post(`${ATELIER}/api/pieces/${handle}/statut`, { data: { statut: "archivee" } });
  }
});

test("textes refusés : un nom vide n'est pas enregistré", async ({ page }) => {
  await adminLogin(page);
  const r = await page.request.fetch(`${ATELIER}/api/pieces/top-kira`, { method: "PATCH", data: { title: "" } });
  expect(r.status()).toBe(400);
  const inconnue = await page.request.post(`${ATELIER}/api/pieces/piece-inconnue/statut`, { data: { statut: "en-ligne" } });
  expect(inconnue.status()).toBe(400);
  expect((await inconnue.json()).error).toMatch(/n’existe pas/);
});
