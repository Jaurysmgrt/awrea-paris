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

  // retour du 01/11 : « quand on arrive, je veux voir le logo, que ça donne envie ; trop de blanc en haut »
  test("accueil : dès l'arrivée, le logo, le titre et une pièce en grand, sans grand blanc en haut", async ({ page }) => {
    const [sienna] = accueil.ouverture.photos;
    const logo = page.getByRole("link", { name: "Awrea Paris, page d’accueil" });
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 390, height: 664 },
    ]) {
      await page.setViewportSize(vp);
      await open(page, "/");
      const phone = vp.width < 768;
      // le logo entier, en grand, en haut de l'écran (téléphone compris), et un seul lien vers l'accueil
      await expect(logo).toHaveCount(1);
      const l = (await logo.boundingBox())!;
      expect(l.y).toBeLessThan(vp.height * 0.1);
      expect(l.height).toBeGreaterThanOrEqual(80);
      // la première pièce, en grand, commence juste sous la navigation et occupe l'écran
      const photo = (await page.getByRole("img", { name: sienna.image.alt }).boundingBox())!;
      expect(photo.y).toBeLessThan(phone ? 240 : 280);
      expect(Math.min(photo.y + photo.height, vp.height) - photo.y).toBeGreaterThan(vp.height * 0.4);
      // sur ordinateur, le titre est à l'écran avec elle
      if (!phone) {
        const h1 = (await page.locator("h1").boundingBox())!;
        expect(h1.y + h1.height).toBeLessThan(vp.height);
      }
    }
    // la photo entière mène à la pièce (le lien de son nom s'étend sur elle)
    const p = (await page.getByRole("img", { name: sienna.image.alt }).boundingBox())!;
    await page.mouse.click(p.x + p.width / 2, p.y + p.height / 2);
    await expect(page).toHaveURL(new RegExp(`${sienna.href}$`));
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

  // animations de l'accueil (01/11) : tout ce qui attend sous l'écran finit par apparaître
  test("accueil : titres, blocs et photos apparaissent au défilement, et jamais en animations apaisées", async ({ page, browser }) => {
    await open(page, "/");
    const enAttente = page.locator("main [data-pending]");
    expect(await enAttente.count()).toBeGreaterThan(0);
    for (const id of ["accueil-collection", "accueil-pieces", "accueil-sur-demande", "accueil-lettre"]) {
      const titre = page.locator(`#${id}`);
      await titre.scrollIntoViewIfNeeded();
      await expect(titre).toHaveAttribute("data-shown", "");
      await expect.poll(() => titre.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      await expect.poll(() => titre.evaluate((el) => getComputedStyle(el).clipPath)).toBe("none");
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(enAttente).toHaveCount(0);

    const calme = await browser.newContext({ reducedMotion: "reduce", locale: "fr-FR" });
    const p = await calme.newPage();
    await acceptCookies(p);
    await p.goto("/");
    await expect(p.locator("h1")).toHaveCount(1);
    await expect(p.locator("main [data-pending]")).toHaveCount(0);
    await calme.close();
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

  test("la commande sur demande : les étapes, les délais du catalogue, le suivi et le rendez-vous", async ({ page }) => {
    await open(page, "/sur-commande");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(surCommande.titre);
    const etapes = page.locator("main ol li h3");
    await expect(etapes).toHaveText([surCommande.etapes.choix.titre, "Commande reçue", "En confection", "Prête", "Expédiée", "Livrée"]);
    await expect(page.locator("main dl dd")).toHaveCount(2);
    for (const dd of await page.locator("main dl dd").all()) await expect(dd).toHaveText(/\d+(\s| )(à(\s| )\d+(\s| ))?semaines?/);
    await expect(page.locator('main a[href="/suivi"]')).toBeVisible();
    await expect(page.locator('main a[href="/rendez-vous"]')).toBeVisible();
    expect(await officialText(page)).toContain(plain(surCommande.ethique.citation.texte));
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
