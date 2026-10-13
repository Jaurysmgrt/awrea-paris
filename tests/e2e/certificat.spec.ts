import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { acceptCookies, signUp } from "./helpers";

/** Boîte d'envoi simulée du mode démonstration (stockage local du serveur de test). */
function outbox(): { to: string; subject: string; text: string }[] {
  const store = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".data", "store.json"), "utf8"));
  return store["email:outbox"] ?? [];
}

async function buy(page: Page, email: string) {
  await page.goto("/boutique/body-aura");
  await page.locator('.product-form .chip:not([data-unavailable="true"])').first().click();
  await page.getByRole("button", { name: /^(Ajouter au panier|Précommander)$/ }).click();
  await page.locator("dialog.drawer").getByRole("link", { name: "Commander" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Prénom").fill("Inès");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse", { exact: true }).fill("3 rue du Bac");
  await page.getByLabel("Code postal").fill("75007");
  await page.getByLabel("Ville").fill("Paris");
  await page.getByLabel("Numéro de carte").fill("4242 4242 4242 4242");
  await page.getByRole("checkbox", { name: /j’accepte les conditions générales de vente/i }).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page).toHaveURL(/\/commande\/confirmation/);
}

test.describe("Certificats d’authenticité", () => {
  test("achat → certificat en ligne avec QR code → pièce offerte rattachée avec son code → compte", async ({ page }) => {
    await acceptCookies(page);
    const id = Date.now().toString(36);
    const buyer = `acheteuse.${id}@exemple.fr`;
    await buy(page, buyer);

    // la confirmation mène au certificat numérique
    await page.locator(".confirmation__certificates").getByRole("link", { name: /^Body Aura/ }).click();
    await expect(page).toHaveURL(/\/certificat\/AW-[A-Z0-9]+-\d{2,4}-[A-Z0-9]{4}$/);
    const serial = page.url().split("/").pop()!;
    await expect(page.getByRole("heading", { level: 1, name: "Body Aura" })).toBeVisible();
    await expect(page.getByText("Certificat d’authenticité", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: `QR code du certificat ${serial}` })).toBeVisible();
    await expect(page.locator(".certificate__qr svg")).toBeVisible();
    await expect(page.getByText("pour la rattacher à votre compte")).toBeVisible();

    // impression : le certificat seul, sans l'en-tête ni les actions
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.getByRole("button", { name: "Imprimer le certificat" })).toBeHidden();
    await expect(page.locator(".certificate")).toBeVisible();
    await page.emulateMedia({ media: "screen" });

    // le code de rattachement est transmis avec la confirmation de commande
    const mail = outbox().find((m) => m.to === buyer && m.subject.startsWith("Votre commande"));
    const code = mail?.text.match(/Body Aura : ([A-Z0-9]{4}-[A-Z0-9]{4})/)?.[1];
    expect(code, "code de rattachement dans l’e-mail").toBeTruthy();

    // la pièce est offerte : sa nouvelle propriétaire crée son compte et la rattache
    await page.context().clearCookies();
    await acceptCookies(page);
    await signUp(page, `offerte.${id}@exemple.fr`);
    await page.goto(`/certificat/${serial}`);
    await page.getByRole("textbox", { name: "Code du certificat" }).fill("ABCD-EFGH");
    await page.getByRole("button", { name: "Rattacher à mon compte" }).click();
    await expect(page.locator(".certificate-claim").getByRole("alert")).toContainText("ne correspond pas");
    await page.getByRole("textbox", { name: "Code du certificat" }).fill(code!);
    await page.getByRole("button", { name: "Rattacher à mon compte" }).click();
    await expect(page.locator(".certificate-actions").getByRole("status")).toContainText("fait partie de votre collection");

    await page.goto("/compte#certificats");
    await expect(page.getByRole("tab", { name: /Certificats/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(serial)).toBeVisible();
    await page.getByRole("link", { name: "Voir le certificat" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/certificat/${serial}$`));
  });

  test("certificat inconnu : page introuvable ; rattachement réservé aux clientes connectées", async ({ request }) => {
    expect((await request.get("/certificat/AW-XXX-01-ABCD")).status()).toBe(404);
    expect((await request.get("/certificat/n-importe-quoi")).status()).toBe(404);
    const claim = await request.post("/api/certificats/AW-XXX-01-ABCD", { data: { code: "ABCD-EFGH" } });
    expect(claim.status()).toBe(401);
  });
});
