import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { acceptCookies } from "./helpers";

/** Création du compte par code e-mail (mode démonstration : le code s'affiche à l'écran). */
async function signUp(page: Page, email: string) {
  await page.goto("/compte");
  await page.getByRole("radio", { name: "Créer un compte" }).click();
  await page.locator("#login-email").fill(email);
  // CGU obligatoires pour créer le compte
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  const code = (await page.locator(".notice strong").textContent())!.trim();
  await page.getByLabel("Code reçu par e-mail").fill(code);
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
}

/** Base clientes (mode démonstration) : création de compte, commandes et leur confection, préférences, RGPD. */
test.describe("Compte client", () => {
  test("création par code e-mail, tailles, adresse, préférences, partage, export et suppression", async ({ page }) => {
    await acceptCookies(page);
    const email = `cliente.${Date.now().toString(36)}@exemple.fr`;
    await signUp(page, email);

    await page.getByRole("tab", { name: "Mes tailles" }).click();
    await page.getByLabel("Robes").selectOption("S");
    await page.getByLabel("Tour de taille").fill("66");
    await page.getByRole("button", { name: "Enregistrer mes tailles" }).click();
    await expect(page.getByText("Vos tailles sont enregistrées.")).toBeVisible();

    await page.getByRole("tab", { name: "Adresses" }).click();
    await page.getByRole("button", { name: "Ajouter une adresse" }).click();
    await page.getByLabel("Prénom").fill("Claire");
    await page.getByLabel("Nom", { exact: true }).fill("Durand");
    await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Paix");
    await page.getByLabel("Code postal").fill("75002");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByRole("button", { name: "Enregistrer l’adresse" }).click();
    await expect(page.getByText("12 rue de la Paix")).toBeVisible();

    await page.getByRole("tab", { name: "Profil et préférences" }).click();
    await page.getByRole("switch", { name: "Le Cercle Awrea" }).check();
    await expect(page.getByText("C’est enregistré.")).toBeVisible();

    // plus de liste d'attente ni d'alerte de retour en stock : les envies seulement
    await page.getByRole("tab", { name: /Mes envies/ }).click();
    await expect(page.getByText(/retour en stock/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Partager ma liste" }).click();
    const share = await page.getByLabel("Lien de partage").inputValue();
    expect(share).toMatch(/\/liste-envies\/partagee\/[A-Za-z0-9_-]+$/);
    const shared = await page.request.get(new URL(share).pathname);
    expect(shared.status()).toBe(200);

    await page.getByRole("tab", { name: "Mes données" }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Télécharger mes données" }).click()]);
    const data = JSON.parse(fs.readFileSync((await dl.path())!, "utf8"));
    expect(data.profile.email).toBe(email);
    expect(data.profile.sizes.robe).toBe("S");
    expect(data.profile.termsVersion).toBeTruthy();
    expect(data.addresses).toHaveLength(1);

    await page.getByLabel("Pour confirmer, saisissez SUPPRIMER").fill("SUPPRIMER");
    await page.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(page.getByText("Votre compte a été supprimé")).toBeVisible();
    expect((await (await page.request.get("/api/account")).json()).user).toBeNull();
    // le lien de partage ne fonctionne plus
    expect((await page.request.get(new URL(share).pathname)).status()).toBe(404);
  });

  test("commandes : la frise de la confection, l’étape en cours et la fin de confection prévue", async ({ page }) => {
    await acceptCookies(page);
    const email = `frise.${Date.now().toString(36)}@exemple.fr`;
    // une commande passée sans compte, puis le compte ouvert avec la même adresse
    const products = (await (await page.request.get("/api/products?handles=body-aura")).json()).products as { variants: { id: string }[] }[];
    expect((await page.request.post("/api/cart", { data: { type: "clear" } })).ok()).toBeTruthy();
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: products[0].variants[0].id } })).ok()).toBeTruthy();
    const res = await page.request.post("/api/checkout", {
      data: { email, firstName: "Iris", lastName: "Essai", address1: "12 rue de la Paix", zip: "75002", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const { number } = (await res.json()) as { number: string };

    await signUp(page, email);
    await expect(page.getByRole("tab", { name: /Commandes/ })).toHaveAttribute("aria-selected", "true");
    const stages = page.getByRole("list", { name: `Étapes de la commande ${number}` });
    await expect(stages.getByRole("listitem")).toHaveCount(5);
    await expect(stages.getByRole("listitem")).toHaveText([/Commande reçue/, /En confection/, /Prête/, /Expédiée/, /Livrée/]);
    // l'étape en cours est annoncée, datée ; la fin de confection prévue suit le délai de la pièce
    await expect(stages.locator('[aria-current="step"]')).toContainText("Commande reçue");
    await expect(stages.locator('[aria-current="step"]')).toContainText("étape en cours");
    await expect(stages.locator('[aria-current="step"] time')).toHaveCount(1);
    await expect(page.locator(".order").filter({ hasText: number }).getByText(/Fin de confection prévue (entre )?le/)).toBeVisible();
  });

  test("création refusée sans acceptation des CGU ; connexion refusée pour une adresse inconnue", async ({ request }) => {
    const r1 = await request.post("/api/account/login", { data: { email: "sans.cgu@exemple.fr", mode: "signup", terms: false } });
    expect(r1.status()).toBe(400);
    const r2 = await request.post("/api/account/login", { data: { email: `inconnue.${Date.now()}@exemple.fr`, mode: "login" } });
    expect(r2.status()).toBe(404);
    const r3 = await request.get("/api/account/export");
    expect(r3.status()).toBe(401);
    // les listes d'attente n'existent plus
    expect((await request.post("/api/waitlist", { data: { email: "a@exemple.fr", handle: "body-aura" } })).status()).toBe(404);
    expect((await request.delete("/api/account/waitlist?id=x")).status()).toBe(404);
  });
});
