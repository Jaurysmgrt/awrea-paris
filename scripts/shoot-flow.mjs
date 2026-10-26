// Captures du parcours d'achat (panier ouvert, commande, enveloppe) à plusieurs largeurs.
import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.addCookies([{ name: "awrea_consent", value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, social: false, date: "2026-01-01" })), url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + "/boutique/robe-odessa", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.locator(".product-form .chip", { hasText: /^S/ }).click();
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await page.waitForTimeout(1500);
  await page.locator("dialog.drawer").getByText(/Emballage cadeau avec un mot/).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/flow-drawer-${w}.png` });
  await page.locator("dialog.drawer").getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/commande/);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/flow-checkout-${w}.png`, fullPage: true });
  await page.getByLabel("E-mail", { exact: true }).fill("visuel@exemple.fr");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Visuel");
  await page.getByLabel("Adresse", { exact: true }).fill("3 rue Oberkampf");
  await page.getByLabel("Code postal").fill("75011");
  await page.getByLabel("Ville").fill("Paris");
  await page.getByText(/J’accepte les/).click();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await page.waitForURL(/confirmation/);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/flow-envelope-a-${w}.png` });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/flow-envelope-b-${w}.png` });
  await page.screenshot({ path: `${out}/flow-confirm-full-${w}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
