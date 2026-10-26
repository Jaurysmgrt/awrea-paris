/**
 * Prise de rendez-vous : la cliente choisit le rendez-vous, le jour et l'heure, reçoit la
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prendre rendez-vous");
  await page.getByLabel(/Appel vidéo avec la créatrice/).check();
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
