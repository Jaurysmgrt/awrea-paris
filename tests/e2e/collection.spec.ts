/**
 * Collection, toutes les pièces et fiche d'une pièce, d'après la maquette PAGE PRODUIT : grand titre
 * centré, texte officiel de la collection (data-officiel), colonne « Filtrer par » (Catégorie, Prix,
 * Taille, Collection) dont les choix vivent dans l'adresse, cartes des pièces ; sur téléphone, le
 * panneau des filtres s'ouvre avec le bouton « Filtrer ». Fiche : nom en Cormorant, prix, pastille
 * « Nouveau », délai de fabrication, liens vers la commande sur demande et le guide des tailles.
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
  test("nom en Cormorant, prix, pastille, délai, commande sur demande, guide des tailles, sans série ni stock", async ({ page }) => {
    await open(page, "/boutique/body-aura");
    const h1 = page.getByRole("heading", { level: 1, name: "Le body Aura" });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCSS("font-family", /cormorant/i);
    await expect(h1).toHaveCSS("font-style", "normal");
    const main = page.locator("main");
    await expect(main.locator(".product__price")).toHaveText(/^70,00\s€$/);
    await expect(main.locator(".badge", { hasText: catalogue.nouveau }).first()).toBeVisible();
    await expect(main.getByText(/^Sur demande, \d+( à \d+)? semaines?$/).first()).toBeVisible();
    await expect(page.locator(".product-form__made")).toContainText(catalogue.surDemande.delaiLabel);
    await expect(main.getByRole("link", { name: fiche.surDemande.lien })).toHaveAttribute("href", "/sur-commande");
    await expect(main.getByRole("link", { name: fiche.surDemande.guide })).toHaveAttribute("href", "/guide-des-tailles");
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
