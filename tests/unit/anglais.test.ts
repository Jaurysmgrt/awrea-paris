/** Version anglaise du site (/en) : adresses, traductions des fiches, formats, noms de pièces. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalizable, localizeHref, localizePath, splitLocale, stripLocale, switchLocale } from "@/lib/i18n/routing";
import { translateCollection, translatePiece, translatePieces } from "@/lib/commerce/translations";
import { formatDate, formatPrice } from "@/lib/format";
import { fill } from "@/lib/edition/fill";
import { parisDate } from "@/components/drops/regles";
import { products } from "@/data/demo/products";
import { collections } from "@/data/demo/collections";

const NB = " ";

test("langue d'une adresse : /en et ses pages, le français partout ailleurs", () => {
  assert.deepEqual(splitLocale("/en"), { locale: "en", path: "/" });
  assert.deepEqual(splitLocale("/en/boutique/body-aura"), { locale: "en", path: "/boutique/body-aura" });
  assert.deepEqual(splitLocale("/boutique"), { locale: "fr", path: "/boutique" });
  // « /entretien » n'est pas une page anglaise
  assert.deepEqual(splitLocale("/entretien"), { locale: "fr", path: "/entretien" });
  assert.equal(stripLocale("/en/la-maison"), "/la-maison");
});

test("liens internes : préfixés sous /en, jamais l'API, l'Atelier, les fichiers ni les adresses externes", () => {
  assert.equal(localizePath("/", "en"), "/en");
  assert.equal(localizePath("/boutique", "en"), "/en/boutique");
  assert.equal(localizePath("/boutique?taille=S#pieces", "en"), "/en/boutique?taille=S#pieces");
  assert.equal(localizePath("/?q=1", "en"), "/en?q=1");
  assert.equal(localizePath("/en/boutique", "en"), "/en/boutique");
  for (const href of ["/api/factures/1", "/gestion", "/prive-abcdefabcdef12/commandes", "/media/img/aura-1.webp", "/llms.txt", "https://www.instagram.com/awrea.paris", "mailto:contact@awreaparis.com", "#contenu", "?q=robe", "//exemple.fr/x"]) {
    assert.equal(localizePath(href, "en"), href, href);
  }
  assert.equal(localizePath("/boutique", "fr"), "/boutique");
  assert.equal(isLocalizable("/cgv"), true);
  assert.deepEqual(localizeHref({ pathname: "/contact", query: { a: "1" } }, "en"), { pathname: "/en/contact", query: { a: "1" } });
});

test("même page dans l'autre langue (sélecteur, hreflang)", () => {
  assert.equal(switchLocale("/boutique", "en"), "/en/boutique");
  assert.equal(switchLocale("/en/boutique", "fr"), "/boutique");
  assert.equal(switchLocale("/en", "fr"), "/");
  assert.equal(switchLocale("/", "en"), "/en");
});

test("fiches traduites : les textes changent, jamais le prix, les tailles ni les photos ; repli sur le français", () => {
  const aura = products.find((p) => p.handle === "body-aura")!;
  const en = translatePiece(aura, { title: "The Aura bodysuit", description: ["One.", "Two."], images: ["The Aura bodysuit, worn"], seo: { title: "Aura" } });
  assert.equal(en.title, "The Aura bodysuit");
  assert.deepEqual(en.description, ["One.", "Two."]);
  assert.equal(en.images[0].alt, "The Aura bodysuit, worn");
  assert.equal(en.images[0].src, aura.images[0].src);
  assert.equal(en.price, aura.price);
  assert.deepEqual(en.variants, aura.variants);
  assert.equal(en.tagline, aura.tagline, "champ absent : texte français");
  assert.equal(en.seo.description, aura.seo.description);
  // champs vides : repli
  assert.equal(translatePiece(aura, { title: "  ", description: [] }).title, aura.title);
  assert.deepEqual(translatePiece(aura, { description: [] }).description, aura.description);
  // sans document : la liste telle quelle
  assert.equal(translatePieces(products, null), products);
  const lace = translateCollection(collections[0], { lead: "Delicacy, the power of gold." });
  assert.equal(lace.lead, "Delicacy, the power of gold.");
  assert.equal(lace.title, collections[0].title);
});

test("formats : euros et dates britanniques sous /en, français par défaut", () => {
  assert.equal(formatPrice(7000, "en"), "€70.00");
  assert.match(formatPrice(7000), /^70,00\s€$/u);
  assert.equal(formatDate("2026-09-06", "en"), "6 September 2026");
  assert.equal(formatDate("2026-09-06"), "6 septembre 2026");
  const NOW = Date.parse("2026-10-01T10:00:00Z");
  assert.deepEqual(parisDate("2026-10-16T12:30:00Z", NOW, "en"), { jour: `Friday 16${NB}October`, heure: `2.30${NB}pm` });
  assert.deepEqual(parisDate("2026-11-05T17:00:00Z", NOW, "en"), { jour: `Thursday 5${NB}November`, heure: `6${NB}pm` });
  assert.deepEqual(parisDate("2026-11-05T17:00:00Z", NOW), { jour: `jeudi 5${NB}novembre`, heure: `18${NB}h` });
});

test("nom de pièce anglais au milieu d'une phrase : l'article perd sa capitale", () => {
  assert.equal(fill("See {piece}", { piece: "The Aura bodysuit" }), "See the Aura bodysuit");
  assert.equal(fill("Size, {piece}", { piece: "The Aura bodysuit" }), "Size, the Aura bodysuit");
  assert.equal(fill("{piece} is in your bag.", { piece: "The Aura bodysuit" }), "The Aura bodysuit is in your bag.");
  assert.equal(fill("Done. {piece} is in your bag.", { piece: "The Aura bodysuit" }), "Done. The Aura bodysuit is in your bag.");
  assert.equal(fill("Voir {piece}", { piece: "Le body Aura" }), "Voir Le body Aura");
});

test("photos et vidéos : le fichier vient toujours du français, seule la description se traduit", async () => {
  const { withFallback } = await import("@/lib/edition/merge");
  const fr = { image: { src: "/media/img/nouvelle", alt: "Les sacs de la Maison", width: 1600, height: 2400 }, video: { src: "/media/video/atelier-1.mp4", poster: "/media/video/atelier-1.webp" }, titre: "Contact" };
  const en = { image: { src: "/media/img/ancienne", alt: "The Maison’s bags", width: 800, height: 1200, provisoire: true }, video: { src: "/media/video/autre.mp4", poster: "/x.webp" }, titre: "Contact us" };
  assert.deepEqual(withFallback(en, fr), {
    image: { src: "/media/img/nouvelle", alt: "The Maison’s bags", width: 1600, height: 2400 },
    video: { src: "/media/video/atelier-1.mp4", poster: "/media/video/atelier-1.webp" },
    titre: "Contact us",
  });
  // description anglaise vide : celle du français
  assert.deepEqual(withFallback({ image: { ...en.image, alt: " " } }, { image: fr.image }), { image: fr.image });
});
