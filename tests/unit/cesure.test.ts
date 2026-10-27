/** Césure des paragraphes justifiés (lib/typo/cesure.ts) : règles de la Maison et motifs français. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { hyphenateText, hyphenateWord, SHY, unhyphenate, type Hyphenate } from "@/lib/typo/cesure";

const require = createRequire(import.meta.url);
const fr = require("hyphen/fr").hyphenateSync as Hyphenate;
const en = require("hyphen/en-gb").hyphenateSync as Hyphenate;
const show = (s: string) => s.replaceAll(SHY, "·");

test("césure française : coupures justes, trois lettres au moins de chaque côté", () => {
  assert.equal(show(hyphenateWord("délicatesse", fr)), "déli·ca·tesse");
  assert.equal(show(hyphenateWord("confectionnées", fr)), "confec·tion·nées");
  assert.equal(show(hyphenateWord("extraordinairement", fr)), "extra·or·di·nai·re·ment");
  // mots courts, noms propres : jamais coupés
  assert.equal(hyphenateWord("dentelle", fr).includes(SHY), true);
  assert.equal(hyphenateWord("force", fr), "force");
  assert.equal(hyphenateWord("Soubrier", fr), "Soubrier");
});

test("césure d'un texte : ponctuation, e-mail, adresse et liens intacts, texte rendu à l'identique", () => {
  const texte = "La délicatesse rencontre la force. L’élégance devient une signature : écrivez à awrea.contact@gmail.com, 46 rue Paul Déroulède, ou sur https://awreaparis.com/la-maison.";
  const coupe = hyphenateText(texte, fr);
  assert.equal(unhyphenate(coupe), texte);
  assert.match(coupe, /awrea\.contact@gmail\.com/);
  assert.match(coupe, /https:\/\/awreaparis\.com\/la-maison/);
  assert.match(show(coupe), /L’élé·gance/);
  assert.ok(!/Dé·roulède|Déroulè·de/.test(show(coupe)));
  // anglais britannique
  assert.equal(unhyphenate(hyphenateText("An evening wardrobe of extraordinary pieces", en)), "An evening wardrobe of extraordinary pieces");
  assert.match(show(hyphenateText("extraordinary", en)), /·/);
});
