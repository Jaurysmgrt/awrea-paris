/**
 * Étapes 4 et 5 des cahiers du 10/11 : la fenêtre « Profitez de votre privilège », l'inscription
 * confirmée par le lien de l'e-mail, et le −10 % retiré d'office au premier achat (mode
 * démonstration : paiement d'essai, boîte d'envoi simulée).
 */
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, confirmerInscription, lienDeConfirmation, outbox, waitForHydration } from "./helpers";

const fenetre = (page: Page) => page.getByRole("dialog", { name: "Profitez de votre privilège" });
/** la fenêtre se présente quelques secondes après l'arrivée */
const ATTENTE = 15_000;
const unique = (nom: string) => `${nom}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@exemple.fr`;

async function prix(page: Page, handle: string): Promise<{ variant: string; price: number; title: string }> {
  const j = await (await page.request.get(`/api/products?handles=${handle}`)).json();
  const p = j.products[0] as { title: string; price: number; variants: { id: string }[] };
  return { variant: p.variants[0].id, price: p.price, title: p.title };
}

/** Coordonnées et paiement d'essai accepté sur la page /commande. */
async function payer(page: Page) {
  await page.getByLabel("Prénom").fill("Alma");
  await page.getByLabel("Nom", { exact: true }).fill("Privilège");
  await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Dentelle");
  await page.getByLabel("Code postal").fill("75011");
  await page.getByLabel("Ville").fill("Paris");
  await page.getByLabel("Numéro de carte").fill("4242 4242 4242 4242");
  await page.getByRole("checkbox", { name: /j’accepte les conditions générales de vente/i }).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page).toHaveURL(/\/commande\/confirmation/);
}

