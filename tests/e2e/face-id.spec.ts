/**
 * Connexion à l'Atelier par Face ID ou l'empreinte (clés d'accès, lib/auth/passkeys.ts), avec un
 * authentificateur virtuel de Chromium qui joue le rôle du téléphone : ajout juste après le code,
 * entrée d'un geste, alerte par e-mail, retrait dans les Réglages, puis refus d'une clé retirée ou
 * d'une réponse fabriquée.
 */
import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";
import { outbox } from "./helpers";

test("Face ID : ajouter cet appareil, entrer d'un geste, retirer", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "authentificateur virtuel de Chromium");
  test.setTimeout(180_000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });

  // après le code, l'Atelier propose Face ID sur cet appareil
  await adminLogin(page, { faceId: "ajouter" });
  await expect.poll(() => outbox().some((m) => m.subject === "Face ID ajouté à l’Atelier")).toBeTruthy();
  await page.goto(`${ATELIER}/reglages`);
  const section = page.locator("#face-id");
  await expect(section.locator(".faceid-cle")).toHaveCount(1);

  // la session fermée, un geste suffit
  await page.context().clearCookies();
  await page.goto(ATELIER);
  await page.getByRole("button", { name: "Entrer avec Face ID ou l’empreinte" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();

  // une réponse fabriquée, ou sans défi, n'ouvre rien
  const fausse = { id: "AAAA", rawId: "AAAA", type: "public-key", response: { clientDataJSON: "AAAA", authenticatorData: "AAAA", signature: "AAAA" }, clientExtensionResults: {} };
  expect((await page.request.post(`${ATELIER}/api/login/passkey`, { data: fausse })).status()).toBe(401);
  await page.request.post(`${ATELIER}/api/login/passkey/options`);
  expect((await page.request.post(`${ATELIER}/api/login/passkey`, { data: fausse })).status()).toBe(401);
  // ajouter une clé demande une session ouverte
  const visiteuse = await page.context().browser()!.newContext();
  const base = page.url().split(ATELIER)[0];
  expect((await visiteuse.request.post(`${base}${ATELIER}/api/securite/passkey/options`)).status()).not.toBe(200);
  await visiteuse.close();

  // retirée dans les Réglages, la clé n'ouvre plus l'Atelier
  await page.goto(`${ATELIER}/reglages`);
  page.once("dialog", (d) => d.accept());
  await section.getByRole("button", { name: "Retirer" }).click();
  await expect(section.locator(".faceid-cle")).toHaveCount(0);
  await page.context().clearCookies();
  await page.goto(ATELIER);
  await page.getByRole("button", { name: "Entrer avec Face ID ou l’empreinte" }).click();
  await expect(page.locator(".field__error")).toContainText("Cette clé n’ouvre pas l’Atelier");
});
