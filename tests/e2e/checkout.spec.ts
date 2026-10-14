import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

test.describe("Parcours d’achat complet (mode test)", () => {
  test("fiche produit → panier → code → emballage → commande → enveloppe", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/body-aura");
    await expect(page.getByRole("heading", { level: 1, name: "Body Aura" })).toBeVisible();
    await expect(page.getByText("Certificat d’édition")).toBeVisible();

    // taille obligatoire
    // les boutons principaux de la fiche (la barre d'achat du téléphone en reprend les libellés)
    const actions = page.locator(".product-form__actions");
    await actions.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Merci de choisir une taille.")).toBeVisible();

    // première taille commandable : en stock, ou sur commande quand les essais précédents ont
    // épuisé le stock de démonstration
    await page.locator('.product-form .chip:not([data-unavailable="true"])').first().click();
    await actions.getByRole("button", { name: /^(Ajouter au panier|Précommander)$/ }).click();

    const drawer = page.locator("dialog.drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Body Aura")).toBeVisible();

    // emballage cadeau + message
    await drawer.getByText(/Emballage cadeau avec un mot/).click();
    await drawer.getByLabel("Votre message").fill("Pour toi, avec amour.");
    await drawer.getByLabel("Votre message").blur();

    // code avantage
    await drawer.getByText("Code avantage ou carte cadeau").click();
    await drawer.getByLabel("Code avantage").fill("BIENVENUE");
    await drawer.getByRole("button", { name: "Appliquer" }).first().click();
    await expect(drawer.getByText("Bienvenue — 10 %")).toBeVisible();

    await drawer.getByRole("link", { name: "Commander" }).click();
    await expect(page).toHaveURL(/\/commande$/);
    await expect(page.getByRole("heading", { level: 1, name: "Commande" })).toBeVisible();

    await page.getByLabel("E-mail", { exact: true }).fill("test.e2e@exemple.fr");
    await page.getByLabel("Prénom").fill("Alma");
    await page.getByLabel("Nom", { exact: true }).fill("Test");
    await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Dentelle");
    await page.getByLabel("Code postal").fill("75011");
    await page.getByLabel("Ville").fill("Paris");

    // carte refusée d'abord
    await page.getByLabel("Numéro de carte").fill("4000 0000 0000 0002");
    await page.getByRole("checkbox", { name: /j’accepte les conditions générales de vente/i }).check();
    await page.getByRole("button", { name: /^Payer/ }).click();
    await expect(page.locator(".checkout-form .field__error")).toContainText("refusé");

    await page.getByLabel("Numéro de carte").fill("4242 4242 4242 4242");
    await page.getByRole("button", { name: /^Payer/ }).click();

    await expect(page).toHaveURL(/\/commande\/confirmation/);
    await expect(page.getByRole("heading", { level: 1, name: /Merci, Alma/ })).toBeVisible();
    await expect(page.getByText(/Commande AW-\d+ est confirmée|Votre commande AW-\d+ est confirmée/)).toBeVisible();
    await expect(page.locator(".envelope")).toHaveAttribute("data-state", "open", { timeout: 8000 });

    // le panier est vidé
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Panier\s*: 0 pièce/ })).toBeVisible();
  });

  test("pièce épuisée : inscription à la liste d’attente", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/etole-nyx");
    await expect(page.getByText("Cette pièce est aujourd’hui épuisée.", { exact: false })).toBeVisible();
    await page.locator("#liste-attente").getByLabel("Adresse e-mail").fill("attente@exemple.fr");
    await page.locator("#liste-attente").getByText(/J’accepte d’être contactée/).click();
    await page.locator("#liste-attente").getByRole("button", { name: "Être prévenue" }).click();
    await expect(page.getByRole("status").filter({ hasText: "C’est noté" })).toBeVisible();
  });

  test("silhouette achetable en un geste", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/outfits");
    const first = page.locator(".silhouette").first();
    const pickers = first.locator(".outfit .size-picker");
    const n = await pickers.count();
    for (let i = 0; i < n; i++) await pickers.nth(i).locator(".chip:not([data-unavailable='true'])").first().click();
    await first.getByRole("button", { name: /Ajouter la silhouette/ }).click();
    await expect(page.locator("dialog.drawer")).toBeVisible();
    await expect(page.locator("dialog.drawer .cart-line")).toHaveCount(n);
  });
});
