import { expect, test, type Page } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";
import { acceptCookies } from "./helpers";

/**
 * Commandes de l'Atelier (lot 3 de la refonte) : recherche, étapes et période ; sur la fiche, notes
 * internes, historique, remboursement confirmé et fait une seule fois. Commandes de démonstration
 * (data/demo/orders.ts) pour la liste et les notes ; le remboursement porte sur une commande passée
 * par le parcours lui-même, pour qu'il se rejoue sans rien laisser derrière lui.
 */

/** Une commande neuve, payée en mode test, comme le ferait une cliente (même chemin que apres-commande). */
async function commander(page: Page, email: string): Promise<string> {
  const products = (await (await page.request.get("/api/products?handles=top-kira")).json()).products as { variants: { id: string }[] }[];
  expect((await page.request.post("/api/cart", { data: { type: "clear" } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/cart", { data: { type: "add", variantId: products[0].variants[0].id } })).ok()).toBeTruthy();
  const res = await page.request.post("/api/checkout", {
    data: { email, firstName: "Margaux", lastName: "Essai", address1: "12 rue de la Paix", zip: "75002", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return ((await res.json()) as { number: string }).number;
}
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

test("fiche d'une commande : note interne et historique", async ({ page }) => {
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
  // une note vide est refusée, une commande inconnue n'existe pas
  expect((await page.request.post(`${ATELIER}/api/commandes/AW-1032/notes`, { data: { texte: "   " } })).status()).toBe(400);
  expect((await page.request.post(`${ATELIER}/api/commandes/AW-0000/notes`, { data: { texte: "x" } })).status()).toBe(404);
});

test("annuler et rembourser : confirmé, une seule fois même avec deux demandes simultanées, avoir émis", async ({ page }) => {
  test.setTimeout(120_000);
  await acceptCookies(page);
  const numero = await commander(page, `annulation.${Date.now().toString(36)}@exemple.fr`);
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes/${numero}`);
  await expect(page.getByRole("heading", { level: 1, name: `Commande ${numero}` })).toBeVisible();

  // la commande a changé (mauvais montant) : rien ne part
  const geste = `${ATELIER}/api/commandes/${numero}/geste`;
  const id = await page.evaluate(() => document.querySelector("[data-commande-id]")?.getAttribute("data-commande-id") ?? "");
  expect(id).not.toBe("");
  const total = Number(await page.evaluate(() => document.querySelector("[data-commande-id]")?.getAttribute("data-commande-total") ?? "0"));
  const faux = await page.request.post(geste, { data: { geste: "annuler-rembourser", id, total: total + 1 } });
  expect(faux.status()).toBe(409);
  expect((await faux.json()).error).toMatch(/a changé/);

  // deux demandes en même temps (double clic, deux onglets) : un seul remboursement
  const [a, b] = await Promise.all([page.request.post(geste, { data: { geste: "annuler-rembourser", id, total } }), page.request.post(geste, { data: { geste: "annuler-rembourser", id, total } })]);
  expect([a.status(), b.status()].sort()).toEqual([200, 409]);
  const ok = a.status() === 200 ? a : b;
  expect((await ok.json()).message).toMatch(/annulée et remboursée.*avoir/);

  // la page le montre ; un nouvel essai est refusé
  await page.reload();
  await expect(page.getByRole("button", { name: "Annuler et rembourser" })).toHaveCount(0);
  await expect(page.locator(".commande-historique")).toContainText(/annulée et remboursée/);
  expect((await page.request.post(geste, { data: { geste: "annuler-rembourser", id, total } })).status()).toBe(409);
});

test("geste confirmé depuis la fiche : la confirmation dit ce qui va se passer", async ({ page }) => {
  test.setTimeout(120_000);
  await acceptCookies(page);
  const numero = await commander(page, `confirmation.${Date.now().toString(36)}@exemple.fr`);
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes/${numero}`);
  let confirmation = "";
  page.once("dialog", (d) => {
    confirmation = d.message();
    void d.accept();
  });
  await page.getByRole("button", { name: "Annuler et rembourser" }).click();
  await expect(page.getByRole("status").filter({ hasText: /annulée et remboursée/ })).toBeVisible();
  expect(confirmation).toMatch(new RegExp(`${numero}.*démonstration.*ne se défait pas.*avoir`, "s"));
});
