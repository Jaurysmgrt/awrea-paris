/**
 * Parcours de contrôle du site EN LIGNE, sans rien modifier (ni commande, ni compte, ni message) :
 * lancés chaque jour par l'agent de maintenance et après chaque déploiement
 * (BASE_URL=https://www.awreaparis.com npx playwright test production-smoke).
 * En local, ils tournent aussi sur la version de démonstration.
 */
import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

test.describe("Contrôle du site en ligne @prod", () => {
  test("pages essentielles : statut, titre unique, aucune erreur", async ({ page }) => {
    await acceptCookies(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
    for (const path of ["/", "/boutique", "/collections", "/la-maison", "/atelier", "/journal", "/contact", "/faq", "/cgv", "/mentions-legales", "/confidentialite", "/cookies", "/recherche?q=robe"]) {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.locator("h1"), path).toHaveCount(1);
    }
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("parcours d'achat jusqu'au panier (sans payer)", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    const first = page.locator(".product-card__link").first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".product__price")).toBeVisible();
    const size = page.locator('.product-form .chip:not([data-unavailable="true"])').first();
    if (await size.count()) {
      await size.click();
      await page.getByRole("button", { name: /^(Ajouter au panier|Précommander)$/ }).click();
      const drawer = page.locator("dialog.drawer");
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("link", { name: "Commander" }).or(drawer.getByRole("button", { name: "Commander" }))).toBeVisible();
    }
  });

  test("recherche, sécurité et santé des services", async ({ page, request }) => {
    const search = await request.get("/api/search");
    expect(search.ok()).toBe(true);
    expect(((await search.json()).entries ?? []).length).toBeGreaterThan(0);
    const res = await request.get("/", { headers: { Accept: "text/html", "Sec-Fetch-Dest": "document" } });
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    // l'Atelier n'est jamais accessible sans double authentification
    expect((await request.post("/api/gestion/agents/seo")).status()).toBe(401);
    await page.goto("/gestion");
    await expect(page).toHaveURL(/\/gestion\/connexion/);
  });
});
