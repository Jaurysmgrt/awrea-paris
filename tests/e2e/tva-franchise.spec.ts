import { expect, test } from "@playwright/test";
import { acceptCookies, outbox, waitForHydration } from "./helpers";

/**
 * Franchise en base de TVA (cahier du 10/11/2026, réglage content/settings.ts → shop.vatRegime) :
 * le récapitulatif avant paiement et l'e-mail « Commande reçue » portent la mention de l'article
 * 293 B du CGI, sans aucune ligne de TVA ; le montant payé reste le prix affiché.
 */
const MENTION = "TVA non applicable, article 293 B du Code général des impôts.";

test("franchise de TVA : mention au récapitulatif et dans l’e-mail de confirmation, aucune ligne de TVA", async ({ page }) => {
  await acceptCookies(page);
  const products = (await (await page.request.get("/api/products?handles=top-kira")).json()).products as { variants: { id: string }[] }[];
  expect((await page.request.post("/api/cart", { data: { type: "clear" } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/cart", { data: { type: "add", variantId: products[0].variants[0].id } })).ok()).toBeTruthy();

  // récapitulatif avant paiement : la mention en note, ni « dont TVA » ni « TTC »
  await page.goto("/commande");
  await waitForHydration(page);
  const recap = page.getByRole("complementary", { name: "Récapitulatif de la commande" });
  await expect(recap).toContainText(MENTION);
  await expect(recap).not.toContainText("dont TVA");
  await expect(recap).not.toContainText("TTC");

  // commande d’essai : l’e-mail « Commande reçue » porte la même mention, sous le détail de la commande
  const email = `tva.${Date.now().toString(36)}@exemple.fr`;
  const res = await page.request.post("/api/checkout", {
    data: { email, firstName: "Camille", lastName: "Essai", address1: "12 rue de la Paix", zip: "75002", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  await expect.poll(() => outbox().find((m) => m.to === email && /^Votre commande .+ est reçue$/.test(m.subject))?.text ?? "", { timeout: 30_000 }).toContain(MENTION);
  const mail = outbox().find((m) => m.to === email && /^Votre commande .+ est reçue$/.test(m.subject))!;
  expect(mail.text).not.toMatch(/dont TVA|TTC/);
});
