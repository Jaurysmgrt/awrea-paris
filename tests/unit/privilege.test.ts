/**
 * Privilège de bienvenue (cahier du site du 10/11, § 8 et 9) : −10 % sur une unité de la pièce la plus
 * chère, arrondis au centime ; ouvert 14 jours par la confirmation ; une seule fois par adresse,
 * commandes sans compte comprises ; réservation, consommation et libération idempotentes ; fenêtre
 * rare et absente des pages d'achat.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { commandeEncorePayable, consommer, decisionReservation, dejaCommande, eligibilite, liberer, ouvrir, partCarteCadeau, remisePrivilege, reserver } from "@/lib/privilege/regles";
import { pageExclue, peutAfficher } from "@/components/marketing/memoire-privilege";
import { parametresSession } from "@/lib/paiement/session";
import type { Order } from "@/lib/commerce/types";

const T0 = new Date("2026-11-01T10:00:00Z");
const jours = (n: number) => new Date(T0.getTime() + n * 86_400_000);
const ligne = (handle: string, unitPrice: number, quantity = 1) => ({ handle, title: handle, size: "M", unitPrice, quantity });

test("calcul : une seule unité de la pièce la plus chère, 10 %, arrondi au centime", () => {
  const r = remisePrivilege([ligne("aura", 7000, 3), ligne("odessa", 26000), ligne("evina", 12000, 2)])!;
  assert.equal(r.handle, "odessa");
  assert.equal(r.montant, 2600, "une seule unité, jamais toute la ligne ni tout le panier");
  // deux unités de la pièce la plus chère : toujours une seule remise
  assert.equal(remisePrivilege([ligne("odessa", 26000, 2)])!.montant, 2600);
  // arrondi au centime le plus proche
  assert.equal(remisePrivilege([ligne("x", 12345)])!.montant, 1235);
  assert.equal(remisePrivilege([ligne("x", 12344)])!.montant, 1234);
  // à prix égal, la première pièce du panier
  assert.equal(remisePrivilege([ligne("a", 9000), ligne("b", 9000)])!.handle, "a");
  assert.equal(remisePrivilege([]), null);
  assert.equal(remisePrivilege([ligne("offerte", 0)]), null);
});

test("éligibilité : ouvert, 14 jours, jamais utilisé, première commande, sans autre code", () => {
  const p = ouvrir(T0);
  assert.equal(p.expireLe, jours(14).toISOString());
  const ok = (q: typeof p | null, o: Partial<{ maintenant: Date; dejaCliente: boolean; code: boolean }> = {}) => eligibilite(q, { maintenant: jours(1), dejaCliente: false, code: false, ...o });
  assert.deepEqual(ok(p), { ok: true });
  assert.deepEqual(ok(null), { ok: false, raison: "aucun" }, "sans inscription confirmée, rien");
  assert.deepEqual(ok(p, { maintenant: jours(14.01) }), { ok: false, raison: "expire" });
  assert.deepEqual(ok(p, { maintenant: jours(13.99) }), { ok: true });
  assert.deepEqual(ok(p, { dejaCliente: true }), { ok: false, raison: "deja-cliente" });
  assert.deepEqual(ok(p, { code: true }), { ok: false, raison: "code" }, "jamais de cumul avec un code");
  assert.deepEqual(ok(consommer(p, "o-1", jours(2)).etat), { ok: false, raison: "utilise" }, "une seule fois par adresse");
});

test("réservation : une commande à la fois, la même commande garde son privilège", () => {
  const p = ouvrir(T0);
  assert.deepEqual(decisionReservation(p, "o-1", jours(1)), { action: "reserver" });
  const r = reserver(p, "o-1", jours(1));
  assert.deepEqual(decisionReservation(r, "o-1", jours(1)), { action: "deja" });
  // une seconde commande au même moment : il faut d'abord que la première ne puisse plus payer
  assert.deepEqual(decisionReservation(r, "o-2", jours(1)), { action: "autre", commande: "o-1" });
  assert.deepEqual(decisionReservation(p, "o-1", jours(15)), { action: "refuser", raison: "expire" });
  const u = consommer(r, "o-1", jours(1)).etat;
  assert.deepEqual(decisionReservation(u, "o-2", jours(1)), { action: "refuser", raison: "utilise" });
  assert.deepEqual(decisionReservation(u, "o-1", jours(1)), { action: "deja" });
});

test("consommation et libération idempotentes : rejouer le webhook ne change rien", () => {
  const r = reserver(ouvrir(T0), "o-1", jours(1));
  const c1 = consommer(r, "o-1", jours(1));
  assert.equal(c1.change, true);
  assert.deepEqual(c1.etat.utilise, { commande: "o-1", le: jours(1).toISOString() });
  assert.equal(c1.etat.reservation, undefined);
  const c2 = consommer(c1.etat, "o-1", jours(2));
  assert.equal(c2.change, false);
  assert.equal(c2.conflit, false);
  assert.equal(c2.etat, c1.etat);
  // une autre commande qui aurait été payée avec : signalée, jamais effacée
  assert.equal(consommer(c1.etat, "o-2", jours(2)).conflit, true);
  // libérer : seulement la réservation de cette commande
  assert.equal(liberer(r, "o-2"), r);
  assert.equal(liberer(r, "o-1").reservation, undefined);
  assert.equal(liberer(liberer(r, "o-1"), "o-1").reservation, undefined);
});

test("la commande qui tient le privilège peut-elle encore payer ?", () => {
  const maintenant = jours(1);
  const pending = (payment: Record<string, unknown>) => ({ status: "pending", payment: { statut: "en-attente", evenements: [], ...payment } as { statut: string; expireLe?: string; evenements?: { type: string }[] } });
  assert.equal(commandeEncorePayable(null, maintenant), "libre");
  assert.equal(commandeEncorePayable(null, maintenant, new Date(maintenant.getTime() - 60_000).toISOString()), "en-cours", "deux paiements simultanés : la seconde attend");
  assert.equal(commandeEncorePayable({ status: "paid" }, maintenant), "payee");
  assert.equal(commandeEncorePayable(pending({ statut: "expire" }), maintenant), "libre");
  assert.equal(commandeEncorePayable(pending({ statut: "echoue" }), maintenant), "libre");
  assert.equal(commandeEncorePayable(pending({ expireLe: jours(2).toISOString() }), maintenant), "payable");
  assert.equal(commandeEncorePayable(pending({ expireLe: jours(0.5).toISOString() }), maintenant), "libre", "page expirée sans paiement");
  assert.equal(commandeEncorePayable(pending({ expireLe: jours(0.5).toISOString(), evenements: [{ type: "checkout.session.completed" }] }), maintenant), "payee", "paiement parti, en attente de la banque");
});

test("Stripe : le montant demandé est le total réduit, et la remise se lit sous la ligne", () => {
  const order = {
    id: "o-1",
    number: "AW-2001",
    createdAt: T0.toISOString(),
    email: "camille@exemple.fr",
    name: "Camille D.",
    status: "pending",
    lines: [{ title: "Robe Odessa", size: "M", quantity: 1, unitPrice: 26000, handle: "robe-odessa" }],
    total: 23400,
    shipping: { method: "Colissimo", price: 0, country: "FR" },
    discount: { code: "PRIVILEGE", label: "Privilège de bienvenue, 10 % sur Robe Odessa", amount: 2600 },
    privilege: { handle: "robe-odessa", title: "Robe Odessa", size: "M", amount: 2600 },
    paymentMethod: "Stripe",
  } as Order;
  const p = parametresSession(order, { locale: "fr", retour: "https://x/{CHECKOUT_SESSION_ID}", abandon: "https://x", libelles: { commande: "Commande {commande}", livraison: "Livraison", emballage: "Emballage", taille: "Taille {taille}" } });
  assert.equal(p.line_items!.length, 1);
  assert.equal(p.line_items![0].price_data!.unit_amount, 23400);
  // montant au format de la Maison (espaces insécables, séparateur de milliers)
  assert.match(p.line_items![0].price_data!.product_data!.description!, /Privilège de bienvenue, 10\s%\ssur Robe Odessa\xa0: −26,00\xa0€/);
  const cher = parametresSession({ ...order, total: 1_080_000, discount: { ...order.discount!, amount: 120_000 } } as Order, { locale: "fr", retour: "https://x/{CHECKOUT_SESSION_ID}", abandon: "https://x", libelles: { commande: "Commande {commande}", livraison: "Livraison", emballage: "Emballage", taille: "Taille {taille}" } });
  assert.match(cher.line_items![0].price_data!.product_data!.description!, /−1\xa0200,00\xa0€/);
  assert.doesNotMatch(p.line_items![0].price_data!.product_data!.description!,/Privilège de bienvenue, 10 % sur Robe Odessa : −26,00 €/);
});

test("réservation tenue par une commande payée ou en attente de la banque : la remise ne s'affiche plus (jamais de blocage)", () => {
  const p = reserver(ouvrir(T0), "o-sepa", jours(1));
  const ok = (reservation: Parameters<typeof eligibilite>[1]["reservation"]) => eligibilite(p, { maintenant: jours(1), dejaCliente: false, code: false, reservation });
  // prélèvement SEPA parti (session terminée, paiement en attente de la banque) : déjà engagé
  assert.deepEqual(ok("payee"), { ok: false, raison: "utilise" });
  // commande en train de s'enregistrer à l'instant : refus net, jamais de boucle
  assert.deepEqual(ok("en-cours"), { ok: false, raison: "occupe" });
  // ancienne page de paiement encore ouverte : la nouvelle commande la remplacera
  assert.deepEqual(ok("payable"), { ok: true });
  assert.deepEqual(ok("libre"), { ok: true });
  assert.deepEqual(ok(null), { ok: true });
  // le cas réel : commande A en SEPA (pending, session terminée), commande B de la même adresse
  const sepa = { status: "pending", payment: { statut: "en-attente", expireLe: jours(0.5).toISOString(), evenements: [{ type: "checkout.session.completed" }] } };
  assert.equal(commandeEncorePayable(sepa, jours(1), p.reservation!.le), "payee");
});

test("déjà cliente : toute commande payée, même remboursée ou au prélèvement en attente, alias compris", () => {
  const o = (email: string, status: string, payment?: { statut: string; evenements?: { type: string }[] }) => ({ id: `o-${email}-${status}`, email, status, ...(payment ? { payment } : {}) });
  const maintenant = jours(1);
  assert.equal(dejaCommande([o("jeanne@gmail.com", "delivered")], "j.e.anne+promo@googlemail.com", maintenant), true, "alias Gmail et « +… » reconnus");
  assert.equal(dejaCommande([o("jeanne+2@exemple.fr", "paid")], "Jeanne@Exemple.fr", maintenant), true);
  assert.equal(dejaCommande([o("jeanne@exemple.fr", "refunded")], "jeanne@exemple.fr", maintenant), true, "une commande remboursée a été passée");
  assert.equal(dejaCommande([o("jeanne@exemple.fr", "pending", { statut: "en-attente", evenements: [{ type: "checkout.session.completed" }] })], "jeanne@exemple.fr", maintenant), true, "prélèvement en attente de la banque");
  assert.equal(dejaCommande([o("jeanne@exemple.fr", "pending", { statut: "expire" })], "jeanne@exemple.fr", maintenant), false, "paiement abandonné");
  assert.equal(dejaCommande([o("jeanne@exemple.fr", "pending")], "jeanne@exemple.fr", maintenant), false);
  assert.equal(dejaCommande([o("j.eanne@exemple.fr", "paid")], "jeanne@exemple.fr", maintenant), false, "les points ne comptent que chez Gmail");
  const seule = o("jeanne@exemple.fr", "paid");
  assert.equal(dejaCommande([seule], "jeanne@exemple.fr", maintenant, seule.id), false, "la commande en cours ne compte pas");
});

test("carte cadeau d'essai : jamais plus que ce qui reste dû une fois la remise retirée", () => {
  // panier 204 € ; carte de 500 € ramenée par le panier à 204 € ; privilège −20,40 € : la carte paie 183,60 €
  assert.equal(partCarteCadeau(20400, 20400 - 2040), 18360);
  assert.equal(partCarteCadeau(5000, 18360), 5000);
  assert.equal(partCarteCadeau(5000, 0), 0);
  assert.equal(partCarteCadeau(5000, -10), 0);
});

test("fenêtre : jamais pour une inscrite, au plus une fois tous les 30 jours, jamais sur les pages d'achat", () => {
  const maintenant = jours(0).getTime();
  assert.equal(peutAfficher(null, maintenant), true);
  assert.equal(peutAfficher({ inscrite: true }, maintenant), false);
  assert.equal(peutAfficher({ vu: jours(-29).toISOString() }, maintenant), false);
  assert.equal(peutAfficher({ vu: jours(-30).toISOString() }, maintenant), true);
  for (const p of ["/commande", "/commande/confirmation", "/compte", "/compte/commandes", "/suivi/AW-1", "/lettres/confirmation", "/panier"]) assert.equal(pageExclue(p), true, p);
  for (const p of ["/", "/boutique", "/boutique/robe-odessa", "/collections/hypnotic-lace", "/compteur"]) assert.equal(pageExclue(p), false, p);
});
