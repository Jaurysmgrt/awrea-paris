import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, outbox } from "./helpers";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Avant-premières des collections : page « Bientôt » (dates écrites, aucun compte à rebours),
 * avant-première des inscrites ouverte par leur lien personnel, lettre de la Maison choisie dans
 * l'Atelier, présentation privée protégée par un mot de passe. Aucune quantité, aucune rareté.
 */
const PIECE = "robe-odessa";
const at = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

async function createDrop(page: Page, data: Record<string, unknown>) {
  const res = await page.request.post(`${ATELIER}/api/drops`, { data });
  expect(res.ok(), await res.text()).toBeTruthy();
}
async function variantOf(page: Page, handle: string): Promise<string> {
  const j = await (await page.request.get(`/api/products?handles=${handle}`)).json();
  // pièce créée sur demande : toutes ses tailles se commandent
  return (j.products[0].variants as { id: string }[])[0].id;
}
/** Lien personnel de l'avant-première, lu dans la boîte d'envoi simulée. */
async function accessLink(email: string, subject: RegExp): Promise<string> {
  let link = "";
  await expect
    .poll(() => {
      link = outbox().find((m) => m.to === email && subject.test(m.subject))?.text.match(/https?:\/\/\S+\/bientot\/\S+\/acces\?t=\S+/)?.[0] ?? "";
      return link;
    })
    .not.toBe("");
  return link;
}

test.describe.configure({ mode: "serial" });

