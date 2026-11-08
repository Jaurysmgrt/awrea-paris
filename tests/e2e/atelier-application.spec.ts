import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Application privée de l'Atelier (PWA) : manifeste et service worker servis sous l'adresse secrète,
 * sans rien révéler ; page « Application » honnête quand les notifications ne sont pas branchées ;
 * onglets du bas sur téléphone, absents sur ordinateur.
 */
test("manifeste et service worker : sous l'adresse secrète, sans donnée, le reste fermé sans session", async ({ request }) => {
  const manifeste = await request.get(`${ATELIER}/atelier.webmanifest`);
  expect(manifeste.status()).toBe(200);
  expect(manifeste.headers()["content-type"]).toContain("application/manifest+json");
  const m = await manifeste.json();
  expect(m.scope).toBe(`${ATELIER}/`);
  expect(m.start_url).toBe(`${ATELIER}/`);
  expect(m.display).toBe("standalone");

  const sw = await request.get(`${ATELIER}/sw.js`);
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  const script = await sw.text();
  expect(script).toContain(`"portee":"${ATELIER}/"`);
  expect(script).not.toMatch(/cache\.put/);

  // sans session, les pages de l'Atelier restent fermées
  const commandes = await request.get(`${ATELIER}/commandes`, { maxRedirects: 0 });
  expect(commandes.status()).not.toBe(200);
  // le manifeste du site public ne mène jamais à l'Atelier
  const publicManifest = await request.get("/manifest.webmanifest");
  if (publicManifest.ok()) expect(await publicManifest.text()).not.toContain(ATELIER);
});

test("page Application : installation expliquée, notifications pas encore branchées dites honnêtement", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/application`);
  await expect(page.getByRole("heading", { level: 1, name: "Application" })).toBeVisible();
  await expect(page.locator(`link[rel="manifest"][href="${ATELIER}/atelier.webmanifest"]`)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Installer l’application" })).toBeVisible();
  await expect(page.getByText("Sur un autre appareil")).toBeVisible();
  // aucune clé VAPID dans l'environnement de test : rien n'est simulé
  await expect(page.getByText(/Les notifications ne sont pas encore branchées/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Recevoir les notifications ici" })).toHaveCount(0);
  await expect(page.getByText(/ne montre jamais le nom, l’adresse ni le téléphone d’une cliente/)).toBeVisible();
  // le service worker s'enregistre, avec la portée de l'Atelier
  const portee = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => r.scope), new Promise<string>((ok) => setTimeout(() => ok(""), 10_000))]));
  expect(portee, "service worker enregistré").not.toBe("");
  expect(new URL(portee).pathname).toBe(`${ATELIER}/`);
});

test("téléphone : onglets du bas, à portée de pouce ; ordinateur : aucun onglet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminLogin(page);
  await page.goto(ATELIER);
  const onglets = page.getByRole("navigation", { name: "Raccourcis de l’Atelier" });
  await expect(onglets).toBeVisible();
  for (const name of ["Accueil", "Commandes", "Produits", "Clientes", "À valider"]) await expect(onglets.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(onglets.getByRole("link", { name: /^Accueil/ })).toHaveAttribute("aria-current", "page");
  await onglets.getByRole("link", { name: /^Commandes/ }).click();
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/commandes$`));
  await expect(onglets.getByRole("link", { name: /^Commandes/ })).toHaveAttribute("aria-current", "page");
  // cibles tactiles d'au moins 48 px, aucun débordement
  const hauteur = await onglets.getByRole("link", { name: /^Commandes/ }).evaluate((e) => e.getBoundingClientRect().height);
  expect(hauteur).toBeGreaterThanOrEqual(48);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(onglets).toBeHidden();
});
