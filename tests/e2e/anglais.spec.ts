import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";

/**
 * Version anglaise du site, sous /en (lib/i18n/routing.ts, proxy.ts) : mêmes pages, préfixées ;
 * <html lang="en"> ; aucun sélecteur de langue (brief du 09/11), la langue est choisie à la première
 * visite d'après le pays puis le navigateur ; liens internes qui restent sous /en ; versions de
 * chaque page déclarées aux moteurs (hreflang).
 */

/** Liens internes de la page (hors API, fichiers et ancres). */
async function internalLinks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href^='/']")]
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
    // la page française garde sa langue (une nouvelle visiteuse, navigateur en français : la page
    // anglaise ouverte plus haut retiendrait l'anglais)
    await page.context().clearCookies();
    await acceptCookies(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    for (const path of ["/en/gestion", "/en/api/products", "/en/prive-e2e0atelier0test"]) {
      expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
    }
  });

  test("aucun sélecteur de langue, ni dans l'en-tête ni dans le menu du téléphone", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    await expect(page.locator(".site-header").getByRole("group", { name: /langue|language/i })).toHaveCount(0);
    await expect(page.locator(".site-header").getByRole("link", { name: "English" })).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: /^(English|Français)$/ })).toHaveCount(0);
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

});

test.describe("Langue à la première arrivée : le pays, puis le navigateur", () => {
  test.describe("navigateur en anglais, hors de France", () => {
    test.use({ locale: "en-GB" });

    test("une adresse française s'ouvre en anglais, avant tout affichage ; la langue est retenue aux visites suivantes", async ({ page, request }) => {
      // première arrivée, vue du serveur : la redirection précède tout affichage
      const res = await request.get("/la-maison", { headers: { accept: "text/html", "accept-language": "en-GB,en;q=0.9" }, maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()["location"]).toMatch(/\/en\/la-maison$/);

      await acceptCookies(page);
      await page.goto("/la-maison");
      await expect(page).toHaveURL(/\/en\/la-maison$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      // de retour par l'adresse du site : toujours l'anglais
      await page.goto("/");
      expect(new URL(page.url()).pathname).toBe("/en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });

    test("on ne change de langue qu'en modifiant l'adresse, et ce choix est retenu", async ({ page }) => {
      await acceptCookies(page);
      await page.goto("/boutique");
      await expect(page).toHaveURL(/\/en\/boutique$/);
      // /fr/… : le français, à l'adresse française habituelle, puis retenu
      await page.goto("/fr/la-maison");
      expect(new URL(page.url()).pathname).toBe("/la-maison");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await page.goto("/boutique");
      expect(new URL(page.url()).pathname).toBe("/boutique");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      // /en/… : l'anglais, retenu à son tour
      await page.goto("/en/la-maison");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await page.goto("/boutique");
      await expect(page).toHaveURL(/\/en\/boutique$/);
    });

    test("depuis la France, le français, même avec un navigateur en anglais", async ({ browser }) => {
      const ctx = await browser.newContext({ locale: "en-GB", extraHTTPHeaders: { "x-vercel-ip-country": "FR" } });
      const page = await ctx.newPage();
      await acceptCookies(page);
      await page.goto("/la-maison");
      expect(new URL(page.url()).pathname).toBe("/la-maison");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await ctx.close();
    });
  });

  test("depuis un pays anglophone, l'anglais, même avec un navigateur en français", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "fr-FR", extraHTTPHeaders: { "x-vercel-ip-country": "GB" } });
    const page = await ctx.newPage();
    await acceptCookies(page);
    await page.goto("/la-maison");
    await expect(page).toHaveURL(/\/en\/la-maison$/);
    await ctx.close();
  });

  test("navigateur en français : le français ; une adresse anglaise donnée reste en anglais", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.context().clearCookies();
    await page.goto("/en/boutique");
    expect(new URL(page.url()).pathname).toBe("/en/boutique");
  });

  test("robots d'indexation : la page demandée, sans détour, quel que soit le pays", async ({ request }) => {
    const sansLangue = await request.get("/la-maison", { headers: { accept: "text/html", "accept-language": "" }, maxRedirects: 0 });
    expect(sansLangue.status()).toBe(200);
    const robot = await request.get("/la-maison", { headers: { accept: "text/html", "accept-language": "en-US", "x-vercel-ip-country": "US", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }, maxRedirects: 0 });
    expect(robot.status()).toBe(200);
  });
});
