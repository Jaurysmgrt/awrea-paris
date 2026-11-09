/**
 * Les personnes de l'Atelier (Réglages, demande de la créatrice du 09/11) : la propriétaire ajoute une
 * personne avec son code à six chiffres ; la personne entre une première fois avec son code
 * d'invitation (une seule fois), choisit son mot de passe et son propre code ; elle ne peut ni ajouter
 * ni retirer ; retirée, elle ne passe plus, sessions comprises ; chaque geste prévient la propriétaire.
 */
import { expect, test, type Page } from "@playwright/test";
import { adminLogin, ATELIER, nouveauCode, totpAt } from "./admin-auth";
import { outbox } from "./helpers";

const MOT_DE_PASSE = "Une veste ivoire pour les essais";

async function connexion(page: Page, email: string, motDePasse: string) {
  await page.goto(ATELIER);
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/connexion`));
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Continuer" }).click();
}

test("ajouter une personne, son invitation à usage unique, ses droits, puis la retirer", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const email = `lea.${Date.now()}@exemple.fr`;

  // la propriétaire, dans les Réglages
  await adminLogin(page);
  await page.goto(`${ATELIER}/reglages#personnes`);
  const ajout = page.locator("form").filter({ has: page.getByRole("heading", { name: "Ajouter une personne" }) });
  await expect(ajout).toBeVisible();

  // un code faux ne suffit pas
  await ajout.getByLabel("Son adresse e-mail").fill(email);
  await ajout.getByLabel("Votre code à six chiffres").fill("000000");
  await ajout.getByRole("button", { name: "Ajouter cette personne" }).click();
  await expect(ajout.locator(".field__error")).toContainText("Code incorrect");

  // le bon code : l'invitation s'affiche une fois
  await ajout.getByLabel("Votre code à six chiffres").fill(await nouveauCode(page));
  await ajout.getByRole("button", { name: "Ajouter cette personne" }).click();
  const carte = page.locator(".invitation");
  await expect(carte).toContainText(email);
  const invitation = ((await carte.locator(".invitation__code").textContent()) ?? "").trim();
  expect(invitation).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  // l'adresse donnée est celle où la propriétaire se trouve
  await expect(carte).toContainText(`${new URL(page.url()).host}${ATELIER}`);
  await expect(page.getByRole("row", { name: new RegExp(email.replace(/\./g, "\\.")) })).toContainText("Invitation valable");
  await expect.poll(() => outbox().some((m) => m.subject === "Personne ajoutée à l’Atelier" && !m.text.includes(invitation))).toBeTruthy();

  // la personne, sur son propre appareil : son code d'invitation à la place du mot de passe
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem("awrea-atelier-faceid", "1"));
  const elle = await ctx.newPage();
  // le mot de passe d'installation ne lui ouvre rien
  await connexion(elle, email, "atelier-demo");
  await expect(elle.getByText("Adresse ou mot de passe incorrect.")).toBeVisible();
  await connexion(elle, email, invitation.toLowerCase());
  await elle.getByLabel("Nouveau mot de passe").fill(MOT_DE_PASSE);
  await elle.getByLabel("Le même, une seconde fois").fill(MOT_DE_PASSE);
  await elle.getByRole("button", { name: "Enregistrer et continuer" }).click();
  const cle = ((await elle.locator(".totp-secret").textContent()) ?? "").replace(/\s/g, "");
  expect(cle.length).toBeGreaterThan(10);
  await elle.getByLabel("Code à six chiffres").fill(totpAt(cle, Math.floor(Date.now() / 30000)));
  await elle.getByRole("button", { name: "Activer et entrer" }).click();
  await expect(elle.locator(".recovery-codes li")).toHaveCount(8);
  await elle.getByRole("button", { name: /J’ai noté mes codes/ }).click();
  await expect(elle.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();

  // l'invitation ne sert qu'une fois
  const autre = await browser.newContext();
  const intruse = await autre.newPage();
  await connexion(intruse, email, invitation);
  await expect(intruse.getByText("Adresse ou mot de passe incorrect.")).toBeVisible();
  await autre.close();

  // elle ne gère pas les personnes : ni formulaire, ni route
  await elle.goto(`${ATELIER}/reglages#personnes`);
  await expect(elle.getByText("Seule la propriétaire de l’Atelier")).toBeVisible();
  await expect(elle.getByRole("heading", { name: "Ajouter une personne" })).toHaveCount(0);
  const refus = await elle.request.post(`${ATELIER}/api/personnes`, { data: { action: "ajouter", email: "autre@exemple.fr", code: "123456" } });
  expect(refus.status()).toBe(403);

  // la propriétaire la retire : son code, puis plus rien ne s'ouvre pour elle
  await page.reload();
  const ligne = page.getByRole("row", { name: new RegExp(email.replace(/\./g, "\\.")) });
  await ligne.getByRole("button", { name: "Retirer" }).click();
  await ligne.getByLabel("Votre code à six chiffres").fill(await nouveauCode(page));
  await ligne.getByRole("button", { name: "Retirer cette personne" }).click();
  await expect(page.getByRole("row", { name: new RegExp(email.replace(/\./g, "\\.")) })).toHaveCount(0);
  await expect.poll(() => outbox().some((m) => m.subject === "Personne retirée de l’Atelier")).toBeTruthy();

  await elle.goto(ATELIER);
  await expect(elle).toHaveURL(new RegExp(`${ATELIER}/connexion`));
  await connexion(elle, email, MOT_DE_PASSE);
  await expect(elle.getByText("Adresse ou mot de passe incorrect.")).toBeVisible();
  await ctx.close();
});
