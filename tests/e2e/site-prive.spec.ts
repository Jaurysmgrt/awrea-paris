/**
 * Site privé (SITE_PRIVE=1, lib/security/private-site.ts) : une visiteuse ne voit que la page
 * d'attente, en français comme en anglais ; les API publiques répondent 404 ; robots.txt ferme
 * tout ; la créatrice connectée à l'Atelier voit tout le site. Lancé seulement contre un serveur
 * démarré avec SITE_PRIVE=1 (et la même variable pour Playwright).
 */
import { expect, test } from "@playwright/test";
import { adminLogin } from "./admin-auth";

test.skip(process.env.SITE_PRIVE !== "1", "serveur démarré sans SITE_PRIVE=1");

test("visiteuse : la page d’attente partout, rien d’indexable", async ({ page, request }) => {
  for (const path of ["/", "/boutique/body-aura", "/cgv", "/en", "/en/la-maison"]) {
    const res = await page.goto(path);
    expect(res?.headers()["x-robots-tag"], path).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(path.startsWith("/en") ? "Coming soon" : "Bientôt");
    // aucun contenu du site : ni en-tête, ni navigation, ni pied de page
    await expect(page.locator("header, nav, footer")).toHaveCount(0);
  }
  expect((await request.get("/api/search")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \/\s*$/m);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("<loc>");
  expect((await request.get("/llms.txt")).status()).toBe(404);
});

test("créatrice connectée à l’Atelier : tout le site, en français et en anglais", async ({ page }) => {
  test.setTimeout(120_000);
  await adminLogin(page);
  await page.goto("/boutique/body-aura");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aura");
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Coming soon");
});
