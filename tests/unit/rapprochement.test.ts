/**
 * Rapprochement des paiements Stripe avec les commandes (lib/paiement/rapprochement.ts), avec des
 * doublures en mémoire du stockage, des commandes et des envois : événements rejoués, finalisation
 * reprise après un échec, commande introuvable, paiement étranger à la boutique, rechargements de la
 * page de confirmation, remboursements jamais doublés ; et part payée d'un retour (remise, carte
 * cadeau, exportation).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import * as R from "@/lib/paiement/rapprochement";
import { suivreEvenement } from "@/lib/paiement/evenements";
import { paiementEnAttente, type EvenementPaiement } from "@/lib/paiement/types";
import { partsDuRetour, partsPayees } from "@/lib/commerce/remboursement";
import type { Order } from "@/lib/commerce/types";

const commande = (x: Partial<Order> = {}): Order => ({
  id: "o-1",
  number: "AW-1043",
  createdAt: "2026-11-08T10:00:00Z",
  email: "margaux@exemple.fr",
  name: "Margaux E.",
  status: "pending",
  lines: [
    { title: "Le top Kira", size: "S", quantity: 1, unitPrice: 9000, handle: "top-kira" },
    { title: "Le body Aura", size: "M", quantity: 2, unitPrice: 7000, handle: "body-aura" },
  ],
  total: 23900,
  shipping: { method: "Colissimo", price: 900, country: "FR" },
  paymentMethod: "Stripe",
  payment: { ...paiementEnAttente("stripe", 23900, true), session: "cs_test_1" },
  ...x,
});

const evt = (type: string, object: unknown, id = `evt_${type}`): Stripe.Event => ({ id, object: "event", type, created: 1762596000, livemode: false, data: { object } }) as unknown as Stripe.Event;
const paye = { id: "cs_test_1", object: "checkout.session", metadata: { commande: "o-1" }, payment_intent: "pi_1", payment_status: "paid", amount_total: 23900, livemode: false };

function doublures(commandes: Order[], o: { echecsFinalisation?: number } = {}) {
  const valeurs = new Map<string, unknown>();
  const compteurs = new Map<string, number>();
  const verrous = new Map<string, string>();
  const appels = { finaliser: [] as boolean[], alertes: [] as string[], remboursees: [] as number[], journal: [] as EvenementPaiement[] };
  let echecs = o.echecsFinalisation ?? 0;
  const b: R.Branchements = {
    async prendre(cle, jeton) {
      if (verrous.has(cle)) return false;
      verrous.set(cle, jeton);
      return true;
    },
    async rendre(cle, jeton) {
      if (verrous.get(cle) === jeton) verrous.delete(cle);
    },
    async incr(cle) {
      const n = (compteurs.get(cle) ?? 0) + 1;
      compteurs.set(cle, n);
      return n;
    },
    async peek(cle) {
      return compteurs.get(cle) ?? 0;
    },
    async get<T>(cle: string) {
      return (valeurs.get(cle) as T) ?? null;
    },
    async set(cle, v) {
      valeurs.set(cle, v);
    },
    async majCommande(id, change) {
      const i = commandes.findIndex((x) => x.id === id);
      if (i < 0) return null;
      commandes[i] = change(commandes[i]);
      return commandes[i];
    },
    async finaliser(_o, premiere) {
      appels.finaliser.push(premiere);
      if (echecs > 0) {
        echecs--;
        throw new Error("e-mail en panne");
      }
    },
    async rembourseeChezStripe(_o, montant) {
      appels.remboursees.push(montant);
    },
    async alerter(_o, resume) {
      appels.alertes.push(resume);
    },
    async journaliser(_o, e) {
      appels.journal.push(e);
    },
    jeton: () => Math.random().toString(36).slice(2),
  };
  return { b, appels, compteurs, verrous };
}

test("webhook : paiement réussi finalisé une fois, l'événement rejoué n'y revient pas", async () => {
  const commandes = [commande()];
  const { b, appels, verrous } = doublures(commandes);
  assert.equal(await R.traiterEvenement(b, evt("checkout.session.completed", paye)), "traite");
  assert.equal(commandes[0].payment?.statut, "reussi");
  assert.deepEqual(appels.finaliser, [true]);
  assert.equal(await R.traiterEvenement(b, evt("checkout.session.completed", paye)), "deja");
  assert.deepEqual(appels.finaliser, [true]);
  assert.equal(verrous.size, 0, "aucun verrou ne reste posé");
  // événement que la boutique n'écoute pas
  assert.equal(await R.traiterEvenement(b, evt("customer.created", {})), "ignore");
});

test("finalisation en échec : l'événement n'est pas noté traité, Stripe le renvoie, elle est reprise", async () => {
  const commandes = [commande()];
  const { b, appels, compteurs, verrous } = doublures(commandes, { echecsFinalisation: 1 });
  await assert.rejects(R.traiterEvenement(b, evt("checkout.session.completed", paye)), /e-mail en panne/);
  assert.equal(compteurs.get("stripe:evenement:evt_checkout.session.completed") ?? 0, 0);
  assert.equal(verrous.size, 0);
  // renvoi par Stripe : le paiement est déjà « réussi », la finalisation est quand même reprise
  assert.equal(await R.traiterEvenement(b, evt("checkout.session.completed", paye)), "traite");
  assert.deepEqual(appels.finaliser, [true, false]);
  // un autre événement sur une commande payée relance aussi une finalisation inachevée
  await R.traiterEvenement(b, evt("charge.succeeded", { id: "ch_1", object: "charge", amount: 23900, payment_intent: "pi_1", metadata: {}, payment_method_details: { type: "card", card: { brand: "visa" } } }));
  assert.equal(appels.finaliser.length, 3);
  assert.equal(commandes[0].payment?.moyen, "Carte Visa", "retrouvée par sa PaymentIntent");
});

test("événement en cours sur un autre serveur : refusé pour être renvoyé, sans rien appliquer", async () => {
  const commandes = [commande()];
  const { b, appels } = doublures(commandes);
  await b.prendre("stripe:evenement:evt_x:en-cours", "autre", 120_000);
  await assert.rejects(R.traiterEvenement(b, evt("checkout.session.completed", paye, "evt_x")), R.EvenementEnCours);
  assert.equal(appels.finaliser.length, 0);
  assert.equal(commandes[0].payment?.statut, "en-attente");
});

test("commande introuvable : la créatrice est prévenue une fois, Stripe renverra l'événement", async () => {
  const { b, appels } = doublures([]);
  await assert.rejects(R.traiterEvenement(b, evt("checkout.session.completed", { ...paye, metadata: { commande: "o-perdue" } })), R.CommandeIntrouvable);
  await assert.rejects(R.traiterEvenement(b, evt("checkout.session.completed", { ...paye, metadata: { commande: "o-perdue" } })), R.CommandeIntrouvable);
  assert.equal(appels.alertes.length, 1);
  assert.match(appels.alertes[0], /o-perdue/);
});

test("paiement étranger à la boutique : rien n'est touché, aucune erreur", async () => {
  const commandes = [commande()];
  const { b, appels } = doublures(commandes);
  assert.equal(await R.traiterEvenement(b, evt("charge.succeeded", { id: "ch_9", object: "charge", amount: 500, payment_intent: "pi_ailleurs", metadata: {} })), "traite");
  assert.equal(appels.journal.length, 0);
  assert.equal(commandes[0].payment?.evenements.length, 0);
});

test("paiement différé : la page de confirmation rechargée n'ajoute pas d'événement", async () => {
  const commandes = [commande()];
  const { b, appels } = doublures(commandes);
  const enCours = { ...paye, payment_status: "unpaid" };
  for (let i = 0; i < 5; i++) await R.appliquer(b, evt("checkout.session.completed", enCours, `retour_${i}`));
  assert.equal(commandes[0].payment?.evenements.length, 1);
  assert.equal(appels.journal.length, 1);
  assert.equal(appels.finaliser.length, 0);
});

test("remboursement total fait dans Stripe : la commande le dit ; contestation : la créatrice est alertée", async () => {
  const commandes = [commande()];
  const { b, appels } = doublures(commandes);
  await R.traiterEvenement(b, evt("checkout.session.completed", paye));
  await R.traiterEvenement(b, evt("charge.refunded", { id: "ch_1", object: "charge", amount: 23900, amount_refunded: 23900, payment_intent: "pi_1", metadata: { commande: "o-1" } }));
  assert.deepEqual(appels.remboursees, [23900]);
  assert.equal(commandes[0].payment?.statut, "rembourse");
  await R.traiterEvenement(b, evt("charge.dispute.created", { id: "dp_1", object: "dispute", amount: 23900, payment_intent: "pi_1" }));
  assert.equal(appels.alertes.length, 1);
});

test("remboursement : rejoué ou croisé avec le webhook, jamais compté deux fois", () => {
  const e = (id: string): EvenementPaiement => ({ at: "2026-11-09T10:00:00Z", type: "atelier.remboursement", resume: "Remboursement", reference: id, montant: 9000 });
  const p0 = { ...paiementEnAttente("stripe", 23900), statut: "reussi" as const, intention: "pi_1" };
  // le webhook arrive avant l'inscription du remboursement par l'Atelier
  const webhook = suivreEvenement(p0, evt("charge.refunded", { id: "ch_1", object: "charge", amount: 23900, amount_refunded: 9000 })).paiement;
  const apres = R.avecRemboursement(webhook, { cle: "retour:R-1", id: "re_1", montant: 9000, totalCharge: 9000 }, e("re_1"));
  assert.equal(apres.rembourse, 9000);
  assert.equal(apres.statut, "partiellement-rembourse");
  // le même remboursement rejoué (clé d'idempotence de Stripe) : rien ne change
  const rejoue = R.avecRemboursement(apres, { cle: "retour:R-1", id: "re_1", montant: 9000 }, e("re_1"));
  assert.equal(rejoue.rembourse, 9000);
  assert.equal(rejoue.evenements.length, apres.evenements.length);
  // le geste est retrouvé par sa clé : il ne repart jamais chez Stripe, même des jours après
  assert.equal(R.remboursementParti(rejoue, "retour:R-1")?.id, "re_1");
  assert.equal(R.remboursementParti(rejoue, "retour:R-2"), null);
  // sans le montant de la charge : somme des remboursements distincts, plafonnée au montant payé
  const second = R.avecRemboursement(rejoue, { cle: "retour:R-2", id: "re_2", montant: 14900 }, e("re_2"));
  assert.equal(second.rembourse, 23900);
  assert.equal(second.statut, "rembourse");
  assert.equal(R.avecRemboursement(second, { cle: "remboursement:o-1", id: "re_3", montant: 900 }, e("re_3")).rembourse, 23900);
});

test("événements : contestation close sans perte, remboursement refusé par la banque", () => {
  const p0 = { ...paiementEnAttente("stripe", 23900), statut: "conteste" as const };
  for (const status of ["won", "warning_closed", "prevented"]) assert.equal(suivreEvenement(p0, evt("charge.dispute.closed", { id: "dp_1", status, amount: 23900 })).paiement.statut, "reussi", status);
  assert.equal(suivreEvenement(p0, evt("charge.dispute.closed", { id: "dp_1", status: "lost", amount: 23900 })).paiement.statut, "rembourse");
  const rembourse = { ...paiementEnAttente("stripe", 23900), statut: "partiellement-rembourse" as const, rembourse: 9000 };
  const refuse = suivreEvenement(rembourse, evt("refund.failed", { id: "re_1", object: "refund", amount: 9000 }));
  assert.equal(refuse.paiement.rembourse, 0);
  assert.equal(refuse.paiement.statut, "reussi");
  assert.equal(refuse.suite, "alerter");
});

test("retour : la part réellement payée (remise, carte cadeau, exportation), jamais le prix du catalogue", () => {
  // sans remise : le prix de la pièce
  assert.deepEqual(partsPayees(commande(), [9000, 7000]), [9000, 7000]);
  // remise de 10 % sur les pièces : 10 % de moins
  assert.deepEqual(partsPayees(commande({ discount: { code: "BIENVENUE", label: "Bienvenue", amount: 2300 }, total: 21600 }), [9000]), [8100]);
  // carte cadeau : répartie au prorata entre les pièces et la livraison
  const cadeau = commande({ giftCard: { code: "CADEAU", amount: 5000 }, total: 18900 });
  const parts = partsPayees(cadeau, [9000, 7000, 7000]);
  assert.ok(parts[0] < 9000 && parts[0] > 7000);
  assert.ok(parts.reduce((t, x) => t + x, 0) <= cadeau.total);
  // exportation : droits et TVA du pays compris dans ce que la cliente a payé
  const loin = commande({ taxes: { vatRate: 0, vat: 0, export: { exVat: 19917, duty: 2390, dutyRate: 0.12, importVat: 1784, importVatRate: 0.08 } }, total: 24091 });
  const export1 = partsPayees(loin, [9000])[0];
  assert.ok(export1 > 9000, "plus que le prix du catalogue");
  assert.ok(partsPayees(loin, [9000, 7000, 7000]).reduce((t, x) => t + x, 0) <= loin.total - 900);
});

test("retour d'une commande au privilège : la remise porte sur la seule unité de la facture, une seule fois", () => {
  // robe Aria 204 € −20,40 € (privilège) + body Aura 70 €, livraison offerte : 253,60 € payés
  const privilege = { handle: "robe-aria", title: "La robe Aria", size: "M" as const, amount: 2040 };
  const o = commande({
    lines: [
      { title: "La robe Aria", size: "M", quantity: 1, unitPrice: 20400, handle: "robe-aria" },
      { title: "Le body Aura", size: "XS", quantity: 1, unitPrice: 7000, handle: "body-aura" },
    ],
    discount: { code: "PRIVILEGE", label: "Privilège de bienvenue, 10 % sur La robe Aria", amount: 2040 },
    privilege,
    shipping: { method: "Colissimo", price: 0, country: "FR" },
    total: 25360,
  });
  const robe = { handle: "robe-aria", size: "M", unitPrice: 20400 };
  const body = { handle: "body-aura", size: "XS", unitPrice: 7000 };
  // le body rendu : 70 €, pas 64,79 € (la remise n'est pas sur lui)
  assert.deepEqual(partsPayees(o, [body]), [7000]);
  // la robe rendue : 183,60 €
  assert.deepEqual(partsPayees(o, [robe]), [18360]);
  // les deux : exactement ce qui a été payé
  assert.equal(partsPayees(o, [robe, body]).reduce((t, x) => t + x, 0), 25360);
  // la remise déjà retirée d'un retour précédent : la robe suivante à son prix
  assert.deepEqual(partsPayees(o, [robe], undefined, true), [20400]);
  // deux robes de même taille rendues ensemble : la remise sur une seule
  const deux = commande({ ...o, lines: [{ title: "La robe Aria", size: "M", quantity: 2, unitPrice: 20400, handle: "robe-aria" }], total: 38760 });
  assert.deepEqual(partsPayees(deux, [robe, robe]), [18360, 20400]);
  // même pièce dans une autre taille : pas la remise
  assert.deepEqual(partsPayees(o, [{ ...robe, size: "S" }]), [20400]);

  // retours successifs de la même commande : le second ne retire plus la remise
  const r1 = { id: "R-1", status: "rembourse", items: [{ ...robe, wish: "remboursement" }] };
  const r2 = { id: "R-2", status: "recu", items: [{ ...robe, wish: "remboursement" }, { ...body, wish: "echange" }] };
  assert.deepEqual(partsDuRetour(deux, r2, [r1, r2]), [20400]);
  assert.deepEqual(partsDuRetour(deux, r1, [r1]), [18360]);
  // un premier retour seulement échangé ne compte pas
  assert.deepEqual(partsDuRetour(deux, r2, [{ ...r1, status: "echange-expedie", items: [{ ...robe, wish: "echange" }] }, r2]), [18360]);

  // carte cadeau ou exportation : la même proportion que la commande, la remise sur la seule robe
  const carte = commande({ ...o, giftCard: { code: "CADEAU", amount: 5072 }, total: 20288 });
  const [pr, pb] = partsPayees(carte, [robe, body]);
  assert.equal(pr, Math.round(18360 * 0.8));
  assert.equal(pb, Math.round(7000 * 0.8));
});

test("privilège de bienvenue : libéré quand la page de paiement expire, jamais quand le paiement réussit", async () => {
  const privilege = { handle: "top-kira", title: "Le top Kira", size: "S" as const, amount: 900 };
  const expire = { id: "cs_test_1", object: "checkout.session", metadata: { commande: "o-1" }, livemode: false };
  const expiree = [commande({ privilege, discount: { code: "PRIVILEGE", label: "Privilège de bienvenue", amount: 900 }, total: 23000 })];
  const liberes: string[] = [];
  const d1 = doublures(expiree);
  d1.b.libererPrivilege = async (o) => {
    liberes.push(o.id);
  };
  await R.traiterEvenement(d1.b, evt("checkout.session.expired", expire));
  assert.equal(expiree[0].payment?.statut, "expire");
  assert.deepEqual(liberes, ["o-1"]);
  // rejoué : déjà traité, rien de plus
  await R.traiterEvenement(d1.b, evt("checkout.session.expired", expire));
  assert.deepEqual(liberes, ["o-1"]);

  const payee = [commande({ privilege, total: 23000 })];
  const d2 = doublures(payee);
  d2.b.libererPrivilege = async (o) => {
    liberes.push(`payee:${o.id}`);
  };
  await R.traiterEvenement(d2.b, evt("checkout.session.completed", { ...paye, amount_total: 23000 }));
  assert.equal(payee[0].payment?.statut, "reussi");
  // une page expirée après un paiement réussi ne libère rien
  await R.traiterEvenement(d2.b, evt("checkout.session.expired", expire, "evt_expire_apres"));
  assert.equal(payee[0].payment?.statut, "reussi");
  assert.deepEqual(liberes, ["o-1"], "un paiement réussi garde son privilège (consommé à la finalisation)");
});
