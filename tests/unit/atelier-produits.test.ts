/**
 * Produits de l'Atelier (refonte du 07/11) : statut des pièces, adresses et noms des copies,
 * description découpée en paragraphes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseDeCopie, LIBELLE_STATUT, nomDeCopie, paragraphes, realignerParCle, STATUTS } from "@/lib/commerce/statut-pieces";

test("statuts : trois, chacun nommé", () => {
  assert.deepEqual([...STATUTS], ["en-ligne", "brouillon", "archivee"]);
  for (const s of STATUTS) assert.ok(LIBELLE_STATUT[s]);
});

test("copies : une adresse libre, un nom qui le dit", () => {
  assert.equal(adresseDeCopie("robe-odessa", ["robe-odessa"]), "robe-odessa-copie");
  assert.equal(adresseDeCopie("robe-odessa", ["robe-odessa", "robe-odessa-copie"]), "robe-odessa-copie-2");
  // la copie d'une copie ne s'allonge pas
  assert.equal(adresseDeCopie("robe-odessa-copie", ["robe-odessa", "robe-odessa-copie"]), "robe-odessa-copie-2");
  assert.equal(nomDeCopie("La robe Odessa"), "La robe Odessa (copie)");
  assert.equal(nomDeCopie("La robe Odessa (copie)"), "La robe Odessa (copie)");
});

test("description : paragraphes séparés par une ligne vide", () => {
  assert.deepEqual(paragraphes("Dentelle noire.\nDrapé au dos.\n\n  Créée sur demande.  \n\n\n"), ["Dentelle noire. Drapé au dos.", "Créée sur demande."]);
});

test("photos : chaque texte traduit suit sa photo quand l'ordre change", () => {
  const avant = ["a", "b", "c"];
  const textes = ["front", "back", "detail"];
  // la photo c devient la principale
  assert.deepEqual(realignerParCle(avant, ["c", "a", "b"], textes), ["detail", "front", "back"]);
  // la photo a est retirée
  assert.deepEqual(realignerParCle(avant, ["b", "c"], textes), ["back", "detail"]);
  // une photo nouvelle n'a pas de texte traduit : le site reprend le texte français
  assert.deepEqual(realignerParCle(avant, ["a", "b", "c", "d"], textes), ["front", "back", "detail", ""]);
  // des textes plus courts que les photos
  assert.deepEqual(realignerParCle(avant, ["c", "a"], ["front"]), ["", "front"]);
});
