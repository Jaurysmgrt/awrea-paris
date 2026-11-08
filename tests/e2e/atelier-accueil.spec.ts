import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Vue d'ensemble de l'Atelier et menu clair (brief de la créatrice du 03/11 et du 07/11, « un
 * Shopify simplifié ») : ce qui attend, les gestes courants, quatre chiffres réels, les dernières
 * commandes ; un menu en six rubriques dont les sous-entrées n'apparaissent que dans leur rubrique.
 */
test("Vue d'ensemble : priorités, raccourcis, chiffres et dernières commandes mènent quelque part", async ({ page }) => {
  await adminLogin(page);
  await page.goto(ATELIER);
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();
  // mode essai : la page le dit, rien n'est présenté comme réel
  await expect(page.locator("#contenu").getByText(/Boutique en mode essai/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "À faire en priorité" })).toBeVisible();
  const raccourcis = page.getByRole("navigation", { name: /Que souhaitez-vous faire/ });
  for (const name of ["Ajouter un produit", "Voir les commandes", "Modifier mon site", "Changer une photo", "Écrire une lettre", "Voir le site"]) await expect(raccourcis.getByRole("link", { name })).toBeVisible();

  const kpis = page.locator(".kpis");
  await expect(kpis.getByText(/^Ventes de /)).toBeVisible();
  for (const label of ["Commandes à traiter", "En confection", "Nouvelles clientes"]) await expect(kpis.getByText(label, { exact: true })).toBeVisible();

  // les dernières commandes ouvrent leur fiche
  const dernieres = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dernières commandes" }) });
  const premiere = dernieres.getByRole("link").filter({ hasText: /AW-\d+/ }).first();
  const numero = (await premiere.innerText()).match(/AW-\d+/)![0];
  await premiere.click();
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(numero) })).toBeVisible();

  // « Ajouter un produit » mène au formulaire de la nouvelle pièce
  await page.goto(ATELIER);
  await raccourcis.getByRole("link", { name: "Ajouter un produit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nouvelle pièce" })).toBeVisible();
});

test("menu clair : six rubriques, sous-entrées dans leur rubrique, titres identiques aux pages", async ({ page }) => {
  await adminLogin(page);
  await page.goto(ATELIER);
  const side = page.locator(".admin__side");
  await expect(side).toHaveAttribute("data-theme", "ivory");
  const nav = page.getByRole("navigation", { name: "Menu de l’Atelier" });
  for (const titre of ["Ma boutique", "Mon site", "Mon activité", "Intelligence artificielle", "Paramètres"]) await expect(nav.getByText(titre, { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Vue d’ensemble", exact: true })).toHaveAttribute("aria-current", "page");
  // aucune entrée vide ni ancienne rubrique
  await expect(nav.getByText(/Coulisses|Fichier clientes|Aujourd’hui/)).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /^Retours/ })).toHaveCount(0);

  // chaque entrée ouvre la page qui porte son nom
  for (const [name, titre] of [
    ["Produits", "Produits"],
    ["Commandes", "Commandes"],
    ["Clientes", "Clientes"],
    ["Pages", "Pages"],
    ["Rendez-vous", "Rendez-vous"],
    ["Messages", "Messages"],
    ["À valider", "À valider"],
    ["Agents", "Agents"],
    ["Réglages", "Réglages"],
  ] as const) {
    // le nombre de choses à traiter peut suivre le nom (« Messages 3 à traiter »)
    await nav.getByRole("link", { name: new RegExp(`^${name}(\\s|$)`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: titre, exact: true }), name).toBeVisible();
  }

  // dans Commandes, ses sous-entrées apparaissent
  await nav.getByRole("link", { name: /^Commandes(\s|$)/ }).click();
  for (const name of [/^Retours/, /^Factures/]) await expect(nav.getByRole("link", { name })).toBeVisible();
  await nav.getByRole("link", { name: /^Retours/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Retours" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^Retours/ })).toHaveAttribute("aria-current", "page");
});

test("téléphone : menu replié derrière un bouton, Vue d'ensemble sans débordement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminLogin(page);
  await page.goto(ATELIER);
  const nav = page.getByRole("navigation", { name: "Menu de l’Atelier" });
  await expect(nav.getByRole("link", { name: "Produits", exact: true })).toBeHidden();
  await nav.getByRole("button", { name: "Menu" }).click();
  await expect(nav.getByRole("link", { name: "Produits", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Fermer le menu" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
