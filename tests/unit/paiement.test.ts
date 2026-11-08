/**
 * Paiement Stripe : paramètres de la page de paiement (le montant est toujours celui de la boutique),
 * suivi des événements, signature des webhooks, idempotence des appels (faux serveur Stripe local :
 * aucune requête ne part vers Stripe).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import type Stripe from "stripe";
import { lignesDetaillees, parametresSession, SESSION_MINUTES } from "@/lib/paiement/session";
import { moyenDe, reperesDe, suivreEvenement } from "@/lib/paiement/evenements";
import { creerSession, nouveauClient, rembourser, verifierWebhook, cleDeTest, cleReelle } from "@/lib/paiement/stripe-api";
import { lienStripe, paiementEnAttente } from "@/lib/paiement/types";
import type { Order } from "@/lib/commerce/types";

const libelles = { commande: "Commande {commande}", livraison: "Livraison", emballage: "Emballage cadeau", taille: "Taille {taille}" };
const options = { locale: "fr" as const, retour: "https://awrea.test/commande/confirmation?n=AW-1043&s={CHECKOUT_SESSION_ID}", abandon: "https://awrea.test/commande?paiement=annule", libelles, maintenant: new Date("2026-11-08T10:00:00Z") };

const commande = (x: Partial<Order> = {}): Order => ({
  id: "o-test1",
  number: "AW-1043",
  createdAt: "2026-11-08T10:00:00Z",
  email: "margaux@exemple.fr",
  name: "Margaux E.",
  status: "pending",
  lines: [
    { title: "Le top Kira", size: "S", quantity: 1, unitPrice: 9000, handle: "top-kira" },
    { title: "Le body Aura", size: "M", quantity: 2, unitPrice: 7000, handle: "body-aura" },
  ],
  total: 9000 + 14000 + 900,
  shipping: { method: "Colissimo", price: 900, country: "FR" },
  paymentMethod: "Stripe",
  ...x,
});

test("session : lignes détaillées quand elles tombent juste, montant exact, métadonnées et retours", () => {
  const p = parametresSession(commande(), options);
  assert.equal(p.mode, "payment");
  assert.equal(p.line_items?.length, 3);
  const somme = p.line_items!.reduce((s, l) => s + (l.price_data!.unit_amount ?? 0) * (l.quantity ?? 1), 0);
  assert.equal(somme, 23900);
  assert.deepEqual(p.metadata, { commande: "o-test1", numero: "AW-1043" });
  assert.deepEqual(p.payment_intent_data?.metadata, { commande: "o-test1", numero: "AW-1043" });
  assert.equal(p.client_reference_id, "o-test1");
  assert.equal(p.customer_email, "margaux@exemple.fr");
  assert.equal(p.payment_method_types, undefined, "les moyens viennent du compte Stripe");
  assert.equal(p.expires_at, Date.parse("2026-11-08T10:00:00Z") / 1000 + SESSION_MINUTES * 60);
  assert.ok(SESSION_MINUTES >= 30);
  assert.equal(p.line_items![1].price_data!.product_data!.description, "Taille M");
});

test("session : remise, carte cadeau ou export, une seule ligne au total exact", () => {
  for (const o of [
    commande({ discount: { code: "BIENVENUE", label: "Bienvenue", amount: 2300 }, total: 21600 }),
    commande({ giftCard: { code: "CADEAU", amount: 5000 }, total: 18900 }),
    commande({ taxes: { vatRate: 0, vat: 0, export: { exVat: 19000, duty: 1000, dutyRate: 0.12, importVat: 2000, importVatRate: 0.08 } }, total: 22900 }),
  ]) {
    assert.equal(lignesDetaillees(o, libelles), null);
    const p = parametresSession(o, options);
    assert.equal(p.line_items?.length, 1);
    assert.equal(p.line_items![0].price_data!.unit_amount, o.total);
    assert.equal(p.line_items![0].price_data!.product_data!.name, "Commande AW-1043");
  }
  // une somme qui ne tombe pas juste ne passe jamais : une seule ligne au total de la boutique
  const faussee = commande({ total: 23800 });
  assert.equal(lignesDetaillees(faussee, libelles), null);
  assert.equal(parametresSession(faussee, options).line_items![0].price_data!.unit_amount, 23800);
});

test("session : montant invalide ou retour sans identifiant de session, refusé", () => {
  assert.throws(() => parametresSession(commande({ total: 0 }), options));
  assert.throws(() => parametresSession(commande({ total: 12.5 }), options));
  assert.throws(() => parametresSession(commande(), { ...options, retour: "https://awrea.test/merci" }));
});

const evt = <T extends Stripe.Event["type"]>(type: T, object: unknown, created = 1762596000): Stripe.Event => ({ id: `evt_${type}`, object: "event", type, created, livemode: false, data: { object } } as unknown as Stripe.Event);

test("événements : réussi une fois (finaliser), jamais rétrogradé par une expiration", () => {
  const p0 = paiementEnAttente("stripe", 23900, true);
  const session = { id: "cs_test_1", object: "checkout.session", payment_status: "paid", payment_intent: "pi_1", amount_total: 23900, livemode: false, metadata: { commande: "o-test1" } };
  const a = suivreEvenement(p0, evt("checkout.session.completed", session));
  assert.equal(a.paiement.statut, "reussi");
  assert.equal(a.suite, "finaliser");
  assert.equal(a.paiement.intention, "pi_1");
  // le même événement rejoué ne finalise pas une seconde fois
  assert.equal(suivreEvenement(a.paiement, evt("checkout.session.completed", session)).suite, "aucune");
  const exp = suivreEvenement(a.paiement, evt("checkout.session.expired", { ...session, payment_status: "unpaid" }));
  assert.equal(exp.paiement.statut, "reussi");
  // paiement différé : en attente, puis réussi
  const lent = suivreEvenement(p0, evt("checkout.session.completed", { ...session, payment_status: "unpaid" }));
  assert.equal(lent.paiement.statut, "en-attente");
  assert.equal(lent.suite, "aucune");
  assert.equal(suivreEvenement(lent.paiement, evt("checkout.session.async_payment_succeeded", session)).suite, "finaliser");
  assert.equal(suivreEvenement(lent.paiement, evt("checkout.session.async_payment_failed", session)).paiement.statut, "echoue");
  assert.equal(suivreEvenement(p0, evt("checkout.session.expired", { ...session, payment_status: "unpaid" })).paiement.statut, "expire");
});

test("événements : moyen en clair sans donnée de carte, remboursements partiel et total, contestation", () => {
  const p0 = { ...paiementEnAttente("stripe", 23900), statut: "reussi" as const, intention: "pi_1" };
  const charge = { id: "ch_1", object: "charge", amount: 23900, amount_refunded: 0, payment_intent: "pi_1", payment_method_details: { type: "card", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030, wallet: null } } };
  const c = suivreEvenement(p0, evt("charge.succeeded", charge));
  assert.equal(c.paiement.moyen, "Carte Visa");
  assert.doesNotMatch(JSON.stringify(c.paiement), /4242|2030/);
  assert.equal(moyenDe({ type: "card", card: { brand: "mastercard", wallet: { type: "apple_pay" } } } as unknown as Stripe.Charge.PaymentMethodDetails), "Apple Pay");
  assert.equal(moyenDe({ type: "paypal" } as unknown as Stripe.Charge.PaymentMethodDetails), "PayPal");
  const partiel = suivreEvenement(c.paiement, evt("charge.refunded", { ...charge, amount_refunded: 9000 }));
  assert.equal(partiel.paiement.statut, "partiellement-rembourse");
  assert.equal(partiel.paiement.rembourse, 9000);
  assert.equal(partiel.suite, "aucune");
  const total = suivreEvenement(partiel.paiement, evt("charge.refunded", { ...charge, amount_refunded: 23900 }));
  assert.equal(total.paiement.statut, "rembourse");
  assert.equal(total.suite, "rembourse");
  const litige = suivreEvenement(c.paiement, evt("charge.dispute.created", { id: "dp_1", object: "dispute", amount: 23900, charge: "ch_1", payment_intent: "pi_1" }));
  assert.equal(litige.paiement.statut, "conteste");
  assert.equal(litige.suite, "alerter");
  assert.deepEqual(reperesDe(evt("charge.refunded", charge)), { intention: "pi_1" });
  assert.deepEqual(reperesDe(evt("checkout.session.completed", { object: "checkout.session", metadata: { commande: "o-test1" }, payment_intent: "pi_1" })), { commande: "o-test1", intention: "pi_1" });
  assert.equal(lienStripe({ intention: "pi_1", test: true }), "https://dashboard.stripe.com/test/payments/pi_1");
});

test("clés : test et réelle reconnues", () => {
  assert.ok(cleDeTest("sk_test_abc") && cleDeTest("rk_test_abc"));
  assert.ok(cleReelle("sk_live_abc") && !cleReelle("sk_test_abc"));
});

test("webhook : signature valide acceptée ; corps modifié, mauvais secret ou signature absente, refusés", () => {
  const client = nouveauClient("sk_test_signature");
  const secret = "whsec_test_awrea";
  const corps = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_1" } } });
  const signature = client.webhooks.generateTestHeaderString({ payload: corps, secret });
  assert.equal(verifierWebhook(client, corps, signature, secret).id, "evt_1");
  assert.throws(() => verifierWebhook(client, corps.replace("cs_test_1", "cs_test_2"), signature, secret));
  assert.throws(() => verifierWebhook(client, corps, signature, "whsec_autre"));
  assert.throws(() => verifierWebhook(client, corps, null, secret));
  // signature trop ancienne (rejeu)
  const ancienne = client.webhooks.generateTestHeaderString({ payload: corps, secret, timestamp: Math.floor(Date.now() / 1000) - 3600 });
  assert.throws(() => verifierWebhook(client, corps, ancienne, secret));
});

test("API : session et remboursement portent une clé d'idempotence, montant et métadonnées exacts", async () => {
  const recues: { url: string; cle: string | undefined; corps: string }[] = [];
  const lire = (req: IncomingMessage) => new Promise<string>((ok) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => ok(b));
  });
  const serveur = createServer(async (req, res) => {
    const corps = await lire(req);
    recues.push({ url: req.url ?? "", cle: req.headers["idempotency-key"] as string | undefined, corps });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/checkout/sessions") res.end(JSON.stringify({ id: "cs_test_1", object: "checkout.session", url: "https://checkout.stripe.com/c/pay/cs_test_1", expires_at: 1762599000, livemode: false }));
    else if (req.url === "/v1/refunds") res.end(JSON.stringify({ id: "re_1", object: "refund", status: "succeeded", amount: Number(new URLSearchParams(corps).get("amount")) }));
    else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  await new Promise<void>((ok) => serveur.listen(0, "127.0.0.1", ok));
  try {
    const client = nouveauClient("sk_test_faux", { host: "127.0.0.1", port: (serveur.address() as AddressInfo).port, protocol: "http" });
    const o = commande();
    const s = await creerSession(client, o, parametresSession(o, options));
    assert.equal(s.id, "cs_test_1");
    assert.equal(s.test, true);
    assert.equal(recues[0].cle, "awrea-session-o-test1");
    const form = new URLSearchParams(recues[0].corps);
    assert.equal(form.get("metadata[commande]"), "o-test1");
    assert.equal(form.get("line_items[0][price_data][unit_amount]"), "9000");
    assert.equal(form.get("payment_method_types[0]"), null);
    const r = await rembourser(client, { intention: "pi_1", montant: 9000, commande: "o-test1", numero: "AW-1043", motif: "Retour R-1", cle: { quoi: "retour", id: "R-1" } });
    assert.equal(r.montant, 9000);
    assert.equal(recues[1].cle, "awrea-retour-R-1");
    assert.equal(new URLSearchParams(recues[1].corps).get("payment_intent"), "pi_1");
    await assert.rejects(rembourser(client, { intention: "pi_1", montant: 0, commande: "o", numero: "n", motif: "m", cle: { quoi: "remboursement", id: "o" } }));
  } finally {
    serveur.close();
  }
});
