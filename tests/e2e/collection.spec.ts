/**
 * Collection, toutes les pièces et fiche d'une pièce, d'après la maquette PAGE PRODUIT : grand titre
 * centré, texte officiel de la collection (data-officiel), colonne « Filtrer par » (Catégorie, Prix,
 * Taille, Collection) dont les choix vivent dans l'adresse, cartes des pièces ; sur téléphone, le
 * panneau des filtres s'ouvre avec le bouton « Filtrer ». Fiche : nom dans la police des textes, prix, pastille
 * « Nouveau », bloc « Créée pour vous » (délai de confection, lien vers les étapes), guide des tailles.
 *
 * L'agent Catalogue peut publier une pièce d'essai pendant les tests (gestion.spec.ts) : les
 * vérifications portent sur les pièces de la collection, jamais sur un total exact.
 */
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";
import boutique from "../../content/site/fr/boutique.json";
import collectionsTexts from "../../content/site/fr/collections.json";
import catalogue from "../../content/site/fr/catalogue.json";
import fiche from "../../content/site/fr/fiche-piece.json";
import { collections } from "../../data/demo/collections";

const f = boutique.filtres;
const plain = (s: string) => s.replace(/[\s ]+/g, " ").trim();
const ROBES = ["robe-odessa", "robe-aria", "robe-sienna"];
const MOINS_DE_100 = ["body-aura", "body-gaia", "top-evina", "top-kira"];
const card = (page: Page, handle: string) => page.locator(`main .product-card a[href="/boutique/${handle}"]`).first();
const filters = (page: Page) => page.getByRole("form", { name: f.titre });
const option = (page: Page, label: string) => filters(page).locator("label").filter({ hasText: new RegExp(`^${label}$`) });
const status = (page: Page) => page.locator("main").getByRole("status").filter({ hasText: /pièce/ });

async function open(page: Page, path: string) {
  await acceptCookies(page);
  await page.goto(path);
  await expect(page.locator("h1")).toHaveCount(1);
  await waitForHydration(page);
}

