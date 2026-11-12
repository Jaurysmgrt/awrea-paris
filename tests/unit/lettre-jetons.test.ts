/**
 * Liens envoyés par e-mail (confirmation de la lettre, privilège sur un autre appareil,
 * désinscription) : jetons chiffrés, opaques, d'un seul usage prévu ; et adresse des pages telle que
 * les outils de mesure la reçoivent (aucun jeton, aucun numéro de commande).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fabriquerJeton, lireJeton } from "@/lib/crm/jetons";
import { adresseMesuree } from "@/lib/analytics/adresse";

const SECRET = "un-secret-de-session-de-test-assez-long-0123456789";
const T0 = Date.parse("2026-11-12T10:00:00Z");

test("jeton chiffré : l'adresse n'y paraît jamais, il se relit avec le bon secret et le bon type", () => {
  const jeton = fabriquerJeton("lettre-confirmation", " Jeanne.Durand+lettre@Exemple.fr ", 7 * 86_400, { secret: SECRET, maintenant: T0 });
  // ni l'adresse, ni sa partie locale, ni son domaine, même décodés en base64
  const decode = jeton.split(".").map((p) => Buffer.from(p, "base64url").toString("latin1")).join(" ");
  for (const morceau of ["jeanne", "durand", "exemple", "@"]) {
    assert.ok(!jeton.toLowerCase().includes(morceau), morceau);
    assert.ok(!decode.toLowerCase().includes(morceau), morceau);
  }
  assert.deepEqual(lireJeton(jeton, ["lettre-confirmation"], { secret: SECRET, maintenant: T0 }), { k: "lettre-confirmation", e: "jeanne.durand+lettre@exemple.fr" });
  // deux jetons de la même adresse ne se ressemblent pas
  assert.notEqual(fabriquerJeton("lettre-confirmation", "jeanne@exemple.fr", 60, { secret: SECRET }), fabriquerJeton("lettre-confirmation", "jeanne@exemple.fr", 60, { secret: SECRET }));
});

test("jeton refusé : autre type, autre secret, altéré, expiré, malformé", () => {
  const jeton = fabriquerJeton("privilege-appareil", "jeanne@exemple.fr", 24 * 3600, { secret: SECRET, maintenant: T0 });
  assert.equal(lireJeton(jeton, ["desinscription"], { secret: SECRET, maintenant: T0 }), null, "un lien d'appareil ne désinscrit pas");
  assert.equal(lireJeton(jeton, ["privilege-appareil"], { secret: `${SECRET}-autre`, maintenant: T0 }), null);
  assert.equal(lireJeton(jeton, ["privilege-appareil"], { secret: SECRET, maintenant: T0 + 25 * 3600_000 }), null, "expiré après vingt-quatre heures");
  const [iv, tag, corps] = jeton.split(".");
  const change = corps[0] === "A" ? `B${corps.slice(1)}` : `A${corps.slice(1)}`;
  assert.equal(lireJeton([iv, tag, change].join("."), ["privilege-appareil"], { secret: SECRET, maintenant: T0 }), null, "altéré");
  for (const faux of ["", "faux.jeton", "a.b.c", `${jeton}.x`, "x".repeat(2000)]) assert.equal(lireJeton(faux, ["privilege-appareil"], { secret: SECRET, maintenant: T0 }), null, faux.slice(0, 20));
});

test("outils de mesure : l'adresse de la page sans jeton, sans numéro de commande, sans fragment ; les campagnes restent", () => {
  assert.equal(adresseMesuree("https://www.awreaparis.com/lettres/confirmation?jeton=abc.def.ghi"), "https://www.awreaparis.com/lettres/confirmation");
  assert.equal(adresseMesuree("https://www.awreaparis.com/lettres/desinscription?jeton=xyz#haut"), "https://www.awreaparis.com/lettres/desinscription");
  assert.equal(adresseMesuree("https://www.awreaparis.com/en/commande/confirmation?n=AW-1043&t=signe&s=cs_test"), "https://www.awreaparis.com/en/commande/confirmation");
  assert.equal(adresseMesuree("https://www.awreaparis.com/boutique?utm_source=instagram&email=jeanne%40exemple.fr&utm_campaign=lace"), "https://www.awreaparis.com/boutique?utm_source=instagram&utm_campaign=lace");
});
