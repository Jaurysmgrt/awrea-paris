import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

const PAGES = ["/", "/boutique", "/boutique/robe-odessa", "/boutique/top-evina", "/collections/hypnotic-lace", "/outfits", "/la-maison", "/atelier", "/sur-commande", "/guide-des-tailles", "/journal/dentelle-drapes-et-dorure", "/contact", "/faq", "/commande", "/compte"];

test.describe("Accessibilité WCAG 2.1 AA (axe-core)", () => {
  for (const path of PAGES) {
    test(path, async ({ page }) => {
      await acceptCookies(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

  test("bandeau cookies : refuser aussi simple qu’accepter, preuve enregistrée", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Cookies" });
    await expect(banner).toBeVisible();
    const refuse = banner.getByRole("button", { name: "Refuser", exact: true });
    const accept = banner.getByRole("button", { name: "Accepter", exact: true });
    await expect(refuse).toBeVisible();
    await expect(accept).toBeVisible();
    // même poids visuel : même classe, même taille
    const [r, a] = await Promise.all([refuse.boundingBox(), accept.boundingBox()]);
    expect(Math.abs(r!.width - a!.width)).toBeLessThan(2);
    expect(Math.abs(r!.height - a!.height)).toBeLessThan(2);
    expect(await refuse.getAttribute("class")).toBe(await accept.getAttribute("class"));
    const proof = page.waitForRequest((req) => req.url().endsWith("/api/consent") && req.method() === "POST");
    await refuse.click();
    await expect(banner).toBeHidden();
    expect((await proof).postDataJSON()).toMatchObject({ analytics: false, personalization: false, advertising: false, source: "banner" });
    const consent = (await page.context().cookies()).find((c) => c.name === "awrea_consent");
    expect(consent!.value).toMatch(/^2\.[A-Za-z0-9_-]+\.000\.\d+\./);
    // 13 mois au plus
    expect(consent!.expires * 1000 - Date.now()).toBeLessThanOrEqual(396 * 24 * 3600 * 1000);
  });

  test("cookies : choix par catégorie et « Gérer les cookies »", async ({ page }) => {
    await page.goto("/la-maison");
    const banner = page.getByRole("region", { name: "Cookies" });
    await banner.getByRole("button", { name: "Choisir" }).click();
    await expect(banner.getByRole("switch")).toHaveCount(4);
    await expect(banner.getByRole("switch", { name: "Nécessaires" })).toBeDisabled();
    await banner.getByRole("switch", { name: "Mesure d’audience" }).check();
    await banner.getByRole("button", { name: "Enregistrer mes choix" }).click();
    await expect(banner).toBeHidden();
    let consent = (await page.context().cookies()).find((c) => c.name === "awrea_consent");
    expect(consent!.value).toMatch(/\.100\./);
    // rouvrir depuis le pied de page (colonne LÉGAL, « Gérer les cookies »)
    await page.locator("footer").getByRole("button", { name: "Gérer les cookies" }).click();
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("switch", { name: "Mesure d’audience" })).toBeChecked();
    await banner.getByRole("switch", { name: "Personnalisation" }).check();
    await banner.getByRole("button", { name: "Enregistrer mes choix" }).click();
    consent = (await page.context().cookies()).find((c) => c.name === "awrea_consent");
    expect(consent!.value).toMatch(/\.110\./);
  });

  test("navigation clavier : lien d’évitement et menu", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/la-maison");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
    await page.keyboard.press("Tab");
    // ordinateur et tablette : la navigation est visible dès 768 px, sans bouton « Menu » ; le second
    // arrêt est le logo, lien vers l'accueil
    const phone = page.viewportSize()!.width < 768;
    if (!phone) {
      await expect(page.getByRole("link", { name: "Awrea Paris, page d’accueil" })).toBeFocused();
      return;
    }
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#site-menu")).toHaveAttribute("data-open", "true");
    await expect(page.locator("#site-menu a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#site-menu")).toHaveAttribute("data-open", "false");
  });
});
