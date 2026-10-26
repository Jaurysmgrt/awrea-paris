/** « Trouver ma taille » (lib/fit.ts) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitKind, recommendSize as recommend, type Measures } from "@/lib/fit";
import { products } from "@/data/demo/products";
import catalogue from "@/content/site/fr/catalogue.json" with { type: "json" };
import type { Product } from "@/lib/commerce/types";

// phrases du conseil : celles du document « catalogue », modifiables dans l'éditeur
const recommendSize = (p: Product, m: Measures) => recommend(p, m, catalogue.mesures.conseils);

// pièces d'essai tirées du catalogue : la coupe se déduit des détails (laçage) ou de la matière
// principale (satin) ; une composition encore inconnue n'est jamais supposée
const base = products.find((p) => p.handle === "body-aura")!;
const lacee: Product = { ...base, details: ["Laçage dans le dos"], tags: [], materials: [] };
const satin: Product = { ...base, details: [], tags: [], materials: [{ name: "Satin", percent: 100 }] };

test("mesures exactes du guide : la taille correspondante", () => {
  assert.equal(recommendSize(lacee, { poitrine: 84, taille: 66, hanches: 92 })?.size, "S");
  assert.equal(recommendSize(satin, { poitrine: 88 })?.size, "M");
});

test("entre deux tailles : la plus petite pour une pièce lacée, la plus grande pour le satin", () => {
  assert.equal(fitKind(lacee), "lacee");
  assert.equal(fitKind(satin), "satin");
  assert.equal(recommendSize(lacee, { poitrine: 86 })?.size, "S");
  assert.equal(recommendSize(satin, { poitrine: 86 })?.size, "M");
  assert.deepEqual(recommendSize(satin, { poitrine: 86 })?.between, ["S", "M"]);
});

test("composition inconnue : coupe souple, la plus grande des deux tailles, sans matière supposée", () => {
  const inconnue = products.find((p) => p.materials.length === 0)!;
  assert.equal(fitKind(inconnue), "souple");
  const advice = recommendSize(inconnue, { poitrine: 86 });
  assert.equal(advice?.size, "M");
  assert.doesNotMatch(advice?.message ?? "", /satin|lacée/);
});

test("la mesure la plus large l'emporte ; au-delà du guide, l'atelier propose le sur-mesure", () => {
  assert.equal(recommendSize(satin, { poitrine: 80, hanches: 100 })?.size, "L");
  const big = recommendSize(satin, { poitrine: 120 });
  assert.equal(big?.offered, false);
  assert.match(big?.message ?? "", /mesures/);
  assert.equal(recommendSize(satin, {}), null);
});
