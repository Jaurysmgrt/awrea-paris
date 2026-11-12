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

const ARTICLES = ["champ-application", "prix", "commande", "paiement", "livraison", "transfert-propriete", "retractation", "garanties", "donnees", "propriete-intellectuelle", "droit"];
const cgvEn = doc("cgv", "en");
const article = (id: string, d = cgv) => texts(d.sections.find((s) => s.id === id)).join(" ");

test("CGV corrigées le 12/11 : onze articles dans l’ordre, puis l’annexe, en texte de la Maison", () => {
  // à la demande de la créatrice, les CGV ne sont plus un texte officiel : les règles d'écriture s'y appliquent
  assert.ok(cgv.sections.every((s) => s.officiel !== true));
  const articles = cgv.sections.slice(0, -1);
  assert.equal(articles.length, 11);
  articles.forEach((s, i) => assert.match(s.titre, new RegExp(`^ARTICLE ${i + 1}\\. \\S`), s.titre));
  assert.deepEqual(
    articles.map((s) => s.id),
    ARTICLES,
  );
  const last = cgv.sections.at(-1)!;
  assert.equal(last.id, "annexe");
  assert.ok(last.blocs.some((b) => "type" in b && b.type === "withdrawal-model"));
  // version anglaise (pour information) : mêmes articles, mêmes ancres
  assert.deepEqual(
    cgvEn.sections.map((s) => s.id),
    [...ARTICLES, "annexe"],
  );
  assert.ok(cgvEn.sections.every((s) => s.officiel !== true));
});

test("CGV : plus aucune contradiction avec le fonctionnement de la Maison", () => {
  const all = texts(cgv.sections).join("\n");
  // ni l'ancien site, ni le stock, ni le hors-taxe, ni la règle des abonnements
  assert.doesNotMatch(all, /wixsite|limite des stocks|stocks? disponibles?|HT et TTC|sous réserve de disponibilité|livraison régulière/);
  // article 1 : modèles standards fabriqués après la commande, coordonnées tirées du registre légal
  assert.match(article("champ-application"), /modèles standards/);
  assert.match(article("champ-application"), /ni fabriqués à l’avance ni tenus en stock/);
  for (const champ of ["{{raisonSociale}}", "{{formeJuridique}}", "{{nomCommercial}}", "{{siege}}", "{{siret}}", "{{email}}", "{{telephone}}"]) assert.ok(article("champ-application").includes(champ), champ);
  // article 2 : franchise en base, prix affiché = prix payé, facture au paiement
  assert.match(article("prix"), /toutes taxes comprises/);
  assert.match(article("prix"), /TVA non applicable, article 293 B du Code général des impôts\./);
  assert.match(article("prix"), /prix payé par le Client/);
  assert.match(article("prix"), /dès le paiement de la commande/);
  // article 5 : délai de fabrication, puis 5 à 10 jours ouvrés ; les délais de réclamation ne réduisent pas les garanties
  assert.match(article("livraison"), /délai de fabrication indiqué sur la fiche du Produit/);
  assert.match(article("livraison"), /5 à 10 jours ouvrés à compter de la fin de la fabrication/);
  assert.match(article("livraison"), /ne réduisent en rien les garanties légales/);
  assert.doesNotMatch(article("livraison"), /réputés conformes|\[adresse email\]|meilleurs efforts/);
  // article 7 : quatorze jours maintenus pour les modèles standards, exclusion du seul sur-mesure
  const r = article("retractation");
  assert.match(r, /délai de quatorze jours pour exercer son droit de rétractation/);
  assert.match(r, /ne prive pas le Client de ce droit/);
  assert.match(r, /modèles standards/);
  assert.match(r, /création réellement personnalisée/);
  assert.match(r, /article L221-28, 3°/);
  assert.match(r, /à compter du jour où il est informé de la décision du Client de se rétracter/);
  assert.match(r, /Les frais de retour restent à la charge du Client\./);
  assert.doesNotMatch(r, /ne sont pas repris/);
  // article 8 : encadré des garanties légales (décret du 25 mars 2022), aucune limitation des droits
  const garanties = cgv.sections.find((s) => s.id === "garanties")!;
  assert.ok(garanties.blocs.some((b) => "encadre" in b && b.encadre.paragraphes.length >= 8));
  assert.match(article("garanties"), /L217-3 et suivants/);
  assert.doesNotMatch(article("garanties"), /L217-12|L217-16|limitée au remplacement/);
  // article 11 : médiateur à compléter, jamais inventé
  assert.match(article("droit"), /médiateur de la consommation/);
  assert.match(article("droit"), /L612-1/);
  assert.match(article("droit"), /\{\{mediateur\}\}/);
});

test("CGV : listes en vraies listes, aucune puce tapée dans le texte", () => {
  const listes = cgv.sections.flatMap((s) => s.blocs.filter((b): b is { liste: string[] } => "liste" in b));
  assert.deepEqual(
    listes.map((l) => l.liste.length),
    [2, 2, 7],
  );
  for (const t of texts(cgv.sections)) assert.doesNotMatch(t, /^\s*[-–—•]\s/, t);
});

test("CGV et mentions légales : typographie française (apostrophes, guillemets, espaces insécables)", () => {
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

test("marque déposée : le numéro INPI partout où la marque est dite déposée", () => {
  const pi = texts(ml.sections.find((s) => s.id === "propriete-intellectuelle")).join(" ");
  assert.match(pi, /marque déposée à l’INPI sous le numéro \{\{marque\}\}/);
  assert.match(texts(mlEn.sections.find((s) => s.id === "propriete-intellectuelle")).join(" "), /INPI.*\{\{marque\}\}/);
  assert.match(texts(legalPages["propriete-intellectuelle"]).join(" "), /déposée à l’INPI sous le numéro \{\{marque\}\}/);
  // aucune autre page ne dit « marque déposée » sans son numéro
  for (const t of [...texts(cgv), ...texts(legalPages), ...texts(ml)]) if (/marque déposée|est déposée/.test(t)) assert.match(t, /\{\{marque\}\}/, t.slice(0, 80));
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
  for (const k of ["siege", "mediateur", "creditsPhotos"] as const) assert.equal(legalFields[k].value, "", k);
  // réponses de la créatrice du 12/11 : marque déposée à l'INPI, code APE et franchise confirmés
  assert.equal(legalFields.marque.value, "5225836");
  assert.match(legalFields.marque.label, /INPI/);
  assert.doesNotMatch(legalFields.activite.label, /vérifier|peut-être/);
  assert.doesNotMatch(legalFields.tva.label, /vérifier/);
  assert.match(legalFields.tva.label, /85 000 €/);
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
