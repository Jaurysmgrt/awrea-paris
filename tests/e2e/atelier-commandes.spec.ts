import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Commandes de l'Atelier (lot 3 de la refonte) : recherche, étapes et période ; sur la fiche, notes
 * internes, historique, remboursement confirmé et fait une seule fois. Commandes de démonstration
 * (data/demo/orders.ts) ; AW-1032, livrée, n'est utilisée par aucun autre parcours.
 */
test("liste des commandes : recherche sans accents, étapes, rien d'inventé quand rien ne correspond", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes`);
  await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible();
  const etapes = page.getByRole("navigation", { name: "Étapes des commandes" });
  await expect(etapes.getByRole("link", { name: /^Toutes \(\d+\)$/ })).toHaveAttribute("aria-current", "true");

  // recherche : un prénom, sans accent ni majuscule
  await page.getByLabel("Chercher une commande").fill("ines");
  await page.getByRole("button", { name: "Chercher" }).click();
  await expect(page).toHaveURL(/q=ines/);
  await expect(page.getByRole("row", { name: /AW-1032/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /AW-1036/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Commandes trouvées \(\d+\)$/ })).toBeVisible();

  // étape : seules les commandes en confection, et la recherche est gardée
  await page.getByRole("link", { name: "Effacer la recherche et les filtres" }).click();
  await etapes.getByRole("link", { name: /^En confection/ }).click();
  await expect(page).toHaveURL(/etape=en-confection/);
  await expect(etapes.getByRole("link", { name: /^En confection/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("row", { name: /AW-1036/ })).toBeVisible();
  await expect(page.locator(".table--commandes tbody tr:not([data-status='in_production'])")).toHaveCount(0);

  // rien ne correspond : la page le dit
  await page.goto(`${ATELIER}/commandes?q=${encodeURIComponent("personne-inconnue-xyz")}`);
  await expect(page.getByText(/Aucune commande ne correspond/)).toBeVisible();
});

test("fiche d'une commande : note interne, historique, remboursement confirmé une seule fois", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes/AW-1032`);
  await expect(page.getByRole("heading", { level: 1, name: "Commande AW-1032" })).toBeVisible();

  // historique : la commande passée, puis ses étapes
  const histoire = page.locator(".commande-historique");
  await expect(histoire).toContainText("Commande passée");
  await expect(histoire).toContainText("Livrée");

  // une note interne, gardée après rechargement, et reprise dans l'historique
  const note = `Tissu recoupé le ${Date.now().toString(36)}`;
  await page.getByLabel("Nouvelle note").fill(note);
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Note ajoutée." })).toBeVisible();
  await page.reload();
  await expect(page.locator(".commande-notes")).toContainText(note);
  await expect(histoire).toContainText(`Note : ${note}`);
  // une note vide est refusée
  const vide = await page.request.post(`${ATELIER}/api/commandes/AW-1032/notes`, { data: { texte: "   " } });
  expect(vide.status()).toBe(400);

  // remboursement : demandé après confirmation, fait une seule fois
  let confirmation = "";
  page.once("dialog", (d) => {
    confirmation = d.message();
    void d.accept();
  });
  await page.getByRole("button", { name: "Rembourser" }).click();
  await expect(page.getByRole("status").filter({ hasText: /remboursée/ })).toBeVisible();
  expect(confirmation).toMatch(/AW-1032.*ne se défait pas/s);
  await page.reload();
  await expect(page.getByRole("button", { name: "Rembourser" })).toHaveCount(0);
  await expect(histoire).toContainText(/remboursée/);
  const encore = await page.request.post(`${ATELIER}/api/commandes/AW-1032/geste`, { data: { geste: "rembourser" } });
  expect(encore.status()).toBe(409);
});
