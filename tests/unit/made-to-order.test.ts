/**
 * « Made to Order » (cahier de la créatrice du 23/11) : délais de livraison lus dans les réglages de la
 * boutique et redits dans chaque langue, icônes choisies dans les contenus, textes des deux langues
 * accordés (page Savoir-faire, bloc « Créée pour vous » de la fiche).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { delaiLivraisonTexte, lireDelaiLivraison, modesDeLivraison } from "@/lib/commerce/delais-livraison";
import { isIconName } from "@/components/ui/icones";
import { shop } from "@/content/settings";

const doc = (lang: "fr" | "en", name: string) => JSON.parse(readFileSync(new URL(`../../content/site/${lang}/${name}.json`, import.meta.url), "utf8"));
const NB = " ";
const plain = (s: string) => s.replace(/[  ]/g, " ");

test("délais de livraison : chaque mode des réglages se lit (jours ouvrés ou heures)", () => {
  assert.deepEqual(lireDelaiLivraison("2 à 3 jours ouvrés après expédition"), { unite: "jours", min: 2, max: 3 });
  assert.deepEqual(lireDelaiLivraison(`5${NB}à${NB}3 jours ouvrés`), { unite: "jours", min: 3, max: 5 });
  assert.deepEqual(lireDelaiLivraison("1 jour ouvré"), { unite: "jours", min: 1, max: 1 });
  assert.deepEqual(lireDelaiLivraison("24 h après expédition"), { unite: "heures", n: 24 });
  assert.equal(lireDelaiLivraison("selon le transporteur"), null);
  // aucun mode des réglages n'est illisible : sinon la page anglaise afficherait du français
  for (const r of shop.shippingRates) assert.notEqual(lireDelaiLivraison(r.delay), null, r.id);
});

test("délais de livraison : redits avec les modèles de chaque langue, jamais devinés", () => {
  const fr = doc("fr", "sur-commande").delais.livraison.delai;
  const en = doc("en", "sur-commande").delais.livraison.delai;
  assert.equal(plain(delaiLivraisonTexte("2 à 3 jours ouvrés après expédition", fr)), "2 à 3 jours ouvrés");
  assert.equal(plain(delaiLivraisonTexte("2 à 3 jours ouvrés après expédition", en)), "2 to 3 working days");
  assert.equal(plain(delaiLivraisonTexte("24 h après expédition", en)), "24 hours");
  assert.equal(plain(delaiLivraisonTexte("1 jour ouvré", fr)), "1 jour ouvré");
  assert.equal(plain(delaiLivraisonTexte("4 jours ouvrés", en)), "4 working days");
  // illisible : le texte des réglages, tel quel
  assert.equal(delaiLivraisonTexte("selon le transporteur", en), "selon le transporteur");
});

test("modes de livraison : ceux des CGV (France, sans retrait), nommés dans chaque langue", () => {
  const attendus = shop.shippingRates.filter((r) => r.zone === "FR" && !r.pickup);
  for (const lang of ["fr", "en"] as const) {
    const t = doc(lang, "sur-commande").delais.livraison;
    const modes = modesDeLivraison(shop.shippingRates, t.modes, t.delai);
    assert.deepEqual(
      modes.map((m) => m.id),
      attendus.map((r) => r.id),
    );
    // chaque mode a son nom dans la langue de la page
    for (const r of attendus) assert.ok(t.modes[r.id], `${lang} : nom du mode ${r.id}`);
  }
  // un mode inconnu du document garde le nom des réglages
  const t = doc("fr", "sur-commande").delais.livraison;
  assert.equal(modesDeLivraison([{ id: "fr-nouveau", zone: "FR", label: "Coursier", delay: "1 jour ouvré" }], t.modes, t.delai)[0].nom, "Coursier");
});

test("le délai de confection n'est jamais présenté comme le délai total", () => {
  const fr = doc("fr", "sur-commande").delais;
  const en = doc("en", "sur-commande").delais;
  assert.match(plain(fr.texte), /n’est pas le délai total/);
  assert.match(plain(en.texte), /not the whole wait/);
  // sur la fiche : « délai de confection », suivi de l'expédition
  assert.match(plain(doc("fr", "catalogue").surDemande.fiche), /^Délai de confection : \{delai\}, avant l’expédition\.$/);
  assert.match(plain(doc("en", "catalogue").surDemande.fiche), /^Making time: \{delai\}, before dispatch\.$/);
});

test("icônes choisies dans les contenus : toutes connues, dans les deux langues", () => {
  for (const lang of ["fr", "en"] as const) {
    const sc = doc(lang, "sur-commande");
    const fiche = doc(lang, "fiche-piece");
    const noms = [...sc.etapes.frise.map((e: { icon: string }) => e.icon), sc.delais.confection.icon, sc.delais.expedition.icon, sc.delais.livraison.icon, ...fiche.pourVous.points.map((p: { icon: string }) => p.icon)];
    for (const n of noms) assert.ok(isIconName(n), `${lang} : icône inconnue « ${n} »`);
  }
  assert.equal(isIconName("toString"), false);
  assert.equal(isIconName(undefined), false);
});

test("français et anglais accordés : mêmes étapes, mêmes icônes, mêmes repères", () => {
  const [fr, en] = [doc("fr", "sur-commande"), doc("en", "sur-commande")];
  assert.equal(fr.etapes.frise.length, 5);
  assert.deepEqual(
    fr.etapes.frise.map((e: { numero: string; icon: string }) => [e.numero, e.icon]),
    en.etapes.frise.map((e: { numero: string; icon: string }) => [e.numero, e.icon]),
  );
  assert.deepEqual(Object.keys(fr.delais.livraison.modes), Object.keys(en.delais.livraison.modes));
  assert.equal(fr.delais.fin.lien.href, en.delais.fin.lien.href);
  const [ffr, fen] = [doc("fr", "fiche-piece").pourVous, doc("en", "fiche-piece").pourVous];
  assert.deepEqual(
    ffr.points.map((p: { icon: string }) => p.icon),
    fen.points.map((p: { icon: string }) => p.icon),
  );
  // l'introduction n'est pas dans le bloc officiel des étapes : elle passe le contrôle d'écriture
  assert.equal(fr.etapes.officiel, true);
  assert.equal("intro" in fr.etapes, false);
  assert.ok(fr.parcours.intro.length > 0 && en.parcours.intro.length > 0);
});
