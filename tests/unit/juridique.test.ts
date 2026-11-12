/**
 * Textes juridiques : CGV officielles et mentions légales de la Maison (documents de l'éditeur),
 * registre légal, ancres citées par les autres pages, cohérence des pages légales avec la création
 * sur demande.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { legalFields } from "@/content/legal/fields";
import { legalPages } from "@/content/fr/legal";
import { identity } from "@/content/brand/identity";
import { anchorsOf, fromDoc, fromPage, type LegalDocContent } from "@/lib/legal/doc";

const doc = (name: string, lang = "fr") => JSON.parse(readFileSync(new URL(`../../content/site/${lang}/${name}.json`, import.meta.url), "utf8")) as LegalDocContent;
const cgv = doc("cgv");
const ml = doc("mentions-legales");
const mlEn = doc("mentions-legales", "en");
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

test("mentions légales réécrites (cahier du 10/11) : texte de la Maison, rubriques dans l’ordre", () => {
  // plus de texte officiel : les règles d'écriture s'y appliquent
  assert.notEqual(ml.preambule?.officiel, true);
  assert.ok(ml.sections.every((s) => s.officiel !== true));
  const ids = ["editrice", "hebergement", "tva", "fabrication", "mediation", "propriete-intellectuelle", "donnees-personnelles", "credits", "signalement", "autres-textes"];
  assert.deepEqual(
    ml.sections.map((s) => s.id),
    ids,
  );
  // version anglaise : mêmes rubriques et mêmes ancres
  assert.deepEqual(
    mlEn.sections.map((s) => s.id),
    ids,
  );
  const all = texts(ml).join("\n");
  // ni l'ancien hébergeur, ni l'ancienne adresse, ni « intelligence artificielle » pour l'hébergement
  assert.doesNotMatch(all + texts(mlEn).join("\n"), /Wix|Croissy|Déroulède|Yvelines/);
  assert.doesNotMatch(texts(ml.sections.find((s) => s.id === "hebergement")).join(" "), /intelligence artificielle/i);
});

test("mentions légales : fiche de l’éditrice tirée du registre légal, adresse et médiateur à compléter", () => {
  const editrice = ml.sections.find((s) => s.id === "editrice")!;
  const fiche = editrice.blocs.find((b): b is { fiche: { libelle: string; valeur: string }[] } => "fiche" in b)!;
  const valeurs = Object.fromEntries(fiche.fiche.map((r) => [r.libelle, r.valeur]));
  assert.deepEqual(valeurs, {
    "Nom commercial": "{{nomCommercial}}",
    "Éditrice et exploitante": "{{raisonSociale}}, {{formeJuridique}}",
    "Directrice de la publication": "{{directricePublication}}",
    Adresse: "{{siege}}",
    SIREN: "{{siren}}",
    SIRET: "{{siret}}",
    Immatriculation: "{{immatriculation}}",
    "Activité déclarée": "{{activite}}",
    "E-mail": "{{email}}",
    Téléphone: "{{telephone}}",
  });
  // l'adresse attend la domiciliation, le médiateur n'est pas encore désigné : repères bien visibles
  assert.equal(legalFields.siege.value, "");
  assert.equal(legalFields.siege.short, "adresse de domiciliation");
  assert.equal(legalFields.mediateur.value, "");
  assert.equal(legalFields.mediateur.short, "médiateur de la consommation");
  assert.match(texts(ml.sections.find((s) => s.id === "mediation")).join(" "), /\{\{mediateur\}\}/);
  // hébergeur réel du site, contact par son site (aucun téléphone public)
  const hebergement = texts(ml.sections.find((s) => s.id === "hebergement")).join(" ");
  assert.match(hebergement, /\{\{hebergeur\}\}/);
  assert.match(hebergement, /\(https:\/\/vercel\.com\)/);
});

test("mentions légales : fabrication à la commande sans priver les modèles standards de la rétractation", () => {
  const t = texts(ml.sections.find((s) => s.id === "fabrication")).join(" ");
  assert.match(t, /modèles standards/);
  assert.match(t, /après la validation de votre commande/);
  assert.match(t, /n’est pas une création personnalisée/);
  assert.match(t, /droit de rétractation de quatorze jours/);
  assert.match(t, /article L221-28, 3°/);
  assert.match(t, /\]\(\/retractation\)/);
});

test("mentions légales : liens vers les textes qui existent réellement", () => {
  const liens = [...texts(ml).join("\n").matchAll(/\]\((\/[^)#\s]*)(?:#([a-z0-9-]+))?\)/g)].map((m) => ({ path: m[1], anchor: m[2] }));
  const attendus = ["/cgv", "/confidentialite", "/cookies", "/livraison-retours", "/retractation", "/cgu", "/propriete-intellectuelle", "/guide-des-tailles"];
  for (const p of attendus) assert.ok(liens.some((l) => l.path === p), `lien vers ${p}`);
  assert.ok(liens.some((l) => l.path === "/cgv" && l.anchor === "garanties"), "garanties légales");
  assert.ok(liens.some((l) => l.path === "/mentions-legales" && l.anchor === "mediation"), "réclamation et médiation");
  // chaque page citée existe dans le site
  for (const l of liens) assert.ok(existsSync(new URL(`../../app/(site)${l.path}/page.tsx`, import.meta.url)), `page ${l.path}`);
});

test("registre légal : informations réelles reportées, rien d’inventé pour le reste", () => {
  assert.equal(legalFields.raisonSociale.value, "Léane Soubrier");
  assert.equal(legalFields.nomCommercial.value, "Awrea Paris");
  assert.equal(legalFields.formeJuridique.value, "entrepreneuse individuelle (EI, micro-entreprise)");
  assert.equal(legalFields.directricePublication.value, "Léane Soubrier");
  assert.equal(legalFields.siren.value, "100 222 926");
  assert.equal(legalFields.siret.value, "100 222 926 00014");
  assert.equal(legalFields.activite.value, "Activités spécialisées de design (code APE 7410Z)");
  assert.equal(legalFields.email.value, "awrea.contact@gmail.com");
  assert.equal(legalFields.telephone.value, "06 99 55 74 43");
  assert.equal(legalFields.hebergeur.value, "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis");
  assert.equal(identity.email, legalFields.email.value);
  assert.equal(identity.siret, legalFields.siret.value);
  // l'ancienne adresse n'est plus publiée nulle part, en attendant la domiciliation
  assert.equal(identity.legalAddress.streetAddress, "");
  assert.equal(identity.foundingLocation, "");
  assert.doesNotMatch(JSON.stringify(legalFields), /Croissy|Déroulède/);
  // pas encore connus : à compléter, jamais devinés
  for (const k of ["siege", "mediateur", "marque", "creditsPhotos"] as const) assert.equal(legalFields[k].value, "", k);
  // franchise en base : pas de numéro de TVA intracommunautaire à publier
  assert.equal(legalFields.tva.sansObjet, true);
  // une entreprise individuelle n'a pas de capital : rien à publier
  assert.equal(legalFields.capital.sansObjet, true);
});

test("chaque champ {{…}} des pages légales existe dans le registre", () => {
  const all = [...texts(cgv), ...texts(ml), ...texts(mlEn), ...texts(legalPages), ...texts(doc("juridique"))];
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
