/** Éditeur « Édition » : chemins, marques invisibles, traductions, garde-fous, blocs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { changedPaths, getAt, isSafePath, listOp, parsePath, setAt } from "@/lib/edition/paths";
import { hasStega, stegaClean, stegaEncodeDeep, stegaSources } from "@/lib/edition/stega";
import { localize, withFallback } from "@/lib/edition/merge";
import { guardValue, ruleFor } from "@/lib/edition/guard";
import { createBlock, duplicateBlock, todos } from "@/lib/edition/blocks";
import { fill } from "@/lib/edition/fill";

test("chemins : lecture, écriture sans muter, listes, sécurité", () => {
  const doc = { sections: [{ id: "a", titre: "Un" }, { id: "b", titre: "Deux" }] };
  assert.deepEqual(parsePath("sections.1.titre"), ["sections", 1, "titre"]);
  assert.deepEqual(parsePath("sections[1].titre"), ["sections", 1, "titre"]);
  assert.equal(getAt(doc, parsePath("sections.1.titre")), "Deux");
  const next = setAt(doc, parsePath("sections.0.titre"), "Premier");
  assert.equal(doc.sections[0].titre, "Un");
  assert.equal(getAt(next, ["sections", 0, "titre"]), "Premier");
  assert.deepEqual(listOp([1, 2, 3], { kind: "move", from: 0, to: 2 }), [2, 3, 1]);
  assert.deepEqual(listOp([1, 2], { kind: "duplicate", index: 0, copy: (x) => x }), [1, 1, 2]);
  assert.ok(!isSafePath(["__proto__", "x"]));
  assert.deepEqual(changedPaths(doc, next), ["sections.0.titre"]);
});

test("marques invisibles : texte identique à l’œil, source retrouvée, liens intacts", () => {
  const marked = stegaEncodeDeep({ titre: "La robe", cta: { label: "Voir la robe", href: "/boutique/robe-odessa" }, image: { src: "/media/x", alt: "Dentelle noire" } }, "accueil", "fr");
  assert.ok(hasStega(marked.titre));
  assert.equal(stegaClean(marked.titre), "La robe");
  assert.deepEqual(stegaSources(marked.cta.label), [{ doc: "accueil", locale: "fr", path: "cta.label" }]);
  assert.equal(marked.cta.href, "/boutique/robe-odessa");
  assert.equal(marked.image.src, "/media/x");
  assert.deepEqual(stegaSources(`Avant ${marked.image.alt} après`), [{ doc: "accueil", locale: "fr", path: "image.alt" }]);
});

test("traductions : repli sur le français, blocs retrouvés par leur id", () => {
  const fr = { titre: "Bonjour", sections: [{ id: "a", type: "texte", texte: "Un" }, { id: "b", type: "citation", citation: "Deux" }] };
  const en = { titre: "Hello", sections: [{ id: "b", citation: "Two" }] };
  const merged = withFallback(en, fr) as typeof fr;
  assert.equal(merged.titre, "Hello");
  assert.equal(merged.sections[0].texte, "Un");
  assert.equal(merged.sections[1].citation, "Two");
  assert.equal(merged.sections[1].type, "citation");
  const { content, path } = localize(fr, en, ["sections", 0, "texte"]);
  assert.deepEqual(path, ["sections", 1, "texte"]);
  assert.equal((getAt(content, ["sections", 1, "id"]) as string), "a");
});

test("garde-fous : longueurs, repères à garder, texte alternatif obligatoire", () => {
  assert.equal(ruleFor("hero.cta.label").role, "bouton");
  assert.match(guardValue("hero.cta.label", "Voir", "x".repeat(40)) ?? "", /32 caractères au plus/);
  assert.match(guardValue("livraison.note", "Offerte dès {seuil}", "Offerte") ?? "", /Gardez \{seuil\}/);
  assert.match(guardValue("image.alt", "Robe", "") ?? "", /ne peut pas rester vide/);
  assert.equal(guardValue("titre", "Un titre", "Un autre titre"), null);
  assert.equal(fill("Offerte dès {seuil}", { seuil: "250 €" }), "Offerte dès 250 €");
});

test("blocs : création avec repères, duplication, textes à écrire", () => {
  const b = createBlock("texte-image")!;
  assert.equal(b.type, "texte-image");
  assert.ok(todos({ sections: [b] }).includes("sections.0.titre"));
  const c = duplicateBlock(b);
  assert.notEqual(c.id, b.id);
  assert.equal(createBlock("inconnu"), null);
});
