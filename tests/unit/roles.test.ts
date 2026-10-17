/** Rôles de gestion quotidienne : cadence à l'heure de Paris, critique indépendant. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isDue } from "@/lib/agents/roles/cadence";
import { controle } from "@/lib/agents/roles/controle";
import type { Proposal } from "@/lib/agents/perform";
import type { AgentAction } from "@/lib/agents/log";

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
