import { expect, test, type Page } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";
import { acceptCookies } from "./helpers";

/**
 * Paiement (lib/paiement) : sans clé Stripe, le site tourne en démonstration avec le paiement
 * d'essai ; l'Atelier montre l'état du paiement, son historique et la page Paiements. Le webhook de
 * Stripe ne lit jamais un événement non signé. Les paiements Stripe eux-mêmes (session, signature,
 * remboursements, idempotence) sont couverts par tests/unit/paiement.test.ts, avec un faux serveur
 * Stripe : aucune requête ne part vers Stripe depuis les tests.
 */

async function commander(page: Page, email: string): Promise<string> {
  const products = (await (await page.request.get("/api/products?handles=top-kira")).json()).products as { variants: { id: string }[] }[];
  expect((await page.request.post("/api/cart", { data: { type: "clear" } })).ok()).toBeTruthy();
  expect((await page.request.post("/api/cart", { data: { type: "add", variantId: products[0].variants[0].id } })).ok()).toBeTruthy();
  const res = await page.request.post("/api/checkout", {
    data: { email, firstName: "Margaux", lastName: "Essai", address1: "12 rue de la Paix", zip: "75002", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return ((await res.json()) as { number: string }).number;
}

test("webhook Stripe : un événement non signé n'est jamais lu", async ({ request }) => {
  const evenement = { id: "evt_faux", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_faux", payment_status: "paid", metadata: { commande: "o-inexistante" } } } };
  for (const headers of [{}, { "stripe-signature": "t=1,v1=faux" }]) {
    const r = await request.post("/api/webhooks/stripe", { data: evenement, headers });
    // 503 sans clés Stripe (démonstration), 400 si la signature est fausse : jamais 200
    expect([400, 503]).toContain(r.status());
  }
});

test("paiement d'essai : la fiche de la commande et la page Paiements le montrent", async ({ page }) => {
  test.setTimeout(120_000);
  await acceptCookies(page);
  const numero = await commander(page, `paiement.${Date.now().toString(36)}@exemple.fr`);
  await adminLogin(page);
  await page.goto(`${ATELIER}/commandes/${numero}`);
  const section = page.getByRole("region", { name: "Paiement" });
  await expect(section).toContainText("Réussi");
  await expect(section).toContainText(/Paiement d’essai de la démonstration/);
  await expect(section).toContainText(/Historique du paiement/);
  await expect(section).not.toContainText(/4242/);

  await page.goto(`${ATELIER}/paiements`);
  await expect(page.getByRole("heading", { level: 1, name: "Paiements" })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(numero) })).toContainText("Essai");
  // le menu de l'Atelier mène à la page, sous Commandes
  await expect(page.getByRole("navigation", { name: "Menu de l’Atelier" }).getByRole("link", { name: "Paiements" })).toHaveAttribute("aria-current", "page");
});

test("retour d'un paiement abandonné : la page de commande le dit, le panier est intact", async ({ page }) => {
  await acceptCookies(page);
  await page.goto("/commande?paiement=annule");
  const message = page.locator('main p.notice[role="status"]');
  await expect(message).toBeVisible();
  // sur ordinateur, la justification du site pose des césures invisibles (U+00AD) dans les mots
  // longs : elles sont retirées avant de comparer le texte
  const lu = () => message.evaluate((el) => (el.textContent ?? "").replace(/\u00ad/g, ""));
  await expect.poll(lu).toContain("aucune somme n’a été prélevée");
  await expect.poll(lu).toContain("Votre panier vous attend");
});