test.describe("Collection Hypnotic Lace (ordinateur)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("grand titre centré, texte officiel de la collection, filtres et sept cartes", async ({ page }) => {
    await open(page, "/collections/hypnotic-lace");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Collection");
    await expect(h1).toContainText("Hypnotic Lace");
    await expect(h1).toHaveCSS("text-align", "center");

    // TEXTE DE COLLECTION, mot pour mot et dans l'ordre, marqué comme texte officiel
    const c = collections[0];
    const official = plain((await page.locator("main [data-officiel]").allTextContents()).join(" "));
    let last = -1;
    for (const p of [c.lead, ...c.intention]) {
      const at = official.indexOf(plain(p));
      expect(at, p.slice(0, 40)).toBeGreaterThan(last);
      last = at;
    }

    // « Filtrer par » : quatre groupes séparés de filets, Catégorie ouverte sur « Tout »
    await expect(filters(page).getByRole("heading", { name: f.titre })).toBeVisible();
    for (const g of Object.values(f.groupes)) await expect(filters(page).locator("summary", { hasText: g })).toBeVisible();
    await expect(filters(page).getByRole("radio", { name: f.tout.categorie, exact: true })).toBeChecked();
    for (const label of [boutique.categories.robe, boutique.categories.body, boutique.categories.top]) await expect(option(page, label)).toBeVisible();

    for (const handle of [...ROBES, ...MOINS_DE_100]) await expect(card(page, handle)).toBeVisible();
    await expect(page.locator("main .product-card__badge").first()).toHaveText(catalogue.nouveau);
    await expect(page.locator("main .product-card__lead").first()).toContainText(/Sur demande, \d/);
    await expect(status(page)).toContainText(/\d+ pièces/);
    await expect(page.getByRole("button", { name: f.bouton, exact: true })).toBeHidden();
  });

  test("les filtres vivent dans l'adresse : catégorie, taille, partage, effacement", async ({ page }) => {
    await open(page, "/collections/hypnotic-lace");
    await option(page, boutique.categories.robe).click();
    await expect(page).toHaveURL(/\/collections\/hypnotic-lace\?categorie=robe$/);
    await expect(filters(page).getByRole("radio", { name: boutique.categories.robe, exact: true })).toBeChecked();
    for (const handle of ROBES) await expect(card(page, handle)).toBeVisible();
    await expect(page.locator('main .product-card a[href^="/boutique/body-"], main .product-card a[href^="/boutique/top-"]')).toHaveCount(0);
    await expect(status(page)).toHaveText(/^\d+ pièces$/);

    // Taille : groupe fermé, ouvert d'un clic ; le choix s'ajoute à l'adresse
    await filters(page).locator("summary", { hasText: f.groupes.taille }).click();
    await option(page, "M").click();
    await expect(page).toHaveURL(/categorie=robe&taille=M$/);

    // l'adresse se partage : la page filtrée est rendue telle quelle par le serveur
    await page.goto("/collections/hypnotic-lace?categorie=robe&taille=M");
    await expect(filters(page).getByRole("radio", { name: boutique.categories.robe, exact: true })).toBeChecked();
    await expect(filters(page).getByRole("radio", { name: "M", exact: true })).toBeChecked();
    for (const handle of ROBES) await expect(card(page, handle)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await waitForHydration(page);
    await page.getByRole("link", { name: f.effacer }).click();
    await expect(page).toHaveURL(/\/collections\/hypnotic-lace$/);
    for (const handle of MOINS_DE_100) await expect(card(page, handle)).toBeVisible();
  });

  test("prix, choix au clavier, aucun résultat, valeur inconnue ignorée", async ({ page }) => {
    await open(page, "/collections/hypnotic-lace?prix=moins-de-100");
    for (const handle of MOINS_DE_100) await expect(card(page, handle)).toBeVisible();
    for (const handle of ROBES) await expect(card(page, handle)).toHaveCount(0);

    // au clavier : les flèches parcourent les choix d'un groupe et l'appliquent
    const tout = filters(page).getByRole("radio", { name: f.tout.categorie, exact: true });
    await tout.focus();
    await page.keyboard.press("ArrowDown");
    await expect(filters(page).getByRole("radio", { name: boutique.categories.robe, exact: true })).toBeChecked();
    await expect(page).toHaveURL(/categorie=robe/);

    // robes à moins de 100 € : aucune ; un message et le lien pour tout revoir
    await expect(page.getByText(boutique.vide.texte)).toBeVisible();
    await expect(status(page)).toHaveText(f.resultats.aucune);
    await page.getByRole("link", { name: boutique.vide.lien }).click();
    await expect(page).toHaveURL(/\/collections\/hypnotic-lace$/);
    for (const handle of ROBES) await expect(card(page, handle)).toBeVisible();

    await page.goto("/collections/hypnotic-lace?categorie=inconnue&taille=XXL&prix=gratuit");
    for (const handle of [...ROBES, ...MOINS_DE_100]) await expect(card(page, handle)).toBeVisible();
    await expect(filters(page).getByRole("radio", { name: f.tout.categorie, exact: true })).toBeChecked();
  });

  test("le filtre Collection mène à toutes les pièces, avec la même sélection", async ({ page }) => {
    await open(page, "/collections/hypnotic-lace?categorie=body");
    await filters(page).locator("summary", { hasText: f.groupes.collection }).click();
    await option(page, f.tout.collection).click();
    await expect(page).toHaveURL(/\/boutique\?categorie=body$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(boutique.titre);
    await expect(card(page, "body-aura")).toBeVisible();
    await expect(card(page, "robe-odessa")).toHaveCount(0);
  });

  test("toutes les pièces : même langage, filtre Collection", async ({ page }) => {
    await open(page, "/boutique");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(boutique.titre);
    await filters(page).locator("summary", { hasText: f.groupes.collection }).click();
    await option(page, "Hypnotic Lace").click();
    await expect(page).toHaveURL(/\/boutique\?collection=hypnotic-lace$/);
    for (const handle of [...ROBES, ...MOINS_DE_100]) await expect(card(page, handle)).toBeVisible();
  });

  test("la page des collections : titre, accroche officielle, lien vers la collection", async ({ page }) => {
    await open(page, "/collections");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(collectionsTexts.titre);
    await expect(page.locator("main [data-officiel]").first()).toContainText(plain(collections[0].lead));
    await page.getByRole("link", { name: plain(collectionsTexts.voir.replace("{collection}", "Hypnotic Lace")) }).click();
    await expect(page).toHaveURL(/\/collections\/hypnotic-lace$/);
  });
});

