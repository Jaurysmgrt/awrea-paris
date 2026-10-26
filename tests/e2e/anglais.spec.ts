import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";

/**
 * Version anglaise du site, sous /en (lib/i18n/routing.ts, proxy.ts) : mêmes pages, préfixées ;
 * <html lang="en"> ; sélecteur de langue « FR · EN » qui mène à la même page ; liens internes qui
 * restent sous /en ; versions de chaque page déclarées aux moteurs (hreflang).
 */

const switcher = (page: Page) => page.locator(".site-header .lang-switch");

/** Liens internes de la page (hors sélecteur de langue, API, fichiers et ancres). */
async function internalLinks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href^='/']")]
      .filter((a) => !a.closest(".lang-switch"))
      .map((a) => a.getAttribute("href")!)
      .filter((h) => !/^\/(api|_next|media|brand)\//.test(h) && !/\.[a-z0-9]{2,5}(\?|#|$)/i.test(h)),
  );
}

test.describe("Version anglaise (/en)", () => {
  test("/en répond, en anglais : <html lang=\"en\">, l'Atelier et l'API restent hors de /en", async ({ page, request }) => {
    await acceptCookies(page);
    const res = await page.goto("/en");
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveCount(1);
    // la page française garde sa langue
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    for (const path of ["/en/gestion", "/en/api/products", "/en/prive-e2e0atelier0test"]) {
      expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
    }
  });

  test("le sélecteur mène de /boutique à /en/boutique, puis revient", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    const fr = switcher(page);
    await expect(fr.locator("[aria-current='true']")).toHaveText("FR");
    await fr.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/boutique$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await waitForHydration(page);
    const en = switcher(page);
    await expect(en.locator("[aria-current='true']")).toHaveText("EN");
    await en.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/boutique$/);
    expect(new URL(page.url()).pathname).toBe("/boutique");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("les liens internes restent sous /en, aussi après une navigation dans le site", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/en/boutique");
    await waitForHydration(page);
    const links = await internalLinks(page);
    expect(links.length).toBeGreaterThan(10);
    expect(links.filter((h) => h !== "/en" && !h.startsWith("/en/") && !h.startsWith("/en?"))).toEqual([]);

    // une fiche, ouverte depuis la liste : la langue suit, sans recharger la page
    await page.locator("main a[href='/en/boutique/body-aura']").first().click();
    await expect(page).toHaveURL(/\/en\/boutique\/body-aura$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect((await internalLinks(page)).filter((h) => h !== "/en" && !h.startsWith("/en/") && !h.startsWith("/en?"))).toEqual([]);
    // le sélecteur suit la page en cours
    await expect(switcher(page).getByRole("link", { name: "Français" })).toHaveAttribute("href", "/boutique/body-aura");
  });

  test("hreflang : chaque version déclare l'autre, canonique dans sa langue", async ({ page }) => {
    for (const [path, canonical] of [
      ["/boutique", "/boutique"],
      ["/en/boutique", "/en/boutique"],
      ["/en", "/en"],
    ] as const) {
      await page.goto(path);
      const href = (sel: string) => page.locator(sel).getAttribute("href");
      expect(new URL((await href("link[rel='canonical']"))!).pathname, path).toBe(canonical);
      expect(new URL((await href("link[rel='alternate'][hreflang='fr-FR']"))!).pathname, path).toBe(canonical.replace(/^\/en(?=\/|$)/, "") || "/");
      expect(new URL((await href("link[rel='alternate'][hreflang='en']"))!).pathname, path).toBe(canonical.startsWith("/en") ? canonical : `/en${canonical}`);
      await expect(page.locator("link[rel='alternate'][hreflang='x-default']")).toHaveCount(1);
    }
  });

  for (const path of ["/en", "/en/boutique/body-aura", "/en/cgu"]) {
    test(`accessibilité WCAG 2.1 AA (axe) : ${path}`, async ({ page }) => {
      await acceptCookies(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

  test.describe("téléphone", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("le menu du téléphone porte le sélecteur de langue", async ({ page }) => {
      await acceptCookies(page);
      await page.goto("/en/la-maison");
      await waitForHydration(page);
      await expect(switcher(page)).toBeHidden();
      await page.getByRole("button", { name: "Menu" }).click();
      const menu = page.getByRole("dialog", { name: "Menu" });
      await expect(menu).toBeVisible();
      await expect(menu.locator(".lang-switch").getByRole("link", { name: "Français" })).toHaveAttribute("href", "/la-maison");
    });
  });
});