test.describe("Fenêtre « Profitez de votre privilège »", () => {
  test("affichage, consentement obligatoire, fermeture, pas de réaffichage", async ({ page }) => {
    test.setTimeout(90_000);
    await acceptCookies(page, { privilege: true });
    await page.goto("/boutique");
    await waitForHydration(page);
    const f = fenetre(page);
    await expect(f).toBeVisible({ timeout: ATTENTE });
    // le texte de la créatrice, mot pour mot
    await expect(f.getByText("Inscrivez-vous à notre newsletter et profitez de 10 % de réduction sur votre première pièce.")).toBeVisible();
    await expect(f.getByText("Découvrez l’univers Awrea Paris et recevez nos actualités et nouveautés en avant-première.")).toBeVisible();
    await expect(f.getByText(/Valable 14 jours après la confirmation de votre inscription/)).toBeVisible();
    // case de consentement non cochée, obligatoire
    const consentement = f.getByRole("checkbox");
    await expect(consentement).not.toBeChecked();
    await f.getByLabel("Votre adresse e-mail").fill(unique("fenetre"));
    await f.getByRole("button", { name: "Recevoir mon privilège" }).click();
    await expect(f.getByText("Cochez la case pour recevoir la lettre et votre privilège.")).toBeVisible();
    await expect(consentement).toHaveAttribute("aria-invalid", "true");
    await expect(consentement).toBeFocused();
    // le focus reste dans la fenêtre
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    expect(await f.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    // Échap ferme ; la fenêtre ne revient pas avant 30 jours
    await page.keyboard.press("Escape");
    await expect(f).toBeHidden();
    const memoire = await page.evaluate(() => JSON.parse(localStorage.getItem("awrea_privilege") ?? "{}"));
    expect(memoire.vu).toBeTruthy();
    await page.reload();
    await waitForHydration(page);
    await page.waitForTimeout(ATTENTE - 3000);
    await expect(f).toBeHidden();
  });

  test("absente du paiement, du compte et tant que le panier est ouvert ; la croix ferme", async ({ page }) => {
    test.setTimeout(120_000);
    await acceptCookies(page, { privilege: true });
    for (const chemin of ["/commande", "/compte"]) {
      await page.goto(chemin);
      await waitForHydration(page);
      await page.waitForTimeout(ATTENTE - 4000);
      await expect(fenetre(page)).toBeHidden();
    }
    // le panier ouvert : la fenêtre attend qu'il se ferme
    await page.goto("/boutique");
    await waitForHydration(page);
    await page.getByRole("button", { name: /Panier\s*:/ }).click();
    await expect(page.locator("dialog.drawer")).toBeVisible();
    await page.waitForTimeout(ATTENTE - 3000);
    await expect(fenetre(page)).toBeHidden();
    await page.locator("dialog.drawer").getByRole("button", { name: "Fermer le panier" }).click();
    await expect(fenetre(page)).toBeVisible({ timeout: ATTENTE });
    await fenetre(page).getByRole("button", { name: "Fermer la fenêtre" }).click();
    await expect(fenetre(page)).toBeHidden();
  });

  test("inscription : le lien de confirmation, trouvé dans la boîte d'envoi, ouvre le privilège", async ({ page }) => {
    test.setTimeout(90_000);
    const email = unique("confirmation");
    await acceptCookies(page, { privilege: true });
    await page.goto("/");
    await waitForHydration(page);
    const f = fenetre(page);
    await expect(f).toBeVisible({ timeout: ATTENTE });
    await f.getByLabel("Votre adresse e-mail").fill(email);
    await f.getByRole("checkbox").check();
    await f.getByRole("button", { name: "Recevoir mon privilège" }).click();
    await expect(f.getByRole("heading", { name: "Plus qu’un clic" })).toBeVisible();
    await f.getByRole("button", { name: "Fermer la fenêtre" }).click();

    // avant le clic : aucune lettre, aucun privilège
    const lien = await lienDeConfirmation(email);
    expect(outbox().filter((m) => m.to === email).map((m) => m.subject)).toEqual(["Confirmez votre inscription"]);
    await page.goto(lien);
    await expect(page.getByRole("heading", { level: 2, name: "Votre inscription est confirmée" })).toBeVisible();
    await expect(page.getByText(/Votre privilège de bienvenue vous attend jusqu’au/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // la bienvenue de la lettre part après la confirmation, une fois
    await expect.poll(() => outbox().filter((m) => m.to === email && m.subject === "La lettre de la Maison").length).toBe(1);
    // le lien rouvert ne change rien
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Votre inscription est confirmée" })).toBeVisible();
    // un faux lien n'ouvre rien
    await page.goto("/lettres/confirmation?jeton=faux.jeton");
    await expect(page.getByRole("heading", { level: 1, name: "Ce lien n’est plus valable" })).toBeVisible();
  });
});

test.describe("−10 % retiré d'office au premier achat", () => {
  test("la réduction se lit avant le paiement, une seule fois : aucune réduction à la seconde commande", async ({ page }) => {
    test.setTimeout(120_000);
    const email = unique("premier.achat");
    await acceptCookies(page);
    const signup = await page.request.post("/api/newsletter", { data: { formule: "compacte", email, consent: true, source: "e2e" } });
    expect(signup.ok(), await signup.text()).toBeTruthy();
    const confirmee = await confirmerInscription(page, email);
    expect(confirmee.privilege).not.toBeNull();

    const chere = await prix(page, "robe-aria");
    const autre = await prix(page, "body-aura");
    expect(chere.price).toBeGreaterThan(autre.price);
    const remise = Math.round(chere.price / 10);
    const euros = (c: number) => new RegExp(`${Math.floor(c / 100)},${String(c % 100).padStart(2, "0")}\\s€`);
    await page.request.post("/api/cart", { data: { type: "clear" } });
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: chere.variant, quantity: 2 } })).ok()).toBeTruthy();
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: autre.variant } })).ok()).toBeTruthy();

    await page.goto("/commande");
    await waitForHydration(page);
    const recap = page.locator(".checkout-summary");
    const ligne = recap.locator(".totals__privilege");
    await expect(ligne).toHaveCount(0);
    const verifie = page.waitForResponse((r) => r.url().endsWith("/api/checkout/privilege"));
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Prénom").focus();
    await verifie;
    // une ligne, avec le nom de la pièce, sur une seule unité de la plus chère, sans prix barré
    await expect(ligne).toContainText(`Privilège de bienvenue, 10 % sur ${chere.title}`);
    await expect(ligne).toContainText(euros(remise));
    await expect(recap.locator("s, del")).toHaveCount(0);
    const total = 2 * chere.price + autre.price - remise;
    await expect(page.getByRole("button", { name: /^Payer/ })).toContainText(euros(total));
    await payer(page);

    // l'e-mail « Commande reçue » montre la remise
    await expect.poll(() => outbox().find((m) => m.to === email && /Votre commande AW-\d+ est reçue/.test(m.subject))?.text ?? "").toContain(`Privilège de bienvenue, 10 % sur ${chere.title}`);

    // seconde commande (livraison offerte aussi) : plus de réduction
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: chere.variant, quantity: 2 } })).ok()).toBeTruthy();
    await page.goto("/commande");
    await waitForHydration(page);
    const encore = page.waitForResponse((r) => r.url().endsWith("/api/checkout/privilege"));
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Prénom").focus();
    await encore;
    await page.waitForTimeout(300);
    await expect(recap.locator(".totals__privilege")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Payer/ })).toContainText(euros(2 * chere.price));
    // même en appelant la commande directement, le serveur ne la retire pas une seconde fois
    const api = await page.request.post("/api/checkout/privilege", { data: { email } });
    expect((await api.json()).remise).toBeNull();
    await page.request.post("/api/cart", { data: { type: "clear" } });
  });

  test("sans inscription confirmée, aucune réduction (commande sans compte)", async ({ page }) => {
    await acceptCookies(page);
    const email = unique("sans.confirmation");
    await page.request.post("/api/newsletter", { data: { formule: "compacte", email, consent: true, source: "e2e" } });
    const piece = await prix(page, "robe-aria");
    await page.request.post("/api/cart", { data: { type: "clear" } });
    await page.request.post("/api/cart", { data: { type: "add", variantId: piece.variant } });
    const r = await page.request.post("/api/checkout/privilege", { data: { email } });
    expect((await r.json()).remise).toBeNull();
    await page.request.post("/api/cart", { data: { type: "clear" } });
  });
});
