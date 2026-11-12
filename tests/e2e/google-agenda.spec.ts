/**
 * Google Agenda (connexion directe OAuth 2.0, lib/google-agenda) : le serveur de test n'a pas les
 * clés Google. Rien ne se connecte, l'Atelier le dit et renvoie au guide, l'abonnement iCal reste ;
 * les routes de la connexion sont introuvables hors de l'Atelier et refusées d'une autre origine ;
 * la page de retour de Google ne fait rien sans session.
 */
import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";
import { adminLogin, ATELIER } from "./admin-auth";

test("hors de l'Atelier : routes de Google Agenda introuvables, page de retour sans effet", async ({ page, request }) => {
  expect((await request.post("/api/gestion/agenda-google", { data: { action: "connecter" } })).status()).toBe(404);
  expect((await request.post(`${ATELIER}/api/agenda-google`, { data: { action: "connecter" } })).status()).toBe(404);
  expect((await request.post(`${ATELIER}/api/agenda-google`, { data: { action: "terminer", code: "4/faux", state: "faux.faux" } })).status()).toBe(404);
  expect((await request.get("/gestion/agenda-google?code=x&state=y", { maxRedirects: 0 })).status()).toBe(404);

  // l'adresse de retour s'ouvre (Google y renvoie sans le cookie de l'Atelier), sans être indexée
  const reponse = await page.goto(`${ATELIER}/agenda-google?code=4%2Ffaux&state=faux.faux`);
  expect(reponse!.headers()["x-robots-tag"]).toContain("noindex");
  await waitForHydration(page);
  // elle se recharge une fois, puis, sans session, demande seulement de se connecter
  await expect(page).toHaveURL(/relance=1/);
  await expect(page.getByRole("status")).toContainText("Votre session de l’Atelier est fermée");
  await expect(page.getByRole("link", { name: "Se connecter à l’Atelier" })).toHaveAttribute("href", new RegExp(`${ATELIER}/connexion`));

  // refus chez Google : rien n'a changé
  await page.goto(`${ATELIER}/agenda-google?error=access_denied&state=faux.faux`);
  await waitForHydration(page);
  await expect(page.getByRole("status")).toContainText(/Connexion annulée chez Google/);
});

test("sans les clés Google : « pas encore branchée », renvoi au guide, abonnement iCal intact, rien ne se connecte", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/rendez-vous`);
  const google = page.locator("section", { has: page.getByRole("heading", { name: "Google Agenda" }) });
  await expect(google).toContainText(/pas encore branchée/);
  await expect(google).toContainText(/guide d’activation/);
  await expect(google.getByRole("button", { name: /Connecter Google Agenda/ })).toHaveCount(0);
  // l'adresse de retour à déclarer chez Google, à l'adresse secrète de l'Atelier
  await expect(google.locator("code")).toContainText(`${ATELIER}/agenda-google`);
  // l'abonnement iCal existant reste là
  await expect(page.getByRole("button", { name: "Copier l’adresse de l’agenda" })).toBeVisible();
  // aucune pastille de synchronisation tant que rien n'est connecté
  await expect(page.locator("main").getByText("Synchronisé", { exact: true })).toHaveCount(0);

  // la route de l'Atelier refuse de commencer une connexion sans clés
  const connecter = await page.request.post(`${ATELIER}/api/agenda-google`, { data: { action: "connecter" } });
  expect(connecter.status()).toBe(409);
  expect((await connecter.json()).error).toMatch(/pas encore branchée/);
  expect((await page.request.post(`${ATELIER}/api/agenda-google`, { data: { action: "reessayer" } })).status()).toBe(409);
  // demande illisible
  expect((await page.request.post(`${ATELIER}/api/agenda-google`, { data: { action: "inconnue" } })).status()).toBe(400);
  // une autre origine ne peut rien, même avec la session de la créatrice
  expect((await page.request.post(`${ATELIER}/api/agenda-google`, { data: { action: "connecter" }, headers: { Origin: "https://pirate.exemple" } })).status()).toBe(403);

  // retour de Google simulé, session ouverte : rien ne se connecte sans les clés
  await page.goto(`${ATELIER}/agenda-google?code=4%2Ffaux&state=faux.faux`);
  await waitForHydration(page);
  // le site a aussi l'annonceur de changement de page de Next (role alert, vide) : on vise le message
  await expect(page.getByRole("alert").filter({ hasText: /pas encore branchée/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Revenir aux rendez-vous" })).toHaveAttribute("href", `${ATELIER}/rendez-vous`);
});
