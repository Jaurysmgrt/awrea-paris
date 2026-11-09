/**
 * Pages de la Maison : les textes officiels de la créatrice repris mot pour mot et marqués
 * data-officiel (TEASING MARQUE et TEXTE DE COLLECTION sur l'accueil, À PROPOS en entier sur La
 * Maison, phrases du teasing sur L'Atelier), un seul h1 par page, les deux nouvelles pages (la
 * commande sur demande, le guide des tailles) et le formulaire de contact de la maquette.
 */
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, outbox, waitForHydration } from "./helpers";
import accueil from "../../content/site/fr/accueil.json";
import laMaison from "../../content/site/fr/la-maison.json";
import atelier from "../../content/site/fr/atelier.json";
import surCommande from "../../content/site/fr/sur-commande.json";
import { shop } from "../../content/settings";

/** Texte comparable : espaces insécables et retours à la ligne ramenés à une espace simple, coupures
 * de mots posées par la justification (U+00AD, components/ui/Justification.tsx) retirées. */
const plain = (s: string) => s.replace(/\u00ad/g, "").replace(/[\s\u00a0\u202f]+/g, " ").trim();

/** Tout le texte des éléments marqués comme textes officiels de la créatrice. */
async function officialText(page: Page) {
  return plain((await page.locator("main [data-officiel]").allTextContents()).join(" "));
}

async function open(page: Page, path: string) {
  await acceptCookies(page);
  await page.goto(path);
  await expect(page.locator("h1")).toHaveCount(1);
}

