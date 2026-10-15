/**
 * Éditeur visuel « Édition » : une page créée depuis un modèle reste invisible du public tant
 * qu'elle n'est pas publiée ; un texte se change sur la page ; « Publier » la met en ligne ;
 * l'historique la ramène à la version précédente. Le fichier créé par la publication (mode
 * « fichiers ») est effacé à la fin.
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { adminLogin, ATELIER } from "./admin-auth";

const slug = `essai-${Date.now().toString(36)}`;
const file = path.join(__dirname, "..", "..", "content", "site", "fr", `evenement-${slug}.json`);

test.describe("Éditeur visuel", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(() => fs.rmSync(file, { force: true }));

  test("invisible du public, sans session de l'Atelier", async ({ request }) => {
    // sans session, l'API de l'éditeur n'existe pas, et le mode Édition ne s'ouvre pas
    expect((await request.get(`${ATELIER}/api/edition/entrer?chemin=/`)).status()).toBe(404);
    expect((await request.post(`${ATELIER}/api/edition/publier`, { data: { docs: ["accueil"] } })).status()).toBe(404);
    expect((await request.get("/gestion/api/edition/entrer")).status()).toBe(404);
  });

  test("page d’événement : brouillon, modification sur place, publication, retour en arrière", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await adminLogin(page);

    await page.goto(`${ATELIER}/pages`);
    await page.getByLabel("Page d’événement").check();
    await page.getByLabel("Titre").fill("Essai du pop-up");
    await page.getByLabel("Adresse").fill(slug);
    await page.getByRole("button", { name: "Créer la page en brouillon" }).click();
    await expect(page).toHaveURL(new RegExp(`/evenements/${slug}$`));

    const guide = page.getByRole("dialog", { name: "Guide de l’édition" });
    const dock = page.getByRole("region", { name: "Édition de la page" });
    await expect(dock.or(guide).first()).toBeVisible();
    if (await guide.isVisible()) await guide.getByRole("button", { name: "Passer le guide" }).click();
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("status")).toContainText("pas encore en ligne");

    // le public ne voit rien tant que la page n'est pas publiée
    const visitor = await browser.newContext();
    const pub = await visitor.newPage();
    expect((await pub.goto(`/evenements/${slug}`))?.status()).toBe(404);

    // un clic sur le titre ouvre son panneau
    await page.locator("h1 [aria-hidden='true']").click();
    const panel = page.getByRole("dialog", { name: /Modifier/ });
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox", { name: "Titre" }).fill("Pop-up de la rue Charlot");
    await panel.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pop-up de la rue Charlot");

    // tant qu'un texte reste entre crochets, la page ne part pas
    await dock.getByRole("button", { name: "Publier" }).click();
    await expect(dock.getByRole("alert")).toContainText("texte(s) à écrire");
  });

  test("publication puis retour à la version précédente (par l'API de l'éditeur)", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await adminLogin(page);
    const api = (p: string) => `${ATELIER}/api/edition${p}`;
    const doc = `evenement-${slug}`;
    const read = async () => (await (await page.request.get(`${api("/documents")}?ids=${doc}`)).json()).docs[doc].locales.fr;

    // remplir les textes à écrire, comme le ferait la créatrice
    const draft = (await read()).draft as Record<string, unknown>;
    const fill = async (p: string, value: string) => expect((await page.request.post(api("/brouillon"), { data: { doc, locale: "fr", path: p, value } })).ok()).toBeTruthy();
    for (const [p, v] of Object.entries({ chapeau: "Deux jours pour essayer les pièces de la saison.", date: "Samedi et dimanche, de 11 h à 19 h", lieu: "Rue Charlot, Paris", "seo.description": "Le pop-up de la Maison, rue Charlot." })) await fill(p, v);
    const sections = draft.sections as Record<string, unknown>[];
    for (let i = sections.length - 1; i >= 0; i--) await page.request.post(api("/blocs"), { data: { doc, path: "sections", op: "supprimer", index: i } });
    expect((await page.request.post(api("/publier"), { data: { docs: [doc] } })).ok()).toBeTruthy();

    const visitor = await browser.newContext();
    const pub = await visitor.newPage();
    await pub.goto(`/evenements/${slug}`);
    await expect(pub.getByRole("heading", { level: 1 })).toContainText("Pop-up de la rue Charlot");
    await expect(pub.getByText("Rue Charlot, Paris")).toBeVisible();

    // deuxième version, puis retour à la première en un clic
    await fill("lieu", "Rue de Turenne, Paris");
    expect((await page.request.post(api("/publier"), { data: { docs: [doc] } })).ok()).toBeTruthy();
    await pub.reload();
    await expect(pub.getByText("Rue de Turenne, Paris")).toBeVisible();
    const versions = (await (await page.request.get(`${api("/historique")}?doc=${doc}&locale=fr`)).json()).versions as { id: string }[];
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect((await page.request.post(api("/historique"), { data: { doc, locale: "fr", version: versions[1].id } })).ok()).toBeTruthy();
    await pub.reload();
    await expect(pub.getByText("Rue Charlot, Paris")).toBeVisible();

    // suppression de la page : elle disparaît du site, de la liste et de l'historique
    expect((await page.request.post(api("/pages/supprimer"), { data: { id: doc } })).ok()).toBeTruthy();
    expect((await pub.goto(`/evenements/${slug}`))?.status()).toBe(404);
    expect(fs.existsSync(file)).toBeFalsy();
    // une page du site, elle, ne se supprime pas
    expect((await page.request.post(api("/pages/supprimer"), { data: { id: "accueil" } })).status()).toBe(400);
    await visitor.close();
  });
});