test.describe("Avant-premières des collections", () => {
  test("avant-première : hors de la boutique, réservée aux inscrites, ouverte par le lien de l’e-mail", async ({ page }) => {
    await acceptCookies(page);
    await adminLogin(page);
    const slug = `essai-${Date.now().toString(36)}`;
    // variante lue avant l'annonce : pendant l'avant-première, le catalogue public masque la pièce
    const variant = await variantOf(page, PIECE);
    await createDrop(page, { slug, title: "Collection d’essai", teaser: "Une collection annoncée pour vérifier l’avant-première des inscrites.", products: [PIECE], earlyAccessAt: at(-1), publicAt: at(48), privateSale: false });
    try {
      // la pièce quitte la boutique et ne se commande plus sans accès
      await page.goto("/boutique");
      await expect(page.locator(`main a[href="/boutique/${PIECE}"]`)).toHaveCount(0);
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).status()).toBe(403);
      await page.goto(`/boutique/${PIECE}`);
      await expect(page.locator(".drop-gate")).toContainText("en avant-première");

      // la page de la collection : dates écrites en toutes lettres, aucun compte à rebours
      await page.goto(`/bientot/${slug}`);
      await expect(page.getByRole("heading", { level: 1, name: "Collection d’essai" })).toBeVisible();
      await expect(page.locator("main dl")).toContainText("Dévoilement");
      await expect(page.getByText("Heure de Paris.")).toBeVisible();
      await expect(page.locator(".countdown")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText(/\bséries?\b|numérot|dernières pièces|compte à rebours/i);

      // inscription sur la page, lien personnel par e-mail
      const email = `inscrite.${Date.now().toString(36)}@exemple.fr`;
      const form = page.getByRole("region", { name: "Recevoir l’avant-première" });
      await form.getByLabel("Adresse e-mail").fill(email);
      await form.getByRole("button", { name: "Recevoir mon lien" }).click();
      await expect(page.getByRole("status").filter({ hasText: "lien personnel" })).toBeVisible();
      const url = new URL(await accessLink(email, /avant-première/));
      await page.goto(url.pathname + url.search);
      await expect(page).toHaveURL(new RegExp(`/bientot/${slug}$`));
      await expect(page.getByRole("heading", { name: "Votre avant-première est ouverte" })).toBeVisible();

      // l'inscrite commande avant le dévoilement à toutes
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).ok()).toBeTruthy();
      await page.goto(`/boutique/${PIECE}`);
      await expect(page.locator(".drop-gate")).toHaveCount(0);
      await expect(page.locator(".product-form__actions").getByRole("button", { name: "Ajouter au panier" })).toBeVisible();
    } finally {
      await page.request.post("/api/cart", { data: { type: "clear" } });
      await page.request.delete(`${ATELIER}/api/drops?slug=${slug}`);
    }
  });

  test("lettre de la Maison : les inscrites reçoivent leur lien quand la créatrice le choisit", async ({ page }) => {
    await acceptCookies(page);
    const email = `lettre.${Date.now().toString(36)}@exemple.fr`;
    const signup = await page.request.post("/api/newsletter", { data: { formule: "compacte", email, consent: true, source: "e2e" } });
    expect(signup.ok(), await signup.text()).toBeTruthy();
    await adminLogin(page);
    const slug = `lettre-${Date.now().toString(36)}`;
    await createDrop(page, { slug, title: "Collection de la lettre", teaser: "Une collection annoncée aux inscrites à la lettre de la Maison.", products: [PIECE], earlyAccessAt: at(24), publicAt: at(72), privateSale: false, notifyLetters: true });
    try {
      const url = new URL(await accessLink(email, /Collection de la lettre/));
      await page.goto(url.pathname + url.search);
      await expect(page).toHaveURL(new RegExp(`/bientot/${slug}$`));
      // avant l'ouverture de l'avant-première : l'accès est prêt, la commande attend la date
      await expect(page.getByRole("heading", { name: "Votre accès est prêt" })).toBeVisible();
      // une seule lettre par inscrite et par collection, même si la collection est enregistrée de nouveau
      await createDrop(page, { slug, title: "Collection de la lettre", teaser: "Une collection annoncée aux inscrites à la lettre de la Maison.", products: [PIECE], earlyAccessAt: at(24), publicAt: at(72), privateSale: false, notifyLetters: true });
      await page.waitForTimeout(1500);
      expect(outbox().filter((m) => m.to === email && /Collection de la lettre/.test(m.subject))).toHaveLength(1);
    } finally {
      await page.request.delete(`${ATELIER}/api/drops?slug=${slug}`);
    }
  });

  test("présentation privée : réservée aux détentrices du mot de passe", async ({ page }) => {
    await acceptCookies(page);
    await adminLogin(page);
    const slug = `privee-${Date.now().toString(36)}`;
    const teaser = "Quelques pièces montrées d’abord à quelques personnes, le temps d’une soirée à l’atelier.";
    const variant = await variantOf(page, PIECE);
    await createDrop(page, { slug, title: "Présentation privée d’essai", teaser, products: [PIECE], earlyAccessAt: at(-2), publicAt: at(24), privateSale: true, password: "dentelle-noire" });
    try {
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).status()).toBe(403);
      // jamais sur la page « Bientôt » : son adresse est transmise par la Maison
      await page.goto("/bientot");
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Présentation privée d’essai");

      await page.goto(`/bientot/${slug}`);
      // ni texte, ni images, ni pièces avant le mot de passe
      await expect(page.getByText(teaser)).toHaveCount(0);
      await page.getByLabel("Mot de passe de la présentation privée").fill("au-hasard");
      await page.getByRole("button", { name: "Entrer" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "n’ouvre pas" })).toBeVisible();
      await page.getByLabel("Mot de passe de la présentation privée").fill("dentelle-noire");
      await page.getByRole("button", { name: "Entrer" }).click();
      await expect(page.getByRole("heading", { name: "La présentation privée vous est ouverte" })).toBeVisible();
      await expect(page.getByText(teaser)).toBeVisible();
      expect((await page.request.post("/api/cart", { data: { type: "add", variantId: variant } })).ok()).toBeTruthy();
      // jamais indexée
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    } finally {
      await page.request.post("/api/cart", { data: { type: "clear" } });
      await page.request.delete(`${ATELIER}/api/drops?slug=${slug}`);
    }
  });

  test("« Bientôt » sans collection annoncée : invitation à la lettre de la Maison", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/bientot");
    await expect(page.getByRole("heading", { level: 1, name: "Bientôt" })).toBeVisible();
    await expect(page.locator("main form")).not.toHaveCount(0);
    await expect(page.locator(".countdown")).toHaveCount(0);
    expect((await page.request.get("/bientot/collection-inconnue")).status()).toBe(404);
  });
});
