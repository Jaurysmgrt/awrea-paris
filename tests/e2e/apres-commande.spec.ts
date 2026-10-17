import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, outbox } from "./helpers";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Après la commande, sans compte : facture PDF, suivi par numéro et e-mail, expédition et
 * livraison déclarées dans l'Atelier (e-mails), retour en libre-service avec étiquette, puis
 * réception, remboursement et avoir dans l'Atelier.
 */
async function orderOne(page: Page, email: string) {
  const products = (await (await page.request.get("/api/products?handles=top-kira")).json()).products as { variants: { id: string; size: string; quantity: number; preorder: boolean }[] }[];
  const v = products[0].variants.find((x) => x.quantity > 0) ?? products[0].variants.find((x) => x.preorder)!;
  expect((await page.request.post("/api/cart", { data: { type: "clear" } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/cart", { data: { type: "add", variantId: v.id } })).ok()).toBeTruthy();
  const res = await page.request.post("/api/checkout", {
    data: { email, firstName: "Margaux", lastName: "Essai", address1: "12 rue de la Paix", zip: "75002", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as { number: string; access: string };
}

test.describe.configure({ mode: "serial" });

test("facture, suivi sans compte, expédition, livraison, retour, remboursement et avoir", async ({ page }) => {
  test.setTimeout(180_000);
  await acceptCookies(page);
  const email = `apres.${Date.now().toString(36)}@exemple.fr`;
  const { number, access } = await orderOne(page, email);

  // facture PDF par le lien signé, refusée sans lui
  const pdf = await page.request.get(`/api/factures/${number}?t=${encodeURIComponent(access)}`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect((await page.request.get(`/api/factures/${number}?t=faux`)).status()).toBe(404);

  // suivi sans compte : numéro et e-mail
  await page.goto("/suivi");
  await page.getByLabel("Numéro de commande").fill(number);
  await page.getByLabel("E-mail de la commande").fill("autre@exemple.fr");
  await page.getByRole("button", { name: "Suivre ma commande" }).click();
  await expect(page.locator(".track-form").getByRole("alert")).toContainText("Aucune commande ne correspond");
  await page.getByLabel("E-mail de la commande").fill(email);
  await page.getByRole("button", { name: "Suivre ma commande" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Commande ${number}` })).toBeVisible();
  await expect(page.getByText("Le retour s’ouvre dès l’expédition de la commande.")).toBeVisible();
  const follow = page.url();

  // Atelier : expédition (suivi) puis livraison, avec leurs e-mails
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes/${number}`);
  await page.getByLabel("Numéro de suivi").fill("6A99999999999");
  await page.getByRole("button", { name: "Marquer comme expédiée" }).click();
  await page.getByRole("button", { name: "Marquer comme livrée" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme livrée" })).toHaveCount(0);
  await expect.poll(() => outbox().filter((m) => m.to === email).map((m) => m.subject)).toEqual(expect.arrayContaining(["Votre pièce est en route", "Votre pièce est arrivée"]));

  // retour en libre-service : remboursement, étiquette aussitôt
  await page.goto(follow);
  await page.getByRole("checkbox", { name: /Top Kira/ }).check();
  await page.getByLabel("Raison", { exact: true }).selectOption("tombe");
  await page.getByLabel(/Je renvoie la pièce non portée/).check();
  await page.getByRole("button", { name: "Demander le retour" }).click();
  await expect(page.getByText(/R-\d{4}-\d{4} · Retour demandé/)).toBeVisible();
  const labelHref = await page.getByRole("link", { name: "Étiquette de retour (PDF)" }).getAttribute("href");
  const label = await page.request.get(labelHref!);
  expect((await label.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  await expect.poll(() => outbox().some((m) => m.to === email && /Votre retour R-/.test(m.subject))).toBeTruthy();
  // la même pièce ne peut pas être retournée deux fois
  await expect(page.getByText("Toutes les pièces de cette commande font déjà l’objet d’un retour.")).toBeVisible();

  // Atelier : colis reçu, remboursement confirmé, avoir émis
  await page.goto(`${ATELIER}/retours`);
  const item = page.locator("li").filter({ hasText: number }).first();
  await item.getByRole("button", { name: "Colis reçu" }).click();
  await expect(item.getByText("Colis reçu à l’atelier")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await item.getByRole("button", { name: /^Rembourser/ }).click();
  await expect(page.locator("li").filter({ hasText: number }).filter({ hasText: "Remboursée" })).toBeVisible();
  await expect.poll(() => outbox().some((m) => m.to === email && /Remboursement de votre retour/.test(m.subject))).toBeTruthy();
  await page.goto(`${ATELIER}/factures`);
  await expect(page.locator("tr").filter({ hasText: number }).filter({ hasText: /avoir de F-/ })).toBeVisible();
});
