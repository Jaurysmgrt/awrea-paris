/** « Trouver ma taille » (lib/fit.ts) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitKind, recommendSize } from "@/lib/fit";
import { products } from "@/data/demo/products";

const odessa = products.find((p) => p.handle === "robe-odessa")!; // lacée
const aura = products.find((p) => p.handle === "body-aura")!; // satin

test("mesures exactes du guide : la taille correspondante", () => {
  assert.equal(recommendSize(odessa, { poitrine: 84, taille: 66, hanches: 92 })?.size, "S");
  assert.equal(recommendSize(aura, { poitrine: 88 })?.size, "M");
});

test("entre deux tailles : la plus petite pour une pièce lacée, la plus grande pour le satin", () => {
  assert.equal(fitKind(odessa), "lacee");
  assert.equal(fitKind(aura), "satin");
  assert.equal(recommendSize(odessa, { poitrine: 86 })?.size, "S");
  assert.equal(recommendSize(aura, { poitrine: 86 })?.size, "M");
  assert.deepEqual(recommendSize(aura, { poitrine: 86 })?.between, ["S", "M"]);
});

test("la mesure la plus large l'emporte ; au-delà du guide, l'atelier propose le sur-mesure", () => {
  assert.equal(recommendSize(aura, { poitrine: 80, hanches: 100 })?.size, "L");
  const big = recommendSize(aura, { poitrine: 120 });
  assert.equal(big?.offered, false);
  assert.match(big?.message ?? "", /mesures/);
  assert.equal(recommendSize(aura, {}), null);
});
