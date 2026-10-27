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
