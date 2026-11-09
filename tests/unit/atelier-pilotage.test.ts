/**
 * Vue d'ensemble de l'Atelier (brief du 07/11) : les chiffres viennent des seules commandes réelles,
 * comptés au mois de Paris, comparés à date égale ; les priorités suivent l'ordre où les faire et
 * n'inventent rien quand tout est à jour.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { activiteRecente, de, evolution, latestOrders, lienAction, monthRevenue, newCustomers, ordersToHandle, parisMonthKey, prenom, previousMonthKey, priorites, topSold, type EtatDuJour } from "@/lib/admin/dashboard";

type O = { number: string; status: "pending" | "paid" | "in_production" | "ready" | "shipped" | "delivered" | "refunded" | "blocked" | "returned"; total: number; createdAt: string; name: string; lines: { handle: string; title: string; quantity: number }[] };
const order = (number: string, createdAt: string, total: number, status: O["status"] = "paid", lines: O["lines"] = []): O => ({ number, status, total, createdAt, name: "Camille Martin", lines });

test("le mois est celui de Paris, quel que soit le fuseau du serveur", () => {
  // 31 octobre 23 h 30 UTC : déjà le 1er novembre à Paris
  assert.equal(parisMonthKey(new Date("2026-10-31T23:30:00Z")), "2026-11");
  assert.equal(parisMonthKey(new Date("2026-10-31T22:30:00Z")), "2026-10");
  assert.equal(previousMonthKey("2026-11"), "2026-10");
  assert.equal(previousMonthKey("2027-01"), "2026-12");
});

test("ventes du mois : payées seulement, comparées aux mêmes jours du mois précédent", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  const r = monthRevenue(
    [
      order("A1", "2026-11-02T10:00:00Z", 480),
      order("A2", "2026-11-05T10:00:00Z", 320, "in_production"),
      order("A3", "2026-11-06T10:00:00Z", 999, "pending"), // pas encore payée
      order("A4", "2026-11-06T11:00:00Z", 250, "refunded"), // remboursée
      order("A5", "2026-11-06T12:00:00Z", 600, "blocked"), // annulée sans remboursement ou paiement à vérifier
      order("A6", "2026-11-06T13:00:00Z", 100, "returned"), // retour en cours : vente jusqu'au remboursement
      order("B1", "2026-10-03T10:00:00Z", 400, "delivered"), // octobre, avant le 7 : comparable
      order("B2", "2026-10-20T10:00:00Z", 700, "delivered"), // octobre, après le 7 : hors comparaison
    ],
    now,
  );
  assert.deepEqual(r, { amount: 900, count: 3, previousAmount: 400, previousCount: 1 });
  assert.equal(evolution(r.amount, r.previousAmount), 125);
  // rien à comparer : aucune évolution affichée (jamais un pourcentage inventé)
  assert.equal(evolution(800, 0), null);
});

test("commandes à traiter, dernières commandes, nouvelles clientes", () => {
  const orders = [order("A1", "2026-11-01T10:00:00Z", 1, "paid"), order("A2", "2026-11-03T10:00:00Z", 1, "ready"), order("A3", "2026-11-02T10:00:00Z", 1, "in_production")];
  const { received, ready } = ordersToHandle(orders);
  assert.deepEqual([received.map((o) => o.number), ready.map((o) => o.number)], [["A1"], ["A2"]]);
  assert.deepEqual(latestOrders(orders, 2).map((o) => o.number), ["A2", "A3"]);
  const now = new Date("2026-11-07T10:00:00Z");
  assert.equal(newCustomers([{ createdAt: "2026-11-01T00:00:00Z" }, { createdAt: "2026-09-01T00:00:00Z" }], now).length, 1);
});

test("pièces les plus vendues : quantités des trois derniers mois, ventes réelles seulement", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  const kira = { handle: "top-kira", title: "Le top Kira", quantity: 1 };
  const odessa = { handle: "robe-odessa", title: "La robe Odessa", quantity: 2 };
  const top = topSold(
    [
      order("A1", "2026-11-01T10:00:00Z", 1, "paid", [kira, odessa]),
      order("A2", "2026-10-01T10:00:00Z", 1, "delivered", [kira]),
      order("A3", "2026-11-02T10:00:00Z", 1, "refunded", [kira, kira, kira]),
      order("A4", "2026-05-01T10:00:00Z", 1, "delivered", [{ ...kira, quantity: 9 }]), // trop ancienne
    ],
    now,
  );
  assert.deepEqual(top, [
    { handle: "robe-odessa", title: "La robe Odessa", quantity: 2 },
    { handle: "top-kira", title: "Le top Kira", quantity: 2 },
  ]);
});

const calme: EtatDuJour = { blocked: 0, late: 0, rdvToday: 0, messages: 0, received: 0, ready: 0, returns: 0, proposals: 0, reviews: 0, unsellable: [], provisional: [] };

test("priorités : rien d'inventé quand tout est à jour, et l'ordre où les faire", () => {
  assert.deepEqual(priorites(calme), []);
  const p = priorites({ ...calme, provisional: ["Le top Kira"], messages: 1, late: 2, received: 3, blocked: 1 });
  assert.deepEqual(
    p.map((x) => x.href),
    ["/commandes", "/commandes", "/messages", "/commandes", "/catalogue"],
  );
  // une commande en attente (la cliente attend l'appel de la Maison) passe avant tout
  assert.equal(p[0].titre, "Une commande en attente de votre appel");
  assert.match(p[1].titre, /^2 commandes en retard/);
  assert.equal(p[2].titre, "Une cliente attend une réponse");
  assert.match(p[3].titre, /^3 commandes attendent d’être mises en confection/);
  assert.match(p[4].titre, /«\sLe top Kira\s»/);
});

test("activité récente : messages et gestes des agents, le plus récent d'abord, sans les gestes techniques", () => {
  const a = activiteRecente({
    messages: [{ date: "2026-11-02T10:00:00Z", name: "Inès Durand" }],
    actions: [
      { date: "2026-11-04T10:00:00Z", summary: "Fiche publiée", status: "done", agent: "catalogue", target: { href: "/boutique/robe-odessa" } },
      { date: "2026-11-03T10:00:00Z", summary: "Réponse envoyée à camille.martin@exemple.fr", status: "done", agent: "service-client" },
      { date: "2026-11-05T10:00:00Z", summary: "Proposition", status: "proposed", agent: "contenu" },
      { date: "2026-11-06T10:00:00Z", summary: "Double authentification configurée", status: "done", agent: "systeme" },
    ],
  });
  assert.deepEqual(
    a.map((e) => [e.texte, e.href]),
    [
      ["Fiche publiée", "/boutique/robe-odessa"],
      // les adresses des clientes restent dans le journal
      ["Réponse envoyée à une cliente", undefined],
      ["Message d’Inès D.", "atelier:/messages"],
    ],
  );
});

test("noms abrégés : prénom et initiale", () => {
  assert.equal(prenom("Camille Martin"), "Camille M.");
  assert.equal(prenom("  Inès  "), "Inès");
  assert.equal(prenom(""), "Une cliente");
});

test("élision : d’avril, d’octobre, d’Inès, de novembre", () => {
  assert.equal(de("avril"), "d’avril");
  assert.equal(de("août"), "d’août");
  assert.equal(de("octobre"), "d’octobre");
  assert.equal(de("Inès D."), "d’Inès D.");
  assert.equal(de("novembre"), "de novembre");
  assert.equal(activiteRecente({ messages: [{ date: "2026-11-01T00:00:00Z", name: "" }], actions: [] })[0].texte, "Message d’une cliente");
});

test("liens des actions : Atelier sous son adresse, site tel quel", () => {
  const atelier = (p: string) => `/prive-x${p}`;
  assert.equal(lienAction("atelier:/messages", atelier), "/prive-x/messages");
  assert.equal(lienAction("atelier:", atelier), "/prive-x/");
  assert.equal(lienAction("/gestion/commandes", atelier), "/prive-x/commandes");
  assert.equal(lienAction("/gestionnaire", atelier), "/gestionnaire");
  assert.equal(lienAction("/boutique/robe-odessa", atelier), "/boutique/robe-odessa");
});
