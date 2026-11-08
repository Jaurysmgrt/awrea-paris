/**
 * Produits de l'Atelier (refonte du 07/11) : statut des pièces, adresses et noms des copies,
 * description envoyée à Shopify sans aucune balise venue du texte.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseDeCopie, depuisShopify, descriptionHtml, nomDeCopie, paragraphes, VERS_SHOPIFY } from "@/lib/commerce/statut-pieces";

test("statuts : Shopify ↔ Atelier, aller et retour", () => {
  for (const s of ["en-ligne", "brouillon", "archivee"] as const) assert.equal(depuisShopify(VERS_SHOPIFY[s]), s);
  // un statut inconnu de Shopify ne met jamais une pièce en ligne
  assert.equal(depuisShopify("UNLISTED"), "brouillon");
});

test("copies : une adresse libre, un nom qui le dit", () => {
  assert.equal(adresseDeCopie("robe-odessa", ["robe-odessa"]), "robe-odessa-copie");
  assert.equal(adresseDeCopie("robe-odessa", ["robe-odessa", "robe-odessa-copie"]), "robe-odessa-copie-2");
  // la copie d'une copie ne s'allonge pas
  assert.equal(adresseDeCopie("robe-odessa-copie", ["robe-odessa", "robe-odessa-copie"]), "robe-odessa-copie-2");
  assert.equal(nomDeCopie("La robe Odessa"), "La robe Odessa (copie)");
  assert.equal(nomDeCopie("La robe Odessa (copie)"), "La robe Odessa (copie)");
});

test("description : paragraphes séparés par une ligne vide, texte échappé pour Shopify", () => {
  assert.deepEqual(paragraphes("Dentelle noire.\nDrapé au dos.\n\n  Créée sur demande.  \n\n\n"), ["Dentelle noire. Drapé au dos.", "Créée sur demande."]);
  assert.equal(descriptionHtml(["Robe <b>noire</b> & dorée", " ", "Fin"]), "<p>Robe &lt;b&gt;noire&lt;/b&gt; &amp; dorée</p><p>Fin</p>");
});
