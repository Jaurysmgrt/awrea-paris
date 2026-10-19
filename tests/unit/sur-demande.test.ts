/**
 * Modèle « création sur demande » : délais de fabrication, limite par ligne de panier, étapes des
 * commandes Shopify, réglages de l'Atelier, descriptions Shopify et catalogue de démonstration.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_LEAD_TIME, LEAD_TIME_BOUNDS, leadTimeText, longestLeadTime, madeToOrderLabel, MAX_PER_LINE, normalizeLeadTime, overLineLimit } from "@/lib/commerce/availability";
import { shopifyStatus } from "@/lib/commerce/order-status";
import { changedSettings } from "@/lib/commerce/piece-settings";
import { paragraphsOf } from "@/lib/shopify/html";
import { fill } from "@/lib/edition/fill";
import { products } from "@/data/demo/products";
import { collections } from "@/data/demo/collections";

const doc = (name: string) => JSON.parse(readFileSync(new URL(`../../content/site/fr/${name}.json`, import.meta.url), "utf8")) as Record<string, unknown>;
const fallback = { min: 2, max: 3 };

test("délai : bornes, ordre, valeurs absentes ou illisibles", () => {
  assert.deepEqual(normalizeLeadTime(2, 3, fallback), { min: 2, max: 3 });
  // 0 et les valeurs négatives remontent à une semaine, les délais trop longs sont plafonnés
  assert.deepEqual(normalizeLeadTime(0, 2, fallback), { min: LEAD_TIME_BOUNDS.min, max: 2 });
  assert.deepEqual(normalizeLeadTime(-3, 40, fallback), { min: LEAD_TIME_BOUNDS.min, max: LEAD_TIME_BOUNDS.max });
  // saisie inversée : le plus court d'abord
  assert.deepEqual(normalizeLeadTime(5, 2, fallback), { min: 2, max: 5 });
  // une seule borne : délai fixe
  assert.deepEqual(normalizeLeadTime(4, null, fallback), { min: 4, max: 4 });
  assert.deepEqual(normalizeLeadTime(undefined, 3, fallback), { min: 3, max: 3 });
  // rien de lisible : le délai de repli
  assert.deepEqual(normalizeLeadTime(Number.NaN, null, fallback), fallback);
  assert.deepEqual(normalizeLeadTime(null, undefined, fallback), fallback);
  // arrondi à la semaine
  assert.deepEqual(normalizeLeadTime(2.4, 3.6, fallback), { min: 2, max: 4 });
});

test("délais provisoires par catégorie : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines", () => {
  assert.deepEqual(DEFAULT_LEAD_TIME.body, { min: 2, max: 3 });
  assert.deepEqual(DEFAULT_LEAD_TIME.top, { min: 2, max: 3 });
  assert.deepEqual(DEFAULT_LEAD_TIME.robe, { min: 3, max: 4 });
});

test("délai lisible, avec les modèles du document « catalogue »", () => {
  const delai = (doc("catalogue") as { delai: { plage: string; fixe: string; une: string } }).delai;
  assert.equal(leadTimeText({ min: 2, max: 3 }), "2 à 3 semaines");
  assert.equal(leadTimeText({ min: 3, max: 3 }), "3 semaines");
  assert.equal(leadTimeText({ min: 1, max: 1 }), "1 semaine");
  assert.equal(leadTimeText({ min: 3, max: 4 }, delai), "3 à 4 semaines");
  assert.equal(leadTimeText({ min: 2, max: 2 }, { plage: "{min} to {max} weeks", fixe: "{n} weeks", une: "1 week" }), "2 weeks");
});

test("une commande part quand sa pièce la plus longue à faire est prête", () => {
  assert.equal(longestLeadTime([]), null);
  assert.deepEqual(longestLeadTime([{ min: 2, max: 3 }, { min: 3, max: 4 }, { min: 1, max: 5 }]), { min: 3, max: 5 });
});

test("mention courte sans accord : elle suit « Le body » comme « La robe »", () => {
  assert.equal(madeToOrderLabel({ leadTime: { min: 2, max: 3 } }), "création sur demande, 2 à 3 semaines de fabrication");
});

test("panier : dix pièces identiques au plus par ligne, ajouts groupés compris", () => {
  assert.equal(MAX_PER_LINE, 10);
  const none = () => 0;
  assert.deepEqual(overLineLimit(none, [{ variantId: "a", quantity: 10 }]), []);
  assert.deepEqual(overLineLimit(none, [{ variantId: "a", quantity: 11 }]), ["a"]);
  assert.deepEqual(overLineLimit((id) => (id === "a" ? 9 : 0), [{ variantId: "a", quantity: 1 }, { variantId: "b", quantity: 1 }]), []);
  assert.deepEqual(overLineLimit((id) => (id === "a" ? 9 : 0), [{ variantId: "a", quantity: 1 }, { variantId: "a", quantity: 1 }]), ["a"]);
});

test("étapes d'une commande Shopify : reçue, en confection, prête, expédiée, livrée", () => {
  const o = (x: Partial<Parameters<typeof shopifyStatus>[0]>) => shopifyStatus({ cancelled: false, financial: "paid", fulfillment: null, tracked: false, tags: [], ...x });
  assert.equal(o({}), "paid");
  assert.equal(o({ financial: "PAID" }), "paid");
  assert.equal(o({ financial: "pending" }), "pending");
  assert.equal(o({ tags: ["en-confection"] }), "in_production");
  // étiquettes comparées sans majuscules ni accents, en liste ou en texte (webhook REST)
  assert.equal(o({ tags: ["Prête"] }), "ready");
  assert.equal(o({ tags: "vip, prete, en-confection" }), "ready");
  assert.equal(o({ tags: " En-Confection " }), "in_production");
  assert.equal(o({ fulfillment: "fulfilled", tracked: true, tags: ["prete"] }), "shipped");
  assert.equal(o({ fulfillment: "FULFILLED", tracked: false }), "delivered");
  assert.equal(o({ financial: "refunded" }), "refunded");
  assert.equal(o({ cancelled: true, tags: ["prete"] }), "refunded");
  // une étiquette sans paiement ne fait pas avancer la commande
  assert.equal(o({ financial: "pending", tags: ["en-confection"] }), "pending");
});

test("Atelier : seuls les réglages modifiés sont écrits", () => {
  const p = { price: 7000, priceProvisional: true, leadTime: { min: 2, max: 3 }, leadTimeProvisional: true, isNew: true };
  // décocher « provisoire » ne renvoie jamais le prix (qui écraserait les prix des tailles Shopify)
  assert.deepEqual(changedSettings(p, { price: 7000, priceProvisional: false }), { priceProvisional: false });
  assert.deepEqual(changedSettings(p, { price: 7000, priceProvisional: true, leadTime: { min: 2, max: 3 }, leadTimeProvisional: true, isNew: true }), {});
  assert.deepEqual(changedSettings(p, { price: 7500 }), { price: 7500 });
  assert.deepEqual(changedSettings(p, { leadTime: { min: 3, max: 5 } }), { leadTime: { min: 3, max: 5 } });
  assert.deepEqual(changedSettings({ ...p, isNew: undefined }, { isNew: false }), {});
});

test("descriptions Shopify : paragraphes lus dans le HTML, espaces insécables gardées", () => {
  const html = "<p>La délicatesse, le pouvoir de l’or.</p>\n<p>La délicatesse rencontre la force&nbsp;: une <strong>signature</strong>.</p><p> </p>";
  assert.deepEqual(paragraphsOf(html, "texte sur une ligne"), ["La délicatesse, le pouvoir de l’or.", "La délicatesse rencontre la force : une signature."]);
  assert.deepEqual(paragraphsOf("Un<br><br>Deux &amp; trois", ""), ["Un", "Deux & trois"]);
  assert.deepEqual(paragraphsOf("", "Premier.\n\nSecond."), ["Premier.", "Second."]);
  assert.deepEqual(paragraphsOf(null, ""), []);
});

test("catalogue de démonstration : les sept pièces d'Hypnotic Lace, créées sur demande", () => {
  const expected: Record<string, { title: string; price: number; category: string; provisionalPrice: boolean }> = {
    "body-aura": { title: "Le body Aura", price: 7000, category: "body", provisionalPrice: false },
    "robe-odessa": { title: "La robe Odessa", price: 10000, category: "robe", provisionalPrice: false },
    "robe-aria": { title: "La robe Aria", price: 20400, category: "robe", provisionalPrice: false },
    "robe-sienna": { title: "La robe Sienna", price: 18000, category: "robe", provisionalPrice: true },
    "body-gaia": { title: "Le body Gaïa", price: 7500, category: "body", provisionalPrice: true },
    "top-evina": { title: "Le top Evina", price: 6500, category: "top", provisionalPrice: true },
    "top-kira": { title: "Le top Kira", price: 7000, category: "top", provisionalPrice: true },
  };
  assert.deepEqual(products.map((p) => p.handle).sort(), Object.keys(expected).sort());
  for (const p of products) {
    const e = expected[p.handle];
    assert.equal(p.title, e.title);
    assert.equal(p.price, e.price, p.handle);
    assert.equal(p.category, e.category, p.handle);
    assert.equal(Boolean(p.priceProvisional), e.provisionalPrice, p.handle);
    assert.equal(p.collection, "hypnotic-lace");
    assert.deepEqual(p.leadTime, DEFAULT_LEAD_TIME[p.category], p.handle);
    assert.equal(p.leadTimeProvisional, true, p.handle);
    assert.equal(p.isNew, true, p.handle);
    assert.ok(p.variants.length > 0, p.handle);
    // photos générées en attendant les shootings : toutes signalées
    for (const i of [...p.images, ...(p.detailImage ? [p.detailImage] : [])]) assert.equal(i.provisoire, true, i.src);
    // composition jamais inventée
    assert.deepEqual(p.materials, [], p.handle);
  }
  assert.deepEqual(collections.map((c) => c.handle), ["hypnotic-lace"]);
  assert.equal(collections[0].officiel, true);
  assert.deepEqual([...collections[0].products].sort(), Object.keys(expected).sort());
});

test("textes à trou {piece} : aucun accord ni préposition collés au titre (« Le body Aura »)", () => {
  const all: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") all.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(doc("catalogue"));
  walk(doc("commerce"));
  const withPiece = all.filter((s) => s.includes("{piece}"));
  assert.ok(withPiece.length > 0);
  for (const s of withPiece) {
    assert.doesNotMatch(s, /\b(de|du|à|au|avec|pour)\s+\{piece\}/i, s);
    assert.doesNotMatch(s, /\{piece\}\s+[a-zàâéèêëîïôûç]+(é|ée|és|ées)\b/i, s);
    // phrase complète avec un titre masculin et un titre féminin
    for (const title of ["Le body Aura", "La robe Odessa"]) assert.doesNotMatch(fill(s, { piece: title, taille: "S" }), /\{piece\}/);
  }
});