test.describe("Pages de la Maison", () => {
  test("accueil : présentation et collection officielles, sélection de pièces, création sur demande", async ({ page }) => {
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(accueil.maison.texte.titre);
    const official = await officialText(page);
    const t = accueil.maison.texte;
    for (const part of [t.accroche, t.paragraphe, ...t.chute]) expect(official).toContain(plain(part));
    // texte de collection officiel, dans l'ordre
    const c = accueil.collection.texte;
    expect(official).toContain(plain(c.accroche));
    const first = official.indexOf(plain(c.paragraphes[0]));
    expect(first).toBeGreaterThan(-1);
    expect(official.indexOf(plain(c.paragraphes[1]))).toBeGreaterThan(first);
    // un lien vers la collection, les pièces, la commande sur demande
    const main = page.locator("main");
    await expect(main.locator('a[href="/collections/hypnotic-lace"]').first()).toBeVisible();
    await expect(main.locator('a[href="/sur-commande"]').first()).toBeVisible();
    await expect(main.locator(".product-card").first()).toBeVisible();
    await expect(main.getByText(/visuel provisoire/i).first()).toBeVisible();
    await expect(main.getByText(/semaines/).first()).toBeVisible();
    // plus de séries, d'éditions numérotées ni de collections inventées
    await expect(main.getByText(/Lace is more|Lumière d’or|numérotée|édition limitée|pièces restantes/i)).toHaveCount(0);
  });

  // réponses de la créatrice du 01/11 : un film plein écran dès le haut, le logo et le menu posés dessus
  // en blanc, rien d'écrit sur l'image (inspiration Dior) ; plus d'aspect catalogue
  test("accueil : dès l'arrivée, le film plein écran, le logo et le menu en blanc posés dessus", async ({ page }) => {
    const logo = page.getByRole("link", { name: "Awrea Paris, page d’accueil" });
    const ivoire = "rgb(247, 246, 243)";
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 390, height: 664 },
    ]) {
      await page.setViewportSize(vp);
      await open(page, "/");
      // le film part du haut de la page et remplit l'écran
      const film = (await page.locator("main [data-film]").boundingBox())!;
      expect(Math.abs(film.y)).toBeLessThan(1);
      expect(film.height).toBeGreaterThanOrEqual(vp.height - 1);
      await expect(page.locator("main [data-film] video")).toHaveAttribute("aria-label", accueil.ouverture.videoLabel);
      // rien d'écrit sur le film : ni titre ni lien
      await expect(page.locator("main [data-film]").getByRole("heading")).toHaveCount(0);
      await expect(page.locator("main [data-film]").getByRole("link")).toHaveCount(0);
      // le film se met en pause (WCAG 2.2.2)
      await expect(page.locator("main [data-film]").getByRole("button", { name: /une femme de dos/ })).toBeVisible();
      // le logo entier, en grand, en haut, et le menu, en blanc sur le film
      await expect(logo).toHaveCount(1);
      const l = (await logo.boundingBox())!;
      expect(l.y).toBeLessThan(vp.height * 0.1);
      expect(l.height).toBeGreaterThanOrEqual(80);
      await expect.poll(() => page.locator(".site-header").evaluate((el) => getComputedStyle(el).color)).toBe(ivoire);
      // l'histoire de la Maison commence sous le film
      const h1 = (await page.locator("h1").boundingBox())!;
      expect(h1.y).toBeGreaterThan(vp.height - 1);
    }
    // en quittant le film, l'en-tête devient la bande habituelle, à fond plein et texte noir
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2));
    await expect(page.locator(".site-header")).toHaveAttribute("data-compact", "true");
    await expect.poll(() => page.locator(".site-header").evaluate((el) => getComputedStyle(el).color)).not.toBe(ivoire);
  });

  test("accueil sur téléphone : le petit logo de la bande revient une fois le grand sorti de l'écran", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await open(page, "/");
    const logo = page.getByRole("link", { name: "Awrea Paris, page d’accueil" });
    await expect(page.locator(".site-header")).toHaveAttribute("data-compact", "false");
    await page.mouse.wheel(0, 600);
    await expect(page.locator(".site-header")).toHaveAttribute("data-compact", "true");
    // le grand logo, sorti de l'écran, devient inerte ; celui de la bande reste en haut
    await expect(page.locator(".site-header__top")).toHaveAttribute("inert", "");
    await expect(page.locator(".site-header__mark")).toBeInViewport();
    // ailleurs, la bande seule, comme avant
    await page.goto("/contact");
    await expect(page.locator(".site-header")).toHaveAttribute("data-accueil", "false");
    expect((await logo.boundingBox())!.height).toBeLessThan(80);
  });

  // animations au strict minimum (01/11 : « kitsch, vu et revu ») : rien n'attend sous l'écran pour
  // apparaître ; seule la sortie du film d'ouverture reste (ordinateur, à la souris)
  test("accueil : rien n'apparaît ni ne monte au défilement, seule la sortie du film reste", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator("[data-pending], [data-reveal], .reveal-img")).toHaveCount(0);
    for (const id of ["accueil-collection", "accueil-pieces", "accueil-sur-demande", "accueil-lettre"]) {
      const titre = page.locator(`#${id}`);
      await titre.scrollIntoViewIfNeeded();
      await expect(titre).toHaveCSS("opacity", "1");
      await expect(titre).toHaveCSS("transform", "none");
    }
    // plus de fond qui glisse d'une couleur à l'autre : chaque section garde la sienne
    await expect(page.locator("html.scene-live")).toHaveCount(0);
    await expect(page.locator("main section", { has: page.locator("#accueil-collection") })).toHaveCSS("background-color", "rgb(10, 10, 10)");
    // la sortie du film : il s'assombrit en quittant l'écran
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight / 2)));
    await expect.poll(() => page.locator("[data-film]").evaluate((el) => Number(el.style.getPropertyValue("--sortie")))).toBeGreaterThan(0);
  });

  test("La Maison : le texte À propos en entier, dans l'ordre, avec le portrait de la créatrice", async ({ page }) => {
    await open(page, "/la-maison");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(laMaison.apropos.titre[0]);
    const official = await officialText(page);
    expect(official).toContain(plain(laMaison.apropos.titre.join(" ")));
    let last = -1;
    for (const p of laMaison.apropos.paragraphes) {
      const at = official.indexOf(plain(p));
      expect(at, p.slice(0, 40)).toBeGreaterThan(last);
      last = at;
    }
    await expect(page.locator('main img[src*="creatrice-portrait"]')).toBeVisible();
    await expect(page.locator("main figcaption")).toContainText("[À COMPLÉTER");
  });

  test("L'Atelier : les phrases officielles du teasing, sans fait inventé", async ({ page }) => {
    await open(page, "/atelier");
    const official = await officialText(page);
    for (const chapitre of atelier.chapitres) expect(official).toContain(plain(chapitre.citation.texte));
    await expect(page.locator("main h2")).toHaveCount(atelier.chapitres.length + 1);
    await expect(page.locator("main").getByText(/numéro d’édition|fait main à Paris|atelier parisien/i)).toHaveCount(0);
  });

  test("étapes de confection : le chapeau centré, la chronologie, le temps de la création et les trois espaces", async ({ page }) => {
    await open(page, "/sur-commande");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(surCommande.titre);
    // le chapeau, centré sur l'axe du titre, jamais au fer à gauche (dossier du 02/11), 650 px au plus
    const chapeau = page.locator(".page-head__lead");
    await expect(chapeau).toHaveCSS("text-align", "center");
    const [titre, texte] = await Promise.all([page.getByRole("heading", { level: 1 }).boundingBox(), chapeau.boundingBox()]);
    expect(Math.abs(titre!.x + titre!.width / 2 - (texte!.x + texte!.width / 2))).toBeLessThan(2);
    expect(texte!.width).toBeLessThanOrEqual(650);
    await expect(page.locator("main .eyebrow").first()).toHaveText(surCommande.etapes.surtitre);
    await expect(page.getByRole("heading", { level: 2, name: "Le parcours d’une création singulière" })).toBeVisible();
    // la chronologie : cinq étapes (brief du 09/11), chacune son nom, sa phrase, son texte mot pour
    // mot et sa photographie
    const etapes = page.locator("#frise-etapes > li");
    await expect(etapes).toHaveCount(5);
    await expect(etapes.locator("h3")).toHaveText(surCommande.etapes.frise.map((e) => e.titre));
    await expect(etapes.locator(".t-label")).toHaveText(surCommande.etapes.frise.map((e) => e.nom));
    for (const [i, e] of surCommande.etapes.frise.entries()) {
      await expect(etapes.nth(i).locator("p.t-note")).toHaveText(e.texte);
      await expect(etapes.nth(i).locator("img")).toHaveAttribute("alt", e.image.alt);
    }
    // le temps de la création : deux familles, leur délai lu dans le catalogue, tout centré
    await expect(page.getByRole("heading", { level: 2, name: surCommande.delais.titre })).toBeVisible();
    const delais = page.locator("main dl dd.t-h3");
    await expect(delais).toHaveCount(2);
    for (const dd of await delais.all()) {
      await expect(dd).toHaveText(/\d+(\s| )(à(\s| )\d+(\s| ))?semaines?/);
      await expect(dd).toHaveCSS("text-align", "center");
    }
    await expect(page.locator("main dl dt")).toHaveText(Object.values(surCommande.delais.groupes));
    await expect(page.locator('main a[href="/cgv"]')).toHaveText(surCommande.delais.fin.lien.label);
    // l'engagement, le suivi et le conseil : leurs destinations de toujours
    for (const e of surCommande.espaces.liste) await expect(page.locator(`main a[href="${e.lien.href}"]`, { hasText: e.lien.label })).toBeVisible();
  });

  test("guide des tailles : le tableau des réglages et le chemin vers « Trouver ma taille »", async ({ page }) => {
    await open(page, "/guide-des-tailles");
    const rows = page.locator("main table tbody tr");
    await expect(rows).toHaveCount(shop.sizeGuide.rows.length);
    for (const [i, r] of shop.sizeGuide.rows.entries()) await expect(rows.nth(i).locator("th")).toHaveText(r[0]);
    await expect(page.locator("main").getByText(/à confirmer par la Maison/i)).toHaveCount(shop.sizeGuide.confirme ? 0 : 1);
    await expect(page.locator("main").getByRole("link", { name: /Trouver ma taille/ })).toBeVisible();
  });

  test("contact : la maquette, les champs obligatoires, l'envoi et l'accusé de réception", async ({ page, request }) => {
    // l'API refuse un message sans prénom (validation Zod)
    expect((await request.post("/api/contact", { data: { kind: "contact", email: "sans.prenom@exemple.fr" } })).status()).toBe(400);

    await open(page, "/contact");
    await waitForHydration(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Contact");
    await expect(page.locator('main img[src*="contact-sacs"]')).toBeVisible();
    const form = page.locator("main form");
    // étiquettes de la maquette (l'astérisque des champs obligatoires est masqué aux lecteurs d'écran,
    // qui annoncent l'attribut required)
    const champ = (label: string) => form.getByLabel(new RegExp(`^${label}`));
    for (const label of ["Prénom", "Nom", "E-mail", "Adresse", "Téléphone", "Informations complémentaires"]) await expect(champ(label)).toBeVisible();
    await expect(champ("Prénom")).toHaveAttribute("required", "");
    await expect(champ("E-mail")).toHaveAttribute("required", "");

    // envoi à vide : le manque est dit par écrit et le curseur revient au prénom
    const submit = form.getByRole("button", { name: "Envoyer mon message" });
    await submit.click();
    await expect(form.getByText("Indiquez votre prénom.")).toBeVisible();
    await expect(champ("Prénom")).toBeFocused();
    await expect(champ("Prénom")).toHaveAttribute("aria-invalid", "true");

    const email = `contact.${Date.now().toString(36)}@exemple.fr`;
    await champ("Prénom").fill("Camille");
    await champ("Nom").fill("Essai");
    await champ("E-mail").fill(email);
    await champ("Téléphone").fill("06 00 00 00 00");
    await champ("Informations complémentaires").fill("Une question sur la taille de la robe Odessa.");
    await submit.click();
    await expect(page.locator("main").getByRole("status")).toContainText("Merci Camille");
    await expect.poll(() => outbox().some((m) => m.to === email), { timeout: 15_000 }).toBeTruthy();

    // les coordonnées réelles de la Maison, à côté du formulaire
    await expect(page.locator('main a[href="mailto:awrea.contact@gmail.com"]')).toBeVisible();
    await expect(page.locator('main a[href="tel:+33699557443"]')).toBeVisible();
  });
});

