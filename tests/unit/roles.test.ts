/**
 * Rôles de gestion quotidienne : cadence à l'heure de Paris, critique indépendant. Agents au modèle
 * « sur demande » : veille de la confection, message de retard préparé, bilan du catalogue,
 * politique d'autonomie sans aucune action de stock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isDue } from "@/lib/agents/roles/cadence";
import { controle } from "@/lib/agents/roles/controle";
import type { Proposal } from "@/lib/agents/perform";
import type { AgentAction } from "@/lib/agents/log";
import { currentAgentId } from "@/lib/agents/ids";
import { POLICY, isActionType, requiresApproval } from "@/lib/agents/policy";
import { catalogueReview, confectionAlerts, delayLooms, delayMessage } from "@/lib/agents/confection";
import { products } from "@/data/demo/products";
import { checkText, errorsOf } from "@/lib/writing/rules";
import type { Order } from "@/lib/commerce/types";

test("cadence : jour de Paris, pas celui du serveur", () => {
  // dimanche 23 h 30 à Paris = dimanche 21 h 30 UTC (heure d'été) ; lundi 0 h 30 à Paris = dimanche 22 h 30 UTC
  assert.ok(isDue({ kind: "hebdomadaire", jour: 1 }, new Date("2026-10-11T22:30:00Z")));
  assert.ok(!isDue({ kind: "hebdomadaire", jour: 1 }, new Date("2026-10-11T21:30:00Z")));
  assert.ok(isDue({ kind: "mensuel", jour: 1 }, new Date("2026-10-31T23:30:00Z")));
  assert.ok(isDue({ kind: "quotidien" }, new Date()));
});

test("Contrôle : proposition sans raison, doublon, action sensible sans accord, alerte urgente sans lien", () => {
  const since = "2026-10-15T05:00:00.000Z";
  const p = (id: string, rationale: string, status: Proposal["status"] = "pending"): Proposal => ({ id, date: "2026-10-15T05:01:00.000Z", agent: "retours", action: "refund_order", params: { orderNumber: "AW-1001" } as never, summary: "Rembourser AW-1001", rationale, status });
  const log: AgentAction[] = [{ id: "a1", date: "2026-10-15T05:02:00.000Z", agent: "retours", kind: "refund_order", summary: "Remboursement AW-1002", status: "done" }];
  const out = controle({ resume: "", findings: [{ gravite: "urgent", titre: "Colis perdu" }] }, { since, role: "retours", proposals: [p("p1", "court"), p("p2", "La pièce est revenue intacte, remboursement dû sous 14 jours.")], log });
  const titres = out.map((o) => o.titre);
  assert.ok(titres.includes("Proposition sans raison claire"));
  assert.ok(titres.includes("Proposition en double"));
  assert.ok(titres.includes("Action sensible faite sans votre accord"));
  assert.ok(titres.includes("Alerte urgente sans endroit où agir"));
});

test("Anti-fraude : première commande élevée, rafale, hors de l’Union ; une cliente fidèle passe", async () => {
  const { suspicion } = await import("@/lib/agents/roles/regles");
  const o = (n: string, email: string, total: number, at: string, country = "FR") => ({ id: n, number: n, createdAt: at, email, name: "Essai", status: "paid", lines: [], total, shipping: { method: "x", price: 0, country }, paymentMethod: "Carte" }) as never;
  const big = o("AW-1", "a@exemple.fr", 200_000, "2026-10-15T08:00:00Z");
  assert.match(suspicion(big, [big]).join(), /première commande/);
  const fidele = [o("AW-2", "b@exemple.fr", 30_000, "2026-01-10T08:00:00Z"), o("AW-3", "b@exemple.fr", 200_000, "2026-10-15T08:00:00Z")];
  assert.deepEqual(suspicion(fidele[1], fidele), []);
  const rafale = [1, 2, 3].map((i) => o(`AW-1${i}`, "c@exemple.fr", 20_000, `2026-10-15T0${i}:00:00Z`));
  assert.match(suspicion(rafale[2], rafale).join(), /3 commandes/);
  const loin = o("AW-9", "d@exemple.fr", 120_000, "2026-10-15T08:00:00Z", "US");
  assert.match(suspicion(loin, [loin]).join(), /hors de l’Union/);
});

// ------------------------------------------------------------------ modèle « sur demande »

const NOW = new Date("2026-10-20T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const order = (number: string, status: Order["status"], received: number, extra: Partial<Order> = {}): Order =>
  ({
    id: `o-${number}`,
    number,
    createdAt: daysAgo(received),
    email: "cliente@exemple.fr",
    name: "Nora K.",
    status,
    stages: { paid: daysAgo(received), ...(status === "in_production" ? { in_production: daysAgo(received - 1) } : {}) },
    lines: [{ title: "Le top Evina", size: "S", quantity: 1, unitPrice: 6500, handle: "top-evina" }],
    total: 6500,
    shipping: { method: "Colissimo suivi", price: 0, country: "FR" },
    paymentMethod: "Carte bancaire",
    ...extra,
  }) as Order;

test("confection : retard, date proche, confection qui tarde ; ni stock ni commande expédiée", () => {
  const catalogue = [
    { handle: "top-evina", leadTime: { min: 2, max: 3 } },
    { handle: "robe-aria", leadTime: { min: 3, max: 4 } },
  ];
  const aria = [{ title: "La robe Aria", size: "M" as const, quantity: 1, unitPrice: 20400, handle: "robe-aria" }];
  const orders = [
    order("AW-1", "in_production", 26, { leadTime: { min: 2, max: 3 } }), // fin annoncée il y a 5 jours
    order("AW-2", "in_production", 22, { leadTime: { min: 3, max: 4 }, lines: aria }), // fin dans 6 jours, confection commencée
    order("AW-3", "paid", 15, { leadTime: { min: 2, max: 3 } }), // fin dans 6 jours, pas commencée
    order("AW-4", "paid", 6, { leadTime: { min: 3, max: 4 }, lines: aria }), // reçue il y a 6 jours, pas commencée
    order("AW-5", "paid", 2, { leadTime: { min: 2, max: 3 } }), // tout va bien
    order("AW-6", "shipped", 40, { leadTime: { min: 2, max: 3 } }), // déjà partie
    order("AW-7", "in_production", 26), // commande ancienne : délai repris du catalogue
  ];
  const alerts = confectionAlerts(orders, catalogue, NOW);
  const kind = Object.fromEntries(alerts.map((a) => [a.number, a.kind]));
  assert.deepEqual(kind, { "AW-1": "en-retard", "AW-7": "en-retard", "AW-2": "proche", "AW-3": "proche", "AW-4": "a-lancer" });
  assert.equal(alerts[0].daysLeft, -5);
  // un retard se dessine : date passée, ou date proche sans confection commencée
  const looms = alerts.filter(delayLooms).map((a) => a.number).sort();
  assert.deepEqual(looms, ["AW-1", "AW-3", "AW-7"]);
});

test("message de retard : préparé dans la voix de la Maison, sans stock ni urgence", () => {
  const m = delayMessage({ number: "AW-1036", name: "Nora K.", pieces: ["Le top Evina (S)"] });
  assert.equal(m.subject, "Votre commande AW-1036");
  assert.match(m.body, /^Bonjour Nora,/);
  assert.match(m.body, /artisans/);
  assert.doesNotMatch(m.body, /stock|rupture|série|liste d’attente|!/i);
  assert.deepEqual(errorsOf(checkText(m.body, { prose: true })), []);
});

test("bilan du catalogue : sept pièces, photos, prix et délais provisoires, rien d’inventé", () => {
  const r = catalogueReview(products);
  assert.equal(r.pieces.length, 7);
  assert.equal(r.photos, 7);
  assert.deepEqual(r.pieces.filter((p) => p.priceProvisional).map((p) => p.handle).sort(), ["body-gaia", "robe-sienna", "top-evina", "top-kira"]);
  assert.equal(r.leadTimes, 7);
  for (const p of r.pieces) {
    assert.ok(p.toComplete.includes("composition des matières"), p.handle);
    assert.ok(p.toComplete.includes("conseils d’entretien"), p.handle);
  }
});

test("politique : plus aucune action de stock ; message à une cliente et confirmation d’un prix validés par la créatrice", () => {
  for (const gone of ["update_stock", "notify_waitlist"]) assert.equal(isActionType(gone), false, gone);
  assert.equal(requiresApproval("send_client_message"), true);
  assert.equal(requiresApproval("confirm_piece_terms"), true);
  for (const t of ["refund_order", "change_price", "delete_product", "cancel_order", "send_newsletter_all"] as const) assert.equal(requiresApproval(t), true, t);
  assert.doesNotMatch(Object.values(POLICY).map((p) => p.label).join(" "), /stock|rupture|liste d’attente/i);
  // l'ancien agent « Commandes et stock » se retrouve sous son nouveau nom
  assert.equal(currentAgentId("commandes-stock"), "commandes-confection");
  assert.equal(currentAgentId("seo"), "seo");
});
