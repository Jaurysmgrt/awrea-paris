/**
 * Prise de rendez-vous : la cliente ouvre la réservation par le bouton « Prendre rendez-vous »
 * (dossier du 02/11), choisit le rendez-vous, le jour et l'heure, reçoit la
 * confirmation avec un lien d'annulation signé, et peut annuler. Un lien falsifié ne fait rien.
 */
import { expect, test } from "@playwright/test";
import { acceptCookies, outbox, waitForHydration } from "./helpers";

test("réserver puis annuler un appel vidéo", async ({ page, request }) => {
  test.setTimeout(120_000);
  const email = `rdv.${Date.now().toString(36)}@exemple.fr`;
  await page.goto("/rendez-vous");
  await acceptCookies(page);
  await waitForHydration(page);
  // la page : une photo, le titre, un seul bouton ; la réservation s'ouvre derrière lui
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Une pièce exclusive à votre demande.");
  await expect(page.locator("main form")).toHaveCount(0);
  await page.getByRole("button", { name: "Prendre rendez-vous" }).click();
  await expect(page.getByLabel(/Appel vidéo avec la créatrice/)).toBeFocused();
  // le rendez-vous se choisit en touchant sa pastille
  await page.locator(".booking__choix label", { hasText: "Appel vidéo avec la créatrice" }).click();
  await expect(page.getByLabel(/Appel vidéo avec la créatrice/)).toBeChecked();
  const firstDay = page.locator(".booking__chips").first().getByRole("button").first();
  await expect(firstDay).toBeVisible();
  await firstDay.click();
  const firstSlot = page.locator(".booking__chips").nth(1).getByRole("button").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();
  const form = page.locator("main form");
  await form.getByLabel("Nom").fill("Camille Essai");
  await form.getByLabel("E-mail", { exact: true }).fill(email);
  await form.getByLabel(/J’accepte que mes coordonnées/).check();
  await form.getByRole("button", { name: "Réserver ce moment" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("C’est noté");

  // la confirmation est partie, avec son lien d'annulation signé
  await expect.poll(() => outbox().some((m) => m.to === email), { timeout: 15_000 }).toBeTruthy();
  const mail = outbox().find((m) => m.to === email)!;
  // tous les rendez-vous se font en appel vidéo : le lien est dans la confirmation
  expect(mail.text).toMatch(/https:\/\/meet\.jit\.si\/AwreaParis-/);
  const link = mail.text.match(/https?:\/\/\S+\/rendez-vous\/annuler\?id=(RDV-[A-F0-9]{8})&jeton=([\w-]+)/);
  expect(link, mail.text).toBeTruthy();
  const [, id, jeton] = link!;

  // un jeton falsifié ne fait rien
  expect((await request.post("/api/rendez-vous/annuler", { data: { id, jeton: "faux" } })).status()).toBe(400);

  await page.goto(`/rendez-vous/annuler?id=${id}&jeton=${jeton}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: "Annuler le rendez-vous" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("C’est annulé");
  expect((await request.post("/api/rendez-vous/annuler", { data: { id, jeton } })).status()).toBe(404);
});

test("un lien qui choisit le rendez-vous ouvre la réservation ; la section reste noire en mode Nuit, bouton ivoire", async ({ page }) => {
  await acceptCookies(page);
  await page.goto("/rendez-vous?type=sur-mesure");
  await waitForHydration(page);
  await expect(page.getByLabel(/Premier rendez-vous sur mesure/)).toBeChecked();
  await expect(page.getByRole("button", { name: "Prendre rendez-vous" })).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/rendez-vous");
  await waitForHydration(page);
  for (const mode of ["light", "dark"]) {
    await page.evaluate((m) => (document.documentElement.dataset.mode = m), mode);
    const couleurs = () =>
      page.evaluate(() => {
        const section = document.querySelector("main > .scene")!;
        const bouton = document.querySelector("main .btn--capsule")!;
        return { fond: getComputedStyle(section).backgroundColor, bouton: getComputedStyle(bouton).backgroundColor, texte: getComputedStyle(bouton).color };
      });
    await expect.poll(couleurs, { message: mode }).toEqual({ fond: "rgb(10, 10, 10)", bouton: "rgb(247, 246, 243)", texte: "rgb(10, 10, 10)" });
  }
});
