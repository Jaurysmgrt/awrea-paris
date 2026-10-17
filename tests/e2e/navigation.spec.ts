import { expect, test } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";

test.describe("En-tête épuré, recherche plein écran, mode Nuit", () => {
  test("l’en-tête n’offre que cinq entrées ; le reste vit dans le menu plein écran", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    // le monogramme (lien d'accueil) n'est pas une entrée de navigation
    const entries = page.locator(".site-header").locator(":is(a, button):visible:not(.site-header__logo)");
    const labels = (await entries.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    expect(labels, labels.join(" | ")).toHaveLength(5);
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.locator("#site-menu");
    // chaque entrée est précédée de son numéro romain (« II Collections »)
    for (const name of ["Collections", "Outfits", "Journal"]) await expect(menu.getByRole("link", { name: new RegExp(`${name}$`) })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Liste d’envies/ })).toBeVisible();
  });

  test("« / » ouvre la recherche ; résultats instantanés, page complète avec Entrée", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Recherche" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByLabel("Rechercher");
    await expect(input).toBeFocused();
    await input.pressSequentially("dentel");
    await expect(dialog.getByRole("heading", { name: /Pièces/ })).toBeVisible();
    await expect(dialog.locator(".search__piece").first()).toBeVisible();
    // le reste de la page est inerte pendant la recherche
    expect(await page.evaluate(() => document.getElementById("contenu")?.closest("[inert]") !== null)).toBe(true);
    await input.fill("retours");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/recherche\?q=retours/);
    await expect(page.locator("main").getByRole("status")).toContainText("résultat");
    await expect(page.getByRole("link", { name: /Livraison & retours/ }).first()).toBeVisible();
    // Échap referme ; la page redevient interactive
    await page.keyboard.press("/");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.getElementById("contenu")?.closest("[inert]") === null)).toBe(true);
  });

  test("recherche sans JavaScript : la page /recherche répond seule", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/recherche?q=robe");
    await expect(page.locator(".search__piece").first()).toBeVisible();
    await ctx.close();
  });

  test("mode Nuit : automatique selon le réglage de l’appareil, puis au choix, sans flash au rechargement", async ({ page }) => {
    await acceptCookies(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const footer = page.locator("footer");
    await footer.getByText("Jour", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await footer.getByText("Nuit", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    // le choix est appliqué par le script de <head>, avant le premier affichage
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/boutique", { waitUntil: "commit" });
    await page.waitForSelector("body");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgb(244, 241, 235)"); // jamais d'ivoire en mode Nuit
    await footer.getByText(/^Auto/).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  });

  test("animations apaisées sur demande, même si le système ne le demande pas", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    await page.locator("footer").getByRole("switch", { name: "Animations apaisées" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  });

  test("prix sobres : jamais de prix barré", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await expect(page.locator(".price del, .price s")).toHaveCount(0);
  });
});