test.describe("Collection sur téléphone", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test("les filtres passent dans un panneau ouvert par « Filtrer », en tête de liste", async ({ page }) => {
    await open(page, "/collections/hypnotic-lace");
    const toggle = page.getByRole("button", { name: f.bouton, exact: true });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(filters(page)).toBeHidden();
    await expect(card(page, "body-aura")).toBeVisible();

    await toggle.click();
    await expect(filters(page)).toBeVisible();
    await option(page, boutique.categories.body).click();
    await expect(page).toHaveURL(/categorie=body$/);
    const active = page.getByRole("button", { name: f.boutonActifs.replace("{n}", "1") });
    await expect(active).toHaveAttribute("aria-expanded", "true");

    await filters(page).getByRole("button", { name: f.fermer }).click();
    await expect(filters(page)).toBeHidden();
    await expect(active).toBeFocused();
    await expect(card(page, "body-aura")).toBeVisible();
    await expect(card(page, "robe-odessa")).toHaveCount(0);
  });
});

test.describe("Fiche d'une pièce", () => {
  // cahier de la créatrice du 23/11 : la pièce faite pour vous, expliquée sans quitter la fiche
  test("bloc « Créée pour vous » : sous le bouton, trois repères, le délai de confection, le lien vers les étapes", async ({ page }) => {
    await open(page, "/boutique/robe-aria");
    const main = page.locator("main");
    const bloc = main.locator("div", { has: page.getByRole("heading", { level: 2, name: fiche.pourVous.titre }) }).last();
    await expect(bloc.getByRole("heading", { level: 2, name: fiche.pourVous.titre })).toBeVisible();
    await expect(bloc.getByText(fiche.pourVous.texte)).toBeVisible();
    // trois repères, chacun avec sa petite icône au trait, décorative
    const points = bloc.locator("li");
    await expect(points).toHaveText(fiche.pourVous.points.map((p) => p.texte));
    for (const li of await points.all()) await expect(li.locator("svg[aria-hidden='true']")).toHaveCount(1);
    await expect(bloc.locator("[data-delai]")).toContainText(/Délai de confection\s:\s3\s+à\s+4\s+semaines/);
    // près du bouton : juste dessous, avant les rubriques
    const [actions, tete, rubriques] = await Promise.all([main.locator(".product-form__actions").boundingBox(), bloc.boundingBox(), main.locator(".product__details").boundingBox()]);
    expect(tete!.y).toBeGreaterThanOrEqual(actions!.y + actions!.height - 1);
    expect(tete!.y - (actions!.y + actions!.height)).toBeLessThan(80);
    expect(rubriques!.y).toBeGreaterThanOrEqual(tete!.y + tete!.height - 1);
    // le lien discret vers les étapes, une vraie cible au doigt (zone sensible de 44 px au moins)
    const lien = bloc.getByRole("link", { name: fiche.surDemande.lien });
    await expect(lien).toHaveAttribute("href", "/sur-commande#etapes");
    await lien.scrollIntoViewIfNeeded();
    const b = (await lien.boundingBox())!;
    for (const y of [b.y + b.height / 2 - 22, b.y + b.height / 2 + 22]) {
      expect(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("a[href='/sur-commande#etapes']")), [b.x + b.width / 2, y])).toBe(true);
    }
    await lien.click();
    await expect(page).toHaveURL(/\/sur-commande#etapes$/);
    await expect(page.locator("#etapes")).toBeInViewport();
    await expect(page.locator("#frise-etapes > li").first()).toBeVisible();
  });

  test("téléphone : le bloc reste compact, sans débordement, et la règle accompagne « Trouver ma taille »", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await open(page, "/boutique/body-aura");
    const bloc = page.locator("main div", { has: page.getByRole("heading", { level: 2, name: fiche.pourVous.titre }) }).last();
    expect((await bloc.boundingBox())!.height).toBeLessThan(420);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expect(page.locator("main").getByRole("button", { name: catalogue.taille.trouver }).first().locator("svg[aria-hidden='true']")).toHaveCount(1);
  });

  test("version anglaise : « Made for you », le lien reste dans la langue", async ({ browser }) => {
    // le site suit la langue de l'appareil : un appareil réglé en anglais
    const ctx = await browser.newContext({ locale: "en-GB", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await open(page, "/en/boutique/body-aura");
    const titre = page.getByRole("heading", { level: 2, name: "Made for you" });
    await expect(titre).toBeVisible();
    await expect(page.locator("main [data-delai]")).toHaveText(/^Making time: \d+ to \d+ weeks, before dispatch\.$/);
    await expect(page.locator("main").getByRole("link", { name: "See how your piece is made" })).toHaveAttribute("href", "/en/sur-commande#etapes");
    await ctx.close();
  });

  test("nom dans la police des textes, prix, pastille, délai, commande sur demande, guide des tailles, sans série ni stock", async ({ page }) => {
    await open(page, "/boutique/body-aura");
    const h1 = page.getByRole("heading", { level: 1, name: "Le body Aura" });
    await expect(h1).toBeVisible();
    // nom de la pièce dans la police des textes, comme sur la maquette (Avenir Next, Mulish là où elle manque) ; jamais Fraunces
    await expect(h1).toHaveCSS("font-family", /^"Avenir Next", Avenir, mulish, /);
    await expect(h1).toHaveCSS("font-style", "normal");
    const main = page.locator("main");
    await expect(main.locator(".product__price")).toHaveText(/^70,00\s€$/);
    await expect(main.locator(".badge", { hasText: catalogue.nouveau }).first()).toBeVisible();
    // fiche allégée (retour du 01/11 : « trop de texte, brouillon ») : la taille et le bouton, puis le
    // bloc « Créée pour vous » (cahier du 23/11) où le délai de confection est dit une seule fois,
    // jamais comme un délai total ; tout le reste dans des rubriques fermées
    await expect(main.locator("[data-delai]")).toHaveCount(1);
    await expect(main.locator("[data-delai]")).toHaveText(/^Délai de confection\s:\s\d+(\s+à\s+\d+)?\s+semaines?, avant l’expédition\.$/);
    await expect(main.getByText(/délai de fabrication/i)).toHaveCount(0);
    await expect(main.getByText(catalogue.surDemande.ethique)).toHaveCount(0);
    await expect(main.locator(".product__details details[open]")).toHaveCount(0);
    const fabrication = main.locator("details", { has: page.locator("summary", { hasText: catalogue.fabrication.titre }) });
    await fabrication.locator("summary").click();
    await expect(fabrication.getByText(catalogue.fabrication.certificatTexte)).toBeVisible();
    // « Coupe et taille » retirée (cahier du 10/11) : trois rubriques seulement, et la coupe, le guide
    // complet et le rendez-vous de conseil dans la fenêtre du guide des tailles, à côté des tailles
    await expect(main.locator("details summary", { hasText: /Coupe et taille/ })).toHaveCount(0);
    await expect(main.locator("details summary", { hasText: fiche.sections.piece }).first()).toBeVisible();
    await expect(main.locator("details summary", { hasText: fiche.sections.matieres }).first()).toBeVisible();
    await main.getByRole("button", { name: catalogue.taille.trouver }).first().click();
    const guide = page.getByRole("dialog", { name: catalogue.taille.guideTitre });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("link", { name: fiche.mesures.lien })).toHaveAttribute("href", "/guide-des-tailles");
    await expect(guide.getByRole("link", { name: fiche.conseil.lien })).toHaveAttribute("href", "/rendez-vous");
    await page.keyboard.press("Escape");
    await expect(main.getByText(catalogue.visuelProvisoire).first()).toBeVisible();

    // photos aux angles arrondis, comme les cartes de la collection
    const radius = await main.locator(".gallery .media").first().evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius).toBeGreaterThan(0);

    // plus de numéro d'édition, de série ni de stock
    await expect(main.getByText(/N° \d+ \/ \d+|édition limitée|série numérotée|pièces? restantes?|en stock|épuisée?|liste d’attente/i)).toHaveCount(0);

    // livraison et retours : ce que disent les CGV officielles, aucune promesse de livraison offerte
    await main.locator("summary", { hasText: fiche.sections.livraison }).click();
    await expect(main.getByText(plain(fiche.livraison), { exact: false })).toBeVisible();
    await expect(main.getByText(/livraison offerte/i)).toHaveCount(0);
    await expect(main.locator(".atelier-note")).toHaveCount(0);
  });
});
