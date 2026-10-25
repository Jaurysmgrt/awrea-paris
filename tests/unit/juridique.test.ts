/**
 * Textes juridiques : CGV et mentions légales officielles (documents de l'éditeur), registre légal,
 * ancres citées par les autres pages, cohérence des pages légales avec la création sur demande.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { legalFields } from "@/content/legal/fields";
import { legalPages } from "@/content/fr/legal";
import { identity } from "@/content/brand/identity";
import { anchorsOf, fromDoc, fromPage, type LegalDocContent } from "@/lib/legal/doc";

const doc = (name: string) => JSON.parse(readFileSync(new URL(`../../content/site/fr/${name}.json`, import.meta.url), "utf8")) as LegalDocContent;
const cgv = doc("cgv");
const ml = doc("mentions-legales");
const texts = (v: unknown): string[] => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(texts) : v && typeof v === "object" ? Object.values(v).flatMap(texts) : []);

test("CGV : les onze articles officiels, dans l’ordre, puis l’annexe de la Maison", () => {
  const articles = cgv.sections.filter((s) => s.officiel);
  assert.equal(articles.length, 11);
  articles.forEach((s, i) => assert.match(s.titre, new RegExp(`^ARTICLE ${i + 1} – `), s.titre));
  assert.deepEqual(
    articles.map((s) => s.id),
    ["champ-application", "prix", "commande", "paiement", "livraison", "transfert-propriete", "retractation", "garanties", "donnees", "propriete-intellectuelle", "droit"],
  );
  const last = cgv.sections.at(-1)!;
  assert.equal(last.id, "annexe");
  assert.notEqual(last.officiel, true);
  assert.ok(last.blocs.some((b) => "type" in b && b.type === "withdrawal-model"));
});

test("CGV : listes en vraies listes, aucune puce tapée dans le texte", () => {
  const listes = cgv.sections.flatMap((s) => s.blocs.filter((b): b is { liste: string[] } => "liste" in b));
  assert.deepEqual(
    listes.map((l) => l.liste.length),
    [2, 2, 7],
  );
  for (const t of texts(cgv.sections)) assert.doesNotMatch(t, /^\s*[-–—•]\s/, t);
});

test("textes officiels : typographie française (apostrophes, guillemets, espaces insécables)", () => {
  for (const t of [...texts(cgv), ...texts(ml)]) {
    assert.doesNotMatch(t, /(?<=\p{L})'(?=\p{L})/u, `apostrophe droite : ${t.slice(0, 60)}`);
    assert.doesNotMatch(t, /« |[^ ]»| [:;?!](?=\s|$)/u, `espace insécable manquante : ${t.slice(0, 60)}`);
    assert.doesNotMatch(t, /"/, `guillemets droits : ${t.slice(0, 60)}`);
  }
});

test("mentions légales : préambule et informations de l’entreprise officiels, compléments signalés", () => {
  assert.equal(ml.preambule?.officiel, true);
  const entreprise = ml.sections.find((s) => s.id === "entreprise")!;
  assert.equal(entreprise.officiel, true);
  const t = texts(entreprise).join("\n");
  for (const fact of ["Léane Soubrier", "100 222 926", "10022292600014", "46 rue Paul Déroulède, 78290 Croissy-sur-Seine", "awrea.contact@gmail.com", "06 99 55 74 43", "01/04/2026", "05/02/2026"]) assert.ok(t.includes(fact), fact);
  for (const id of ["publication", "tva", "mediation"]) {
    const s = ml.sections.find((x) => x.id === id)!;
    assert.notEqual(s.officiel, true, id);
    assert.match(texts(s).join(" "), /\{\{[a-zA-Z]+\}\}/, `${id} : repère du registre légal`);
  }
});

test("registre légal : informations réelles reportées, rien d’inventé pour le reste", () => {
  assert.equal(legalFields.raisonSociale.value, "Léane Soubrier");
  assert.equal(legalFields.nomCommercial.value, "Awrea Paris");
  assert.equal(legalFields.siren.value, "100 222 926");
  assert.equal(legalFields.siret.value, "100 222 926 00014");
  assert.equal(legalFields.siege.value, "46 rue Paul Déroulède, 78290 Croissy-sur-Seine, France");
  assert.equal(legalFields.email.value, "awrea.contact@gmail.com");
  assert.equal(legalFields.telephone.value, "06 99 55 74 43");
  assert.equal(identity.email, legalFields.email.value);
  assert.equal(identity.siret, legalFields.siret.value);
  // absents des textes officiels : à compléter, jamais devinés
  for (const k of ["tva", "directricePublication", "mediateur", "hebergeur", "marque", "creditsPhotos"] as const) assert.equal(legalFields[k].value, "", k);
  // une entreprise individuelle n'a pas de capital : rien à publier
  assert.equal(legalFields.capital.sansObjet, true);
});

test("chaque champ {{…}} des pages légales existe dans le registre", () => {
  const all = [...texts(cgv), ...texts(ml), ...texts(legalPages), ...texts(doc("juridique"))];
  for (const t of all) for (const m of t.matchAll(/\{\{([a-zA-Z]+)\}\}/g)) assert.ok(m[1] in legalFields, `champ inconnu ${m[1]}`);
});

test("les liens vers une ancre des pages légales mènent à une section qui existe", () => {
  const anchors: Record<string, string[]> = {
    "/cgv": anchorsOf(fromDoc(cgv, "/cgv")),
    "/mentions-legales": anchorsOf(fromDoc(ml, "/mentions-legales")),
    ...Object.fromEntries(Object.values(legalPages).map((p) => [`/${p.slug}`, anchorsOf(fromPage(p))])),
  };
  for (const t of [...texts(legalPages), ...texts(cgv), ...texts(ml)]) {
    for (const m of t.matchAll(/\]\((\/[a-z-]+)#([a-z0-9-]+)\)/g)) {
      if (!(m[1] in anchors)) continue;
      assert.ok(anchors[m[1]].includes(m[2]), `${m[1]}#${m[2]} : ancre absente`);
    }
  }
});

test("pages légales de la Maison : création sur demande, sans stock limité ni série numérotée", () => {
  const all = [...texts(legalPages), ...texts(ml.sections.filter((s) => !s.officiel))].join("\n");
  assert.doesNotMatch(all, /précommande|épuisé|série numérotée|série limitée|édition limitée|liste d’attente|pièces restantes|retour en stock|stocks? limité/i);
  // l'article 5 des CGV officielles prévoit une livraison en France métropolitaine
  const tarifs = legalPages["livraison-retours"].sections.find((s) => s.id === "tarifs")!;
  assert.ok(texts(tarifs).every((t) => !/Union européenne|international/i.test(t)));
  // les frais de retour suivent l'article 7 des CGV officielles
  assert.match(texts(legalPages.retractation).join(" "), /Les frais de retour restent à votre charge/);
});
