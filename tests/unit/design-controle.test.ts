/** Rôle « Design » : ce qu'il relève sur une page, ce qui revient d'un jour à l'autre, l'ordre de traitement. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyserPage, MOTS_AVANT_BOUTON, photosInternes, prioriser, recurrence, repetition, texteVisible, type Remarque } from "@/lib/design/controle";

const page = (main: string, avant = "") => `<html><body><header>${avant}</header><main id="contenu">${main}</main></body></html>`;

test("texte lisible : sans balises, scripts ni textes réservés aux lecteurs d'écran", () => {
  assert.equal(texteVisible(`<p>La <em>robe</em>&nbsp;Sienna</p><script>var x = 1</script><span class="sr-only">caché</span>`), "La robe Sienna");
});

test("un seul titre principal ; chaque photo décrite", () => {
  assert.deepEqual(analyserPage("/", page(`<h1>Un</h1><img src="/media/a.webp" alt="Une robe">`)), []);
  const deux = analyserPage("/", page(`<h1>Un</h1><h1>Deux</h1>`));
  assert.equal(deux.length, 1);
  assert.match(deux[0].titre, /2 titres principaux/);
  const sansAlt = analyserPage("/", page(`<h1>Un</h1><img src="/media/a.webp"><img src="/media/b.webp" alt="">`));
  assert.equal(sansAlt.length, 1);
  assert.match(sansAlt[0].titre, /^1 photo sans description/);
});

test("une section, un appel à l'action : deux boutons noirs se disputent la section", () => {
  const un = page(`<h1>T</h1><section><a class="btn" href="/a">Voir</a><a class="btn btn--outline" href="/b">Autre</a></section>`);
  assert.deepEqual(analyserPage("/", un), []);
  const deux = page(`<h1>T</h1><section><a class="btn" href="/a">Voir</a><a class="btn" href="/b">Autre</a></section>`);
  assert.match(analyserPage("/", deux)[0].titre, /deux boutons/);
});

test("fiche d'une pièce : la fiche allégée passe, l'ancienne fiche répétait le délai", () => {
  const nouvelle = page(`<h1>La robe Sienna</h1><p>180,00 €</p><p>Créée sur demande pour vous, en 3 à 4 semaines.</p><p>Un col montant, un dos nu, un buste de dentelle noire et or.</p><p>Taille XS S M L XL Trouver ma taille</p><div class="product-form__actions"><button>Ajouter au panier</button></div>`);
  assert.deepEqual(analyserPage("/boutique/robe-sienna", nouvelle, { fiche: true }), []);
  // l'ancienne fiche (avant le 01/11) : le délai sous le prix, puis encore dans le bloc « sur demande »
  const ancienne = page(`<h1>La robe Sienna</h1><p>180,00 €</p><p>Sur demande, 3 à 4 semaines</p><p>Un col montant, un dos nu, un buste de dentelle noire et or.</p><p>Pièce créée sur demande pour vous, sans stock, par des artisans français.</p><dl><dt>Délai de fabrication</dt><dd>3 à 4 semaines, puis expédition</dd></dl><p>Choisissez votre taille.</p><div class="product-form__actions"><button>Ajouter au panier</button></div>`);
  const r = analyserPage("/boutique/robe-sienna", ancienne, { fiche: true });
  assert.ok(r.some((x) => /revient 2 fois avant le bouton/.test(x.titre)), JSON.stringify(r));
  // beaucoup de texte avant le bouton
  const bavarde = page(`<h1>Nom</h1><p>${"mot ".repeat(MOTS_AVANT_BOUTON + 5)}</p><div class="product-form__actions"></div>`);
  assert.ok(analyserPage("/boutique/x", bavarde, { fiche: true }).some((x) => /Trop de texte avant le bouton/.test(x.titre)));
});

test("répétition : une suite de mots vides n'en est pas une", () => {
  assert.equal(repetition("de la de la de la de la"), null);
  assert.deepEqual(repetition("en 3 à 4 semaines puis en 3 à 4 semaines"), { suite: "en 3 à 4", fois: 2 });
});

test("photos internes d'une page, sans doublon ni adresse extérieure", () => {
  const html = page(`<img src="/media/a.webp" alt="a"><img src="/media/a.webp" alt="a"><img src="https://exemple.fr/b.webp" alt="b"><img src="/_next/image?url=%2Fx&amp;w=640" alt="c">`);
  assert.deepEqual(photosInternes(html), ["/media/a.webp", "/_next/image?url=%2Fx&w=640"]);
});

const remarque = (cible: string, gravite: Remarque["gravite"] = "attention"): Remarque => ({ gravite, titre: cible, page: "/", cible });

test("ce qui revient trois jours d'affilée monte d'un cran ; un jour sans, et le compte repart", () => {
  let suivi = recurrence({}, [remarque("a")], "2026-11-01").suivi;
  assert.equal(suivi.a.jours, 1);
  // relancé le même jour : le compte ne bouge pas
  suivi = recurrence(suivi, [remarque("a")], "2026-11-01").suivi;
  assert.equal(suivi.a.jours, 1);
  suivi = recurrence(suivi, [remarque("a")], "2026-11-02").suivi;
  assert.equal(suivi.a.jours, 2);
  const j3 = recurrence(suivi, [remarque("a"), remarque("b", "info")], "2026-11-03");
  assert.equal(j3.suivi.a.jours, 3);
  assert.equal(j3.suivi.a.depuis, "2026-11-01");
  assert.equal(j3.remarques[0].gravite, "urgent");
  assert.match(j3.remarques[0].detail ?? "", /^Revient depuis 3 jours/);
  assert.equal(j3.remarques[1].gravite, "info");
  // disparue un jour : elle sort du suivi ; revenue après une pause, elle recommence à 1
  const j5 = recurrence(j3.suivi, [remarque("a")], "2026-11-05");
  assert.equal(j5.suivi.a.jours, 1);
  assert.equal(j5.suivi.b, undefined);
});

test("par quoi commencer : le plus grave, puis ce qui revient depuis le plus longtemps", () => {
  const suivi = { vieux: { depuis: "2026-10-28", vu: "2026-11-02", jours: 6 }, neuf: { depuis: "2026-11-02", vu: "2026-11-02", jours: 1 } };
  const ordre = prioriser([remarque("neuf"), remarque("info", "info"), remarque("vieux"), remarque("grave", "urgent")], suivi);
  assert.deepEqual(ordre.map((r) => r.cible), ["grave", "vieux", "neuf", "info"]);
});
