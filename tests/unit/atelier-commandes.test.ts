/**
 * Commandes de l'Atelier (lot 3) : recherche sans accents, étapes, périodes à l'heure de Paris,
 * historique trié et sans doublon.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { compterParEtape, correspond, dansPeriode, filtrerCommandes, historique, jourDeParis } from "@/lib/admin/commandes";

type S = "pending" | "paid" | "in_production" | "ready" | "shipped" | "delivered" | "returned" | "refunded" | "blocked";
const cmd = (number: string, status: S, createdAt: string, name = "Hélène Durand", titre = "La robe Odessa") => ({ number, status, createdAt, name, email: `${name.split(" ")[0].toLowerCase()}@exemple.fr`, lines: [{ title: titre }] });

const maintenant = new Date("2026-11-08T10:00:00Z");
const commandes = [
  cmd("AW-1001", "paid", "2026-11-08T08:00:00Z"),
  cmd("AW-1002", "in_production", "2026-11-03T08:00:00Z", "Camille Martin", "Le top Kira"),
  cmd("AW-1003", "delivered", "2026-10-01T08:00:00Z", "Inès Roy", "Le body Aura"),
  cmd("AW-1004", "refunded", "2025-06-01T08:00:00Z", "Léa Petit"),
  cmd("AW-1005", "blocked", "2026-11-07T22:30:00Z"),
];

test("recherche : numéro, nom sans accents, adresse, pièce, plusieurs mots", () => {
  assert.ok(correspond(commandes[0], "#aw-1001"));
  assert.ok(correspond(commandes[0], "helene"));
  assert.ok(correspond(commandes[1], "camille@"));
  assert.ok(correspond(commandes[1], "kira"));
  assert.ok(correspond(commandes[1], "camille kira"));
  assert.ok(!correspond(commandes[1], "camille odessa"));
  assert.ok(correspond(commandes[2], "   "));
});

test("périodes : aujourd'hui se compte à l'heure de Paris", () => {
  // 7 novembre 22 h 30 UTC : déjà le 8 novembre à Paris
  assert.equal(jourDeParis(new Date("2026-11-07T23:30:00Z")), "2026-11-08");
  assert.ok(dansPeriode("2026-11-07T23:30:00Z", "jour", maintenant));
  assert.ok(!dansPeriode("2026-11-07T22:30:00Z", "jour", maintenant));
  assert.ok(dansPeriode("2026-11-03T08:00:00Z", "7j", maintenant));
  assert.ok(!dansPeriode("2026-10-01T08:00:00Z", "30j", maintenant));
  assert.ok(dansPeriode("2026-10-01T08:00:00Z", "12m", maintenant));
  assert.ok(!dansPeriode("2025-06-01T08:00:00Z", "12m", maintenant));
  assert.ok(!dansPeriode("pas une date", "7j", maintenant));
});

test("filtres : étape, période et recherche se combinent ; les compteurs suivent", () => {
  assert.deepEqual(filtrerCommandes(commandes, { etape: "a-traiter" }, maintenant).map((o) => o.number), ["AW-1001"]);
  assert.deepEqual(filtrerCommandes(commandes, { etape: "en-attente" }, maintenant).map((o) => o.number), ["AW-1005"]);
  assert.deepEqual(filtrerCommandes(commandes, { etape: "retours", periode: "12m" }, maintenant), []);
  assert.deepEqual(filtrerCommandes(commandes, { q: "helene", periode: "7j" }, maintenant).map((o) => o.number), ["AW-1001", "AW-1005"]);
  const n = compterParEtape(filtrerCommandes(commandes, { periode: "30j" }, maintenant));
  assert.equal(n.toutes, 3);
  assert.equal(n["a-traiter"], 1);
  assert.equal(n["en-confection"], 1);
  assert.equal(n.livree, 0);
});

test("historique : du plus récent au plus ancien, sans doublon ni date illisible", () => {
  const h = historique([
    { at: "2026-11-01T10:00:00Z", quoi: "Commande reçue" },
    { at: "2026-11-03T09:00:10Z", quoi: "En confection" },
    { at: "2026-11-03T09:00:40Z", quoi: "En confection" },
    { at: "n'importe quoi", quoi: "?" },
    { at: "2026-11-05T12:00:00Z", quoi: "Note : appeler la cliente" },
  ]);
  assert.deepEqual(
    h.map((e) => e.quoi),
    ["Note : appeler la cliente", "En confection", "Commande reçue"],
  );
});
