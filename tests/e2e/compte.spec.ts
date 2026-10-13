import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { acceptCookies } from "./helpers";

/** Base clientes (mode démonstration) : création de compte, préférences, RGPD. */
test.describe("Compte client", () => {
  test("création par code e-mail, tailles, adresse, préférences, partage, export et suppression", async ({ page }) => {
    await acceptCookies(page);
    const email = `cliente.${Date.now().toString(36)}@exemple.fr`;
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

    await page.getByRole("tab", { name: /Envies et alertes/ }).click();
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

  test("création refusée sans acceptation des CGU ; connexion refusée pour une adresse inconnue", async ({ request }) => {
    const r1 = await request.post("/api/account/login", { data: { email: "sans.cgu@exemple.fr", mode: "signup", terms: false } });
    expect(r1.status()).toBe(400);
    const r2 = await request.post("/api/account/login", { data: { email: `inconnue.${Date.now()}@exemple.fr`, mode: "login" } });
    expect(r2.status()).toBe(404);
    const r3 = await request.get("/api/account/export");
    expect(r3.status()).toBe(401);
  });
});
