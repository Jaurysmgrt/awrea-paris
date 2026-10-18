import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

test.describe("Parcours d’achat complet (mode test)", () => {
  test("fiche produit → panier → code → emballage → commande → enveloppe", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/body-aura");
    await expect(page.getByRole("heading", { level: 1, name: "Le body Aura" })).toBeVisible();
    await expect(page.getByText("70,00 €").first()).toBeVisible();
    // pièce créée sur demande : délai de fabrication annoncé, certificat au numéro de création
    const made = page.locator(".product-form__made");
    await expect(made.getByText("Délai de fabrication")).toBeVisible();
    await expect(made.getByText(/\d+ (à \d+ )?semaines?, puis expédition/)).toBeVisible();
    await expect(page.getByText("Certificat d’authenticité").first()).toBeVisible();

    // taille obligatoire
    // les boutons principaux de la fiche (la barre d'achat du téléphone en reprend les libellés)
    const actions = page.locator(".product-form__actions");
    await actions.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Merci de choisir une taille.")).toBeVisible();

    // toutes les tailles se commandent : aucune n'est épuisée
    await page.locator(".product-form .chip").first().click();
    await expect(page.locator(".product-form__status")).toContainText("confectionnée pour vous");
    await actions.getByRole("button", { name: "Ajouter au panier" }).click();

    const drawer = page.locator("dialog.drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".cart-line__title", { hasText: "Le body Aura" })).toBeVisible();
    await expect(drawer.locator(".cart-line__lead").first()).toContainText(/Créée pour vous en \d/);
    await expect(drawer.getByText(/Chaque pièce est créée sur demande/)).toBeVisible();
    await expect(drawer.getByText("Visuel provisoire").first()).toBeVisible();

    // emballage cadeau + message
    await drawer.getByText(/Emballage cadeau avec un mot/).click();
    await drawer.getByLabel("Votre message").fill("Pour toi, avec amour.");
    await drawer.getByLabel("Votre message").blur();

    // code avantage
    await drawer.getByText("Code avantage ou carte cadeau").click();
    await drawer.getByLabel("Code avantage").fill("BIENVENUE");
    await drawer.getByRole("button", { name: "Appliquer" }).first().click();
    await expect(drawer.getByText("Bienvenue, 10 %")).toBeVisible();

    await drawer.getByRole("link", { name: "Commander" }).click();
    await expect(page).toHaveURL(/\/commande$/);
    await expect(page.getByRole("heading", { level: 1, name: "Commande" })).toBeVisible();
    await expect(page.getByText(/expédiée dès que la dernière pièce est prête/).first()).toBeVisible();

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

  test("pièce créée sur demande : toutes les tailles, délai annoncé, jamais épuisée", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/robe-aria");
    await expect(page.getByRole("heading", { level: 1, name: "La robe Aria" })).toBeVisible();
    await expect(page.getByText("204,00 €").first()).toBeVisible();
    const chips = page.locator(".product-form .chip");
    expect(await chips.count()).toBeGreaterThan(1);
    await expect(page.locator(".product-form .chip input:disabled")).toHaveCount(0);
    await expect(page.locator(".product-form__made")).toContainText(/créée sur demande/i);
    await expect(page.locator("main").getByText(/épuisée|dernière pièce|liste d’attente|Précommander|N° \d+ \/ \d+/)).toHaveCount(0);

    // la collection Hypnotic Lace : ses sept pièces (l'agent Catalogue peut en ajouter d'autres
    // pendant les essais), la pastille « Nouveau » et le délai sur chaque carte
    await page.goto("/collections/hypnotic-lace");
    for (const handle of ["body-aura", "robe-odessa", "robe-aria", "robe-sienna", "body-gaia", "top-evina", "top-kira"]) {
      await expect(page.locator(`.product-card a[href="/boutique/${handle}"]`).first()).toBeVisible();
    }
    await expect(page.locator(".product-card__badge").first()).toHaveText("Nouveau");
    await expect(page.locator(".product-card__lead").first()).toContainText(/Sur demande, \d/);
    // l'ancienne collection mène à la nouvelle, les fiches retirées à la boutique (308)
    const old = await page.request.get("/collections/lace-is-more", { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers()["location"]).toMatch(/\/collections\/hypnotic-lace$/);
    for (const handle of ["robe-thais", "jupe-iris", "corset-elia", "etole-nyx"]) {
      const r = await page.request.get(`/boutique/${handle}`, { maxRedirects: 0 });
      expect(r.status(), handle).toBe(308);
      expect(r.headers()["location"]).toMatch(/\/boutique$/);
    }
    await page.goto("/collections/lace-is-more");
    await expect(page).toHaveURL(/\/collections\/hypnotic-lace$/);
  });

  test("silhouette achetable en un geste", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/outfits");
    // une silhouette demande une vraie photographie de plusieurs pièces portées ensemble : aucune
    // n'est publiée tant que la Maison ne l'a pas fournie (data/demo/collections.ts, looks)
    test.skip((await page.locator(".silhouette").count()) === 0, "aucune silhouette publiée pour le moment");
    const first = page.locator(".silhouette").first();
    const pickers = first.locator(".outfit .size-picker");
    const n = await pickers.count();
    for (let i = 0; i < n; i++) await pickers.nth(i).locator(".chip").first().click();
    await first.getByRole("button", { name: /Ajouter la silhouette/ }).click();
    await expect(page.locator("dialog.drawer")).toBeVisible();
    await expect(page.locator("dialog.drawer .cart-line")).toHaveCount(n);
  });
});
