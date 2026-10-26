/** Éditeur « Édition » : chemins, marques invisibles, traductions, garde-fous, blocs, photos provisoires. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { changedPaths, getAt, isSafePath, listOp, parsePath, setAt } from "@/lib/edition/paths";
import { hasStega, stegaClean, stegaEncodeDeep, stegaSources } from "@/lib/edition/stega";
import { localize, withFallback } from "@/lib/edition/merge";
import { guardValue, ruleFor } from "@/lib/edition/guard";
import { createBlock, duplicateBlock, todos } from "@/lib/edition/blocks";
import { fill } from "@/lib/edition/fill";
import { imagesIn, isImg, isProvisional, provisionalAfterReplace, provisionalIn, withProvisional } from "@/lib/edition/provisoires";

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

test("photos provisoires : un seul marqueur, repéré dans tout le document, jamais faux par écrit", () => {
  const photo = { src: "/media/img/aura-1", alt: "Le body Aura porté", width: 1536, height: 2304, provisoire: true };
  assert.ok(isImg(photo) && isProvisional(photo));
  assert.ok(!isProvisional({ ...photo, provisoire: false }));
  assert.ok(!isImg({ src: "/v.mp4", poster: "/v.jpg", label: "Vidéo" }));
  const doc = { image: photo, chapitres: [{ titre: "Un", image: { ...photo, src: "/media/img/sienna-detail" } }, { titre: "Deux", image: { src: "/media/img/creatrice-portrait", alt: "La créatrice", width: 1200, height: 1500 } }] };
  assert.deepEqual(imagesIn(doc).map((f) => f.path), ["image", "chapitres.0.image", "chapitres.1.image"]);
  assert.deepEqual(provisionalIn(doc).map((f) => [f.path, f.etat]), [["image", "a-remplacer"], ["chapitres.0.image", "a-remplacer"]]);
  // enregistrement : la clé n'est écrite que si elle vaut vrai
  assert.equal("provisoire" in withProvisional(photo, false), false);
  assert.equal(withProvisional({ ...photo, provisoire: undefined }, true).provisoire, true);
  // le marqueur n'est pas un texte : jamais marqué par le mode Édition
  assert.equal(stegaEncodeDeep({ image: photo }, "accueil", "fr").image.provisoire, true);
});

test("photos provisoires : remplacée par un envoi, la photo ne l’est plus, sauf case cochée", () => {
  const envoi = { src: "/media/edition/20261024-abcdef1234", alt: "", width: 1200, height: 1800 };
  // case jamais touchée : la nouvelle photo n'est pas provisoire, même si l'ancienne l'était
  assert.equal(provisionalAfterReplace({ touched: false, checked: true }, envoi), false);
  // la créatrice coche la case elle-même : la photo reste un visuel d'attente
  assert.equal(provisionalAfterReplace({ touched: true, checked: true }, envoi), true);
  // une photo déposée comme provisoire, reprise depuis la médiathèque, garde sa pastille
  assert.equal(provisionalAfterReplace({ touched: false, checked: false }, { ...envoi, provisoire: true }), true);
  assert.equal(provisionalAfterReplace({ touched: true, checked: false }, { ...envoi, provisoire: true }), false);

  // remplacée ou décochée dans le brouillon : provisoire en ligne jusqu'à « Publier »
  const enLigne = { maison: { image: { src: "/media/img/aura-1", alt: "Aura", width: 2, height: 3, provisoire: true } }, sections: [{ id: "a", image: { src: "/media/img/odessa-1", alt: "Odessa", width: 2, height: 3, provisoire: true } }, { id: "b", texte: "Texte" }] };
  const brouillon = { maison: { image: { ...envoi, alt: "Aura" } }, sections: [{ id: "b", texte: "Texte" }, enLigne.sections[0]] };
  assert.deepEqual(provisionalIn(enLigne, brouillon).map((f) => [f.path, f.etat]), [["sections.1.image", "a-remplacer"], ["maison.image", "a-publier"]]);
  assert.deepEqual(provisionalIn(enLigne, null).map((f) => f.etat), ["a-remplacer", "a-remplacer"]);
});

test("photos provisoires : les visuels d’attente du dépôt portent le marqueur, le portrait officiel non", () => {
  // RESSOURCES.md : photos IA en attendant les prises de vue, et les sacs découpés dans une maquette
  const PROVISOIRES = ["aura-1", "aura-detail", "odessa-1", "odessa-detail", "aria-1", "aria-detail", "sienna-1", "sienna-detail", "gaia-1", "gaia-detail", "evina-1", "kira-1", "contact-sacs"];
  const dir = path.join(process.cwd(), "content", "site", "fr");
  const found: { doc: string; path: string; src: string; provisoire: boolean }[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    for (const i of imagesIn(doc)) found.push({ doc: f, path: i.path, src: i.image.src, provisoire: i.image.provisoire === true });
  }
  for (const i of found) {
    const name = i.src.replace(/^\/media\/img\//, "");
    if (PROVISOIRES.includes(name)) assert.ok(i.provisoire, `${i.doc} › ${i.path} (${i.src}) : visuel d’attente sans « provisoire: true »`);
    if (name === "creatrice-portrait") assert.ok(!i.provisoire, `${i.doc} › ${i.path} : le portrait de la créatrice est une photo officielle`);
  }
  assert.ok(found.some((i) => i.src === "/media/img/contact-sacs" && i.provisoire), "le visuel des sacs de la page Contact est provisoire");
  assert.ok(found.some((i) => i.src === "/media/img/creatrice-portrait" && !i.provisoire), "le portrait de la créatrice paraît sur la page La Maison");
});
