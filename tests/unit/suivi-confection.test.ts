/**
 * Suivi de la confection : frise des cinq étapes, fin de confection prévue et retards, étape
 * suivante dans l'Atelier, e-mails de suivi modifiables sans code, commandes de démonstration.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { estimatedReady, nextStage, ORDER_STAGES, orderTimeline, stageIndex } from "@/lib/customers/order-timeline";
import { EmailDocSchema } from "@/lib/email/schema";
import { emailTexts, placeholdersOf, type EmailDoc } from "@/lib/email/blocks";
import { renderEmail } from "@/lib/email/render";
import { checkText } from "@/lib/writing/rules";
import { demoOrders } from "@/data/demo/orders";
import type { Order } from "@/lib/commerce/types";

const json = (rel: string) => JSON.parse(readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8")) as Record<string, unknown>;
const DAY = 86_400_000;
const base: Pick<Order, "status" | "createdAt" | "stages" | "deliveredAt" | "leadTime"> = {
  status: "paid",
  createdAt: "2026-10-01T10:00:00.000Z",
  stages: { paid: "2026-10-01T10:00:00.000Z" },
  leadTime: { min: 2, max: 3 },
};

test("les cinq étapes, dans l'ordre : reçue, en confection, prête, expédiée, livrée", () => {
  assert.deepEqual([...ORDER_STAGES], ["paid", "in_production", "ready", "shipped", "delivered"]);
  const t = orderTimeline(base, new Date("2026-10-02T00:00:00Z"));
  assert.equal(t.current, 0);
  assert.deepEqual(t.steps.map((s) => s.state), ["current", "todo", "todo", "todo", "todo"]);
  assert.equal(t.steps[0].at, base.stages!.paid);
  assert.equal(t.steps[1].at, null);
});

test("fin de confection prévue : du délai le plus court au plus long, à partir de la réception", () => {
  const e = estimatedReady(base, base.leadTime);
  assert.equal(e?.from, new Date(Date.parse(base.stages!.paid!) + 14 * DAY).toISOString());
  assert.equal(e?.to, new Date(Date.parse(base.stages!.paid!) + 21 * DAY).toISOString());
  // sans délai connu, aucune date n'est inventée
  assert.equal(estimatedReady(base, null), null);
});

test("en retard : seulement une fois le dernier jour annoncé passé, et seulement pendant la confection", () => {
  const making = { ...base, status: "in_production" as const, stages: { ...base.stages, in_production: "2026-10-02T09:00:00.000Z" } };
  assert.equal(orderTimeline(making, new Date("2026-10-22T12:00:00Z")).late, false);
  assert.equal(orderTimeline(making, new Date("2026-10-24T12:00:00Z")).late, true);
  // prête : plus d'estimation, plus de retard
  const ready = { ...making, status: "ready" as const, stages: { ...making.stages, ready: "2026-10-25T09:00:00.000Z" } };
  const t = orderTimeline(ready, new Date("2026-11-30T12:00:00Z"));
  assert.equal(t.estimate, null);
  assert.equal(t.late, false);
  assert.deepEqual(t.steps.map((s) => s.state), ["done", "done", "current", "todo", "todo"]);
});

test("situations : paiement en attente, vérification, retour, remboursement", () => {
  // paiement en attente : « Commande reçue », avec sa phrase ; la confection n'a pas commencé
  const pending = orderTimeline({ ...base, status: "pending", stages: {} });
  assert.equal(pending.current, 0);
  assert.equal(pending.situation, "pending");
  assert.equal(pending.estimate, null);
  assert.equal(pending.late, false);
  assert.deepEqual(pending.steps.map((s) => s.state), ["current", "todo", "todo", "todo", "todo"]);
  assert.equal(pending.steps[0].at, base.createdAt);
  assert.equal(orderTimeline({ ...base, status: "blocked" }).situation, "blocked");
  assert.equal(orderTimeline({ ...base, status: "blocked" }).estimate, null);
  assert.equal(stageIndex("returned"), 4);
  assert.equal(stageIndex("refunded", { paid: "x", in_production: "y" }), 1);
});

test("Atelier : une étape à la fois ; le paiement ne se confirme jamais à la main", () => {
  assert.equal(nextStage("paid"), "in_production");
  assert.equal(nextStage("in_production"), "ready");
  assert.equal(nextStage("ready"), "shipped");
  assert.equal(nextStage("shipped"), "delivered");
  for (const s of ["delivered", "pending", "blocked", "returned", "refunded"] as const) assert.equal(nextStage(s), null, s);
});

const MAILS = ["email-commande-recue", "email-commande-en-confection", "email-commande-prete", "email-commande-expediee"];

test("e-mails de suivi : déclarés dans le registre de l'équipe, valides, repères tous décrits", () => {
  const registre = json("content/site/registre/suivi-confection.json") as Record<string, { kind: string }>;
  for (const id of [...MAILS, "suivi-commande", "certificat"]) {
    assert.ok(registre[id], `${id} déclaré`);
    assert.ok(existsSync(new URL(`../../content/site/fr/${id}.json`, import.meta.url)), `${id}.json présent`);
  }
  for (const id of MAILS) {
    assert.equal(registre[id].kind, "email");
    const doc = json(`content/site/fr/${id}.json`) as unknown as EmailDoc;
    const parsed = EmailDocSchema.safeParse(doc);
    assert.ok(parsed.success, `${id} : ${parsed.success ? "" : parsed.error.message}`);
    const used = new Set(emailTexts(doc).flatMap((t) => placeholdersOf(t.text)));
    for (const b of doc.blocs) for (const cond of [b.si, b.sauf]) if (cond) used.add(cond);
    for (const v of used) assert.ok(doc.variables[v], `${id} : repère {${v}} décrit`);
    // l'écriture de la Maison : aucun tiret, aucune formule interdite, typographie française
    for (const t of emailTexts(doc)) {
      const errors = checkText(t.text, { lang: "fr", prose: true }).filter((i) => i.severity === "erreur");
      assert.deepEqual(errors.map((e) => `${e.rule} « ${e.excerpt} »`), [], `${id} ${t.path}`);
    }
  }
});

test("e-mail d'expédition : le numéro de suivi quand il est connu, une phrase d'attente sinon", () => {
  const doc = json("content/site/fr/email-commande-expediee.json") as unknown as EmailDoc;
  const commun = { devise: "Consommer plus juste", lignePied: "Awrea Paris", desinscription: "", mentions: "", voirPiece: "", total: "Total" };
  const vars = { prenom: "Camille", commande: "AW-1042", suivi: "https://www.exemple.fr/suivi/AW-1042", transporteur: "Colissimo", numeroSuivi: "6A123", lienColis: "https://suivi", relais: "" };
  const withTracking = renderEmail(doc, { site: "https://www.exemple.fr", commun, vars });
  assert.match(withTracking.text, /6A123/);
  assert.doesNotMatch(withTracking.text, /dès sa prise en charge/);
  assert.doesNotMatch(withTracking.subject, /\{/);
  const without = renderEmail(doc, { site: "https://www.exemple.fr", commun, vars: { ...vars, numeroSuivi: "", lienColis: "" } });
  assert.match(without.text, /dès sa prise en charge/);
});

test("commandes de démonstration : pièces d'Hypnotic Lace, étapes datées dans l'ordre, sans numéro d'édition", () => {
  const handles = new Set(["body-aura", "robe-odessa", "robe-aria", "robe-sienna", "body-gaia", "top-evina", "top-kira"]);
  for (const o of demoOrders) {
    for (const l of o.lines) {
      assert.ok(handles.has(l.handle), `${o.number} : ${l.handle}`);
      assert.equal(l.editionLabel, undefined, `${o.number} : aucun numéro d'édition`);
    }
    const dated = ORDER_STAGES.filter((s) => o.stages?.[s]).map((s) => Date.parse(o.stages![s]!));
    assert.deepEqual(dated, [...dated].sort((a, b) => a - b), `${o.number} : étapes dans l'ordre`);
    if (ORDER_STAGES.includes(o.status as (typeof ORDER_STAGES)[number])) assert.ok(o.stages?.[o.status as (typeof ORDER_STAGES)[number]], `${o.number} : étape en cours datée`);
  }
  // au moins une commande à chaque étape, et une en retard sur son délai
  for (const s of ORDER_STAGES) assert.ok(demoOrders.some((o) => o.status === s), `une commande « ${s} »`);
  const aw1036 = demoOrders.find((o) => o.number === "AW-1036")!;
  assert.equal(orderTimeline(aw1036, new Date("2026-10-16T12:00:00Z"), { min: 2, max: 3 }).late, true);
});
