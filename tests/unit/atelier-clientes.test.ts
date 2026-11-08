/**
 * Clientes de l'Atelier (lot 3) : catégories d'activité tirées des seules commandes réelles, et
 * recherche sans accents.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { categorieActivite, compterParCategorie, filtrerClientes } from "@/lib/admin/clientes";

const maintenant = new Date("2026-11-08T10:00:00Z");
const cliente = (prenom: string, ordersCount: number, lastOrderAt: string | null) => ({ email: `${prenom.toLowerCase()}@exemple.fr`, firstName: prenom, lastName: "Durand", ordersCount, lastOrderAt });

test("catégories : nouvelle, régulière, fidèle, inactive après un an, sans commande", () => {
  assert.equal(categorieActivite(cliente("A", 0, null), maintenant), "sans-commande");
  assert.equal(categorieActivite(cliente("A", 1, "2026-10-01T00:00:00Z"), maintenant), "nouvelle");
  assert.equal(categorieActivite(cliente("A", 2, "2026-10-01T00:00:00Z"), maintenant), "reguliere");
  assert.equal(categorieActivite(cliente("A", 3, "2026-10-01T00:00:00Z"), maintenant), "reguliere");
  assert.equal(categorieActivite(cliente("A", 4, "2026-10-01T00:00:00Z"), maintenant), "fidele");
  // une fidèle sans commande depuis plus d'un an devient inactive
  assert.equal(categorieActivite(cliente("A", 6, "2025-10-01T00:00:00Z"), maintenant), "inactive");
  assert.equal(categorieActivite(cliente("A", 1, "2025-11-09T00:00:00Z"), maintenant), "nouvelle");
});

test("recherche et filtres des clientes", () => {
  const liste = [cliente("Hélène", 1, "2026-10-01T00:00:00Z"), cliente("Inès", 5, "2026-09-01T00:00:00Z"), cliente("Léa", 2, "2024-01-01T00:00:00Z")];
  assert.deepEqual(filtrerClientes(liste, { q: "helene" }, maintenant).map((c) => c.firstName), ["Hélène"]);
  assert.deepEqual(filtrerClientes(liste, { q: "durand ines" }, maintenant).map((c) => c.firstName), ["Inès"]);
  assert.deepEqual(filtrerClientes(liste, { categorie: "inactive" }, maintenant).map((c) => c.firstName), ["Léa"]);
  assert.deepEqual(filtrerClientes(liste, { categorie: "toutes" }, maintenant).length, 3);
  const n = compterParCategorie(liste, maintenant);
  assert.equal(n.nouvelle, 1);
  assert.equal(n.fidele, 1);
  assert.equal(n.inactive, 1);
  assert.equal(n.reguliere, 0);
});