test.describe("chronologie des étapes de confection", () => {
  test("ordinateur : une chronologie verticale, le texte à gauche et la photographie à droite", async ({ page, isMobile }) => {
    test.skip(isMobile, "mise en page de l'ordinateur");
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/sur-commande");
    const etapes = page.locator("#frise-etapes > li");
    await etapes.first().scrollIntoViewIfNeeded();
    const boites = await etapes.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    // de haut en bas, sans chevauchement, alignées sur la même ligne
    for (let i = 1; i < boites.length; i++) {
      expect(boites[i].top).toBeGreaterThanOrEqual(boites[i - 1].bottom);
      expect(Math.abs(boites[i].left - boites[0].left)).toBeLessThan(2);
    }
    const premiere = etapes.first();
    const [texte, photo] = await Promise.all([premiere.locator("h3").boundingBox(), premiere.locator("img").boundingBox()]);
    expect(photo!.x).toBeGreaterThan(texte!.x + texte!.width - 1);
    // photographies en noir et blanc
    await expect(premiere.locator("img")).toHaveCSS("filter", "grayscale(1)");
  });

  test("téléphone : chronologie verticale, étapes empilées, sans débordement", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/sur-commande");
    const etapes = page.locator("#frise-etapes > li");
    const boites = await etapes.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    for (let i = 1; i < boites.length; i++) expect(boites[i].top).toBeGreaterThanOrEqual(boites[i - 1].bottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("animations apaisées : tout est visible d'emblée", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "/sur-commande");
    await expect(page.locator("#frise-etapes")).not.toHaveAttribute("data-anime", /.*/);
    await expect(page.locator("#frise-etapes > li").last()).toHaveCSS("opacity", "1");
  });
});

