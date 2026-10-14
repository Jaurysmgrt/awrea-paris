import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, outbox } from "./helpers";
import { adminLogin } from "./admin-auth";

/** Drops : page « Bientôt », accès anticipé des inscrites, vente privée protégée par mot de passe. */
const PIECE = "robe-odessa";
const at = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

async function createDrop(page: Page, data: Record<string, unknown>) {
  const res = await page.request.post("/api/gestion/drops", { data });
  expect(res.ok(), await res.text()).toBeTruthy();
}
async function variantOf(page: Page, handle: string): Promise<string> {
  const j = await (await page.request.get(`/api/products?handles=${handle}`)).json();
  // une taille en précommande reste toujours commandable
  const v = j.products[0].variants.find((x: { preorder: boolean; quantity: number }) => x.preorder || x.quantity > 0);
  return v.id;
}

test.describe.configure({ mode: "serial" });

test.describe("Drops et lancements", () => {
  test("accès anticipé : hors de la boutique, réservé aux inscrites, ouvert par le lien de l’e-mail", async ({ page }) => {
    await acceptCookies(page);
    await adminLogin(page);
    const slug = `essai-${Date.now().toString(36)}`;
    // variante lue avant l'annonce : pendant le drop, le catalogue public masque la pièce
    const variant = await variantOf(page, PIECE);
    await createDrop(page, { slug, title: "Série d’essai", teaser: "Une série annoncée pour vérifier l’accès anticipé des inscrites.", products: [PIECE], earlyAccessAt: at(-1), publicAt: at(48), privateSale: false });
    try {
      // la pièce quitte la boutique et ne s'achète plus sans accès
      await page.goto("/boutique");
      await expect(page.locator(`main a[href="/boutique/${PIECE}"]`)).toHaveCount(0);
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).status()).toBe(403);
      await page.goto(`/boutique/${PIECE}`);
      await expect(page.locator(".drop-gate")).toContainText("réservée aux inscrites");

      // inscription sur la page du drop, lien personnel par e-mail
      await page.goto(`/bientot/${slug}`);
      await expect(page.getByRole("heading", { level: 1, name: "Série d’essai" })).toBeVisible();
      await expect(page.locator(".countdown__date")).toContainText("heure de Paris");
      const email = `inscrite.${Date.now().toString(36)}@exemple.fr`;
      const form = page.getByRole("region", { name: "Réserver votre accès anticipé" });
      await form.getByLabel("Adresse e-mail").fill(email);
      await form.getByRole("button", { name: "Réserver mon accès anticipé" }).click();
      await expect(page.getByRole("status").filter({ hasText: "lien d’accès" })).toBeVisible();
      let link = "";
      await expect
        .poll(() => {
          link = outbox().find((m) => m.to === email)?.text.match(/https?:\/\/\S+\/bientot\/\S+/)?.[0] ?? "";
          return link;
        })
        .not.toBe("");
      const url = new URL(link);
      await page.goto(url.pathname + url.search);
      await expect(page).toHaveURL(new RegExp(`/bientot/${slug}$`));
      await expect(page.getByRole("heading", { name: "Votre accès est ouvert" })).toBeVisible();

      // l'inscrite peut acheter avant l'ouverture à toutes
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).ok()).toBeTruthy();
      await page.goto(`/boutique/${PIECE}`);
      await expect(page.locator(".drop-gate")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Ajouter au panier|Précommander)$/ })).toBeVisible();
    } finally {
      await page.request.post("/api/cart", { data: { type: "clear" } });
      await page.request.delete(`/api/gestion/drops?slug=${slug}`);
    }
  });

  test("vente privée : réservée aux détentrices du mot de passe", async ({ page }) => {
    await acceptCookies(page);
    await adminLogin(page);
    const slug = `privee-${Date.now().toString(36)}`;
    const variant = await variantOf(page, PIECE);
    await createDrop(page, { slug, title: "Vente privée d’essai", teaser: "Quelques pièces réservées, le temps d’une soirée à l’atelier.", products: [PIECE], earlyAccessAt: at(-2), publicAt: at(24), privateSale: true, password: "dentelle-noire" });
    try {
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).status()).toBe(403);
      await page.goto(`/bientot/${slug}`);
      await page.getByLabel("Mot de passe de la vente privée").fill("au-hasard");
      await page.getByRole("button", { name: "Entrer" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "n’ouvre pas" })).toBeVisible();
      await page.getByLabel("Mot de passe de la vente privée").fill("dentelle-noire");
      await page.getByRole("button", { name: "Entrer" }).click();
      await expect(page.getByRole("heading", { name: "Votre accès est ouvert" })).toBeVisible();
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).ok()).toBeTruthy();
      // jamais indexée
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    } finally {
      await page.request.post("/api/cart", { data: { type: "clear" } });
      await page.request.delete(`/api/gestion/drops?slug=${slug}`);
    }
  });

  test("« Bientôt » sans série annoncée : invitation aux lettres de l’atelier", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/bientot");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await page.request.get("/bientot/serie-inconnue")).status()).toBe(404);
  });
});
