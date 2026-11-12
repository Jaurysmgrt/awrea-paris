/**
 * Atelier › éditeur d'e-mails façon Brevo (retour du 10/11 : « écrire, mettre une photo, la décaler
 * à droite, à gauche, en bas, choisir la typo ») : un clic dans l'e-mail choisit un bloc ; police,
 * taille, alignement et espaces se règlent et se voient aussitôt ; annuler, rétablir ; un bloc
 * « Photo et texte » reçoit une photo et passe la photo à droite ; un lien s'insère dans un texte ;
 * le brouillon tient après un rechargement ; rien n'est publié (brouillon abandonné à la fin).
 */
import path from "node:path";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

const DOC = "email-commande-expediee";
const TITRE = "b-cmdexpe02";
const TEXTE = "b-cmdexpe03";

const apercu = (page: Page): FrameLocator => page.frameLocator("iframe[title^='Aperçu de l’e-mail']");
const style = (page: Page, sel: string) => apercu(page).locator(sel).first().getAttribute("style");

test("éditeur d'e-mails : choisir dans l'aperçu, régler, annuler, photo et texte, lien, brouillon", async ({ page }) => {
  test.setTimeout(180_000);
  await adminLogin(page);
  await page.goto(`${ATELIER}/e-mails/${DOC}`);
  const panneau = page.getByRole("complementary", { name: "Modifier l’e-mail" });

  // un clic sur le titre, dans l'e-mail, l'ouvre dans « Réglages »
  await apercu(page).locator(`tbody[data-bloc='${TITRE}'] h1`).click();
  await expect(panneau.getByRole("button", { name: "Réglages", pressed: true })).toBeVisible();
  await expect(panneau.getByRole("group", { name: "Actions sur le bloc" })).toBeVisible();
  await expect(panneau.getByLabel("Titre", { exact: true })).toHaveValue("Votre pièce est en route");
  await expect(apercu(page).locator(`tbody[data-bloc='${TITRE}'][data-choisi]`)).toHaveCount(1);

  // allure d'origine, comme les grands titres du site (12/11) : Fraunces droite fine, 40 px, centré
  await expect(panneau.getByRole("radio", { name: /Fraunces droite/ })).toBeChecked();
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] h1`)).toMatch(/font-style:normal;font-weight:300;font-size:40px.*text-align:center/);

  // police, taille, alignement : chaque réglage se voit dans l'e-mail (l'italique reste au choix)
  await panneau.getByRole("radio", { name: /Fraunces italique/ }).check();
  await panneau.getByRole("group", { name: "Taille" }).getByRole("button", { name: "Grande" }).click();
  await panneau.getByRole("group", { name: "Alignement" }).getByRole("button", { name: "À gauche" }).click();
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] h1`)).toMatch(/font-style:italic;font-weight:400;font-size:48px.*text-align:left/);

  // espace au-dessous : sur la grille de 8 px
  await panneau.getByLabel("Espace au-dessous").fill("64");
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] td`)).toMatch(/padding:0px 48px 64px/);

  // annuler, rétablir
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] td`)).toMatch(/padding:0px 48px 32px/);
  await page.getByRole("button", { name: "Rétablir" }).click();
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] td`)).toMatch(/padding:0px 48px 64px/);

  // un bloc « Photo et texte » s'ajoute sous le bloc choisi, reçoit une photo, la passe à droite
  await panneau.getByRole("button", { name: "Blocs" }).click();
  await panneau.getByRole("list", { name: "Bibliothèque de blocs" }).getByRole("button", { name: /Photo et texte/ }).click();
  await expect(panneau.getByText("Photo et texte", { exact: true }).first()).toBeVisible();
  const nouveau = apercu(page).locator(`tbody[data-bloc='${TITRE}'] + tbody[data-bloc]`);
  await expect(nouveau.locator("[data-champ='image']")).toBeVisible();
  await panneau.locator("input[type=file]").setInputFiles(path.join(__dirname, "fixture-piece.jpg"));
  await expect(nouveau.locator("img[data-champ='image']")).toBeVisible({ timeout: 30_000 });
  await panneau.getByLabel("Texte", { exact: true }).fill("La dentelle se pose à la main.");
  await panneau.getByRole("group", { name: "Place de la photo" }).getByRole("button", { name: "À droite du texte" }).click();
  await expect(nouveau.locator("table[dir='rtl']")).toHaveCount(1);
  await expect(nouveau).toContainText("La dentelle se pose à la main.");

  // un lien dans un texte : choisi dans l'e-mail, inséré avec l'outil « Ajouter un lien »
  await apercu(page).locator(`tbody[data-bloc='${TEXTE}'] p`).first().click();
  const texte = panneau.getByLabel("Texte", { exact: true });
  await texte.press("End");
  await texte.press("Control+End");
  await panneau.getByRole("button", { name: "Ajouter un lien" }).click();
  await panneau.getByLabel("Mots du lien").fill("la boutique");
  await panneau.getByLabel("Adresse").fill("javascript:alert(1)");
  await expect(panneau.getByRole("button", { name: "Insérer le lien" })).toBeDisabled();
  await panneau.getByLabel("Adresse").fill("/boutique");
  await panneau.getByRole("button", { name: "Insérer le lien" }).click();
  await expect(apercu(page).locator(`tbody[data-bloc='${TEXTE}'] a`, { hasText: "la boutique" })).toHaveAttribute("href", /\/boutique$/);
  await expect(panneau.getByRole("list", { name: "Liens du texte" })).toContainText("la boutique");

  // le brouillon s'enregistre tout seul et tient après un rechargement ; rien n'est publié
  await expect(page.getByRole("status").filter({ hasText: "Brouillon enregistré" })).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(apercu(page).locator(`tbody[data-bloc='${TITRE}'] + tbody[data-bloc] table[dir='rtl']`)).toHaveCount(1);
  await expect.poll(() => style(page, `tbody[data-bloc='${TITRE}'] h1`)).toMatch(/font-size:48px/);

  // le brouillon est abandonné : la version en service reste celle d'origine
  const abandon = await page.request.post(`${ATELIER}/api/edition/brouillon`, { data: { doc: DOC, locale: "fr", abandon: true } });
  expect(abandon.ok()).toBeTruthy();
});