test.describe("l'engagement, le suivi et le conseil", () => {
  test("ordinateur : trois colonnes côte à côte, séparées de filets ; aucun point de carrousel", async ({ page, isMobile }) => {
    test.skip(isMobile, "mise en page de l'ordinateur");
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/sur-commande");
    const espaces = page.locator("main ul[aria-label] > li");
    await expect(espaces).toHaveCount(3);
    const boites = await espaces.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    for (let i = 1; i < 3; i++) {
      expect(Math.abs(boites[i].top - boites[0].top)).toBeLessThan(2);
      expect(boites[i].left).toBeGreaterThanOrEqual(boites[i - 1].right - 1);
    }
    await expect(espaces.nth(1)).toHaveCSS("border-left-style", "solid");
    await expect(page.getByRole("button", { name: /Aller à l’espace/ }).first()).toBeHidden();
  });

  test("téléphone : un carrousel horizontal, trois points discrets, sans débordement de la page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/sur-commande");
    await waitForHydration(page);
    const espaces = page.locator("main ul[aria-label] > li");
    const [premier, second] = await Promise.all([espaces.nth(0).boundingBox(), espaces.nth(1).boundingBox()]);
    expect(second!.x).toBeGreaterThan(premier!.x + premier!.width - 1);
    expect(Math.abs(second!.y - premier!.y)).toBeLessThan(2);
    const points = page.getByRole("button", { name: /Aller à l’espace/ });
    await expect(points).toHaveCount(3);
    await expect(points.first()).toHaveAttribute("aria-current", "true");
    await points.nth(2).click();
    await expect(points.nth(2)).toHaveAttribute("aria-current", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
