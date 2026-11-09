import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";
import { adminLogin } from "./admin-auth";

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Version anglaise du site, sous /en (lib/i18n/routing.ts, proxy.ts) : mêmes pages, préfixées ;
 * <html lang="en"> ; aucun sélecteur de langue (brief du 09/11) : le site suit toujours la langue de
 * l'appareil, quelle que soit l'adresse tapée ; liens internes qui restent sous /en ; versions de
 * chaque page déclarées aux moteurs (hreflang), jamais redirigés.
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
  // un téléphone ou un ordinateur réglé en anglais
  test.use({ locale: "en-GB" });

  test("/en répond, en anglais : <html lang=\"en\">, l'Atelier et l'API restent hors de /en", async ({ page, request }) => {
    await acceptCookies(page);
    const res = await page.goto("/en");
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveCount(1);
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

  test("hreflang : chaque version déclare l'autre, canonique dans sa langue (vue d'un robot, jamais redirigé)", async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: GOOGLEBOT });
    const page = await ctx.newPage();
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
    await ctx.close();
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

test.describe("Langue de l'appareil, quelle que soit l'adresse tapée", () => {
  test.describe("téléphone ou ordinateur en anglais", () => {
    test.use({ locale: "en-GB" });

    test("une adresse française s'ouvre en anglais, avant tout affichage, à chaque fois", async ({ page, request }) => {
      // vue du serveur : la redirection précède tout affichage
      const res = await request.get("/la-maison", { headers: { accept: "text/html", "accept-language": "en-GB,en;q=0.9" }, maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()["location"]).toMatch(/\/en\/la-maison$/);
      // aucun cookie de langue : rien n'est retenu
      expect(res.headers()["set-cookie"] ?? "").not.toContain("awrea_langue");

      await acceptCookies(page);
      await page.goto("/la-maison");
      await expect(page).toHaveURL(/\/en\/la-maison$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await page.goto("/");
      expect(new URL(page.url()).pathname).toBe("/en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });

  test("téléphone en français : une adresse anglaise tapée s'ouvre en français", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.goto("/en/boutique?taille=S");
    expect(new URL(page.url()).pathname).toBe("/boutique");
    expect(new URL(page.url()).search).toBe("?taille=S");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("téléphone dans une langue que le site ne parle pas : l'anglais", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "de-DE" });
    const page = await ctx.newPage();
    await acceptCookies(page);
    await page.goto("/la-maison");
    await expect(page).toHaveURL(/\/en\/la-maison$/);
    await ctx.close();
  });

  test("le pays n'est pas lu : seule compte la langue de l'appareil", async ({ browser }) => {
    for (const [locale, pays, attendu] of [["en-GB", "FR", "/en/la-maison"], ["fr-FR", "GB", "/la-maison"]] as const) {
      const ctx = await browser.newContext({ locale, extraHTTPHeaders: { "x-vercel-ip-country": pays } });
      const page = await ctx.newPage();
      await acceptCookies(page);
      await page.goto("/la-maison");
      expect(new URL(page.url()).pathname, `${locale} depuis ${pays}`).toBe(attendu);
      await ctx.close();
    }
  });

  test("robots d'indexation : la page demandée, sans détour", async ({ request }) => {
    const sansLangue = await request.get("/la-maison", { headers: { accept: "text/html", "accept-language": "" }, maxRedirects: 0 });
    expect(sansLangue.status()).toBe(200);
    for (const path of ["/la-maison", "/en/la-maison"]) {
      const robot = await request.get(path, { headers: { accept: "text/html", "accept-language": path.startsWith("/en") ? "fr-FR" : "en-US", "user-agent": GOOGLEBOT }, maxRedirects: 0 });
      expect(robot.status(), path).toBe(200);
    }
  });

  test("la créatrice connectée voit les deux versions, quelle que soit la langue de son téléphone", async ({ page }) => {
    test.setTimeout(120_000);
    await adminLogin(page);
    await page.goto("/en/la-maison");
    expect(new URL(page.url()).pathname).toBe("/en/la-maison");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/la-maison");
    expect(new URL(page.url()).pathname).toBe("/la-maison");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });
});
