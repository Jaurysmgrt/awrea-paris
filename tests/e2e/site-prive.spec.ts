/**
 * Site privé (SITE_PRIVE=1, lib/security/private-site.ts) : une visiteuse ne voit que la page
 * d'attente, en français comme en anglais ; les API publiques répondent 404 ; robots.txt ferme
 * tout ; la créatrice connectée à l'Atelier voit tout le site, comme la personne qui a ouvert le
 * lien privé (SITE_PRIVE_CLE). Lancé seulement contre un serveur démarré avec SITE_PRIVE=1 (et les
 * mêmes variables pour Playwright).
 */
import { expect, test } from "@playwright/test";
import { ATELIER, adminLogin } from "./admin-auth";

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

test("lien privé : la clé ouvre tout le site sans l'Atelier, puis disparaît de l'adresse", async ({ page }) => {
  const key = process.env.SITE_PRIVE_CLE;
  test.skip(!key, "serveur démarré sans SITE_PRIVE_CLE");
  // une clé fausse ne donne rien
  await page.goto("/?cle=une-cle-fausse-0123456789-abcdefgh");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bientôt");
  // la bonne clé : la page demandée, et la clé n'est plus dans l'adresse
  await page.goto(`/la-maison?cle=${encodeURIComponent(key!)}`);
  expect(new URL(page.url()).pathname).toBe("/la-maison");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Bientôt");
  // ensuite, tout le site sans la clé, en français comme en anglais, toujours exclu des moteurs
  await page.goto("/boutique/body-aura");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aura");
  const res = await page.goto("/en");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Coming soon");
  // l'Atelier reste fermé : sa page de connexion
  await page.goto(ATELIER);
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/connexion`));
});

