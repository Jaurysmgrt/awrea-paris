/** Liens des e-mails sans code visible (lib/email/liens.ts, parcours UX du 23/11). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseComprise, adresseValable, ajouterLien, assembler, decouper, modifierTexte } from "@/lib/email/liens";

const valeur = "Retrouvez [la boutique](/boutique) et [nos pièces](/collection) dès ce soir.";

test("le champ ne montre que les mots ; les liens sont rangés à part et se remettent à l’identique", () => {
  const { texte, liens } = decouper(valeur);
  assert.equal(texte, "Retrouvez la boutique et nos pièces dès ce soir.");
  assert.deepEqual(liens.map((l) => [texte.slice(l.from, l.to), l.adresse]), [["la boutique", "/boutique"], ["nos pièces", "/collection"]]);
  assert.equal(assembler(texte, liens), valeur);
});

test("les liens suivent leurs mots quand le texte change", () => {
  // avant les liens : ils se décalent
  assert.equal(modifierTexte(valeur, "Venez voir la boutique et nos pièces dès ce soir."), "Venez voir [la boutique](/boutique) et [nos pièces](/collection) dès ce soir.");
  // à l'intérieur d'un lien : il garde ses nouveaux mots
  assert.equal(modifierTexte(valeur, "Retrouvez la belle boutique et nos pièces dès ce soir."), "Retrouvez [la belle boutique](/boutique) et [nos pièces](/collection) dès ce soir.");
  // après : rien ne bouge
  assert.equal(modifierTexte(valeur, "Retrouvez la boutique et nos pièces dès demain."), "Retrouvez [la boutique](/boutique) et [nos pièces](/collection) dès demain.");
  // les mots d'un lien effacés : le lien disparaît
  assert.equal(modifierTexte(valeur, "Retrouvez et nos pièces dès ce soir."), "Retrouvez et [nos pièces](/collection) dès ce soir.");
  // texte sans lien : inchangé
  assert.equal(modifierTexte("Bonjour", "Bonjour Camille"), "Bonjour Camille");
});

test("ajouter un lien : sur les mots choisis, ou inséré au curseur avec une espace", () => {
  const t = "Votre pièce porte son certificat d’authenticité.";
  const from = t.indexOf("certificat");
  assert.equal(ajouterLien(t, from, from + "certificat".length, "certificat", "/certificat"), "Votre pièce porte son [certificat](/certificat) d’authenticité.");
  // sans choix, à la fin, après un point : jamais collé
  assert.equal(ajouterLien(t, t.length, t.length, "la boutique", "/boutique"), "Votre pièce porte son certificat d’authenticité. [la boutique](/boutique)");
  // au milieu d'un texte qui contient déjà un lien : l'ancien lien se décale
  const v = "Bonjour, voici [la boutique](/boutique).";
  assert.equal(ajouterLien(v, 0, 0, "Camille", "/compte"), "[Camille](/compte) Bonjour, voici [la boutique](/boutique).");
  // adresse refusée : rien ne change
  assert.equal(ajouterLien(t, 0, 0, "x", "javascript:alert(1)"), t);
});

test("adresse comprise comme on l’écrit, jamais une adresse dangereuse", () => {
  assert.equal(adresseComprise("boutique"), "/boutique");
  assert.equal(adresseComprise("collection/hypnotic-lace"), "/collection/hypnotic-lace");
  assert.equal(adresseComprise("www.instagram.com/awreaparis"), "https://www.instagram.com/awreaparis");
  assert.equal(adresseComprise("http://exemple.fr"), "https://exemple.fr");
  assert.equal(adresseComprise("contact@awreaparis.com"), "mailto:contact@awreaparis.com");
  assert.equal(adresseValable(adresseComprise("javascript:alert(1)")), false);
  assert.equal(adresseValable(adresseComprise("//pirate.exemple")), false);
});
