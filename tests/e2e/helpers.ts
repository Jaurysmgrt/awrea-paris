import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { CONSENT_COOKIE, encodeConsent } from "../../lib/consent";

/** Pose le cookie de consentement (tout refusé) pour que le bandeau ne gêne pas les tests (il est testé à part). */
export async function acceptCookies(page: Page) {
  const base = test_base();
  const value = encodeConsent({ id: "e2etests01", analytics: false, personalization: false, advertising: false, date: Date.now(), policy: "2026-10" });
  await page.context().addCookies([{ name: CONSENT_COOKIE, value, url: base }]);
}

export function test_base() {
  return process.env.BASE_URL ?? "http://localhost:3100";
}

export const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "tablette-768", width: 768, height: 1024 },
  { name: "tablette-1024", width: 1024, height: 768 },
  { name: "portable-1280", width: 1280, height: 800 },
  { name: "ecran-1440", width: 1440, height: 900 },
  { name: "grand-1920", width: 1920, height: 1080 },
];

/** Crée un compte cliente (mode démonstration : le code de connexion s'affiche à l'écran). */
export async function signUp(page: Page, email: string) {
  await page.goto("/compte");
  await page.getByRole("radio", { name: "Créer un compte" }).click();
  await page.locator("#login-email").fill(email);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  const code = (await page.locator(".notice strong").textContent())!.trim();
  await page.getByLabel("Code reçu par e-mail").fill(code);
  await page.getByRole("button", { name: "Valider" }).click();
  await page.getByRole("heading", { name: /Bonjour/ }).waitFor();
}

/** Stockage du serveur de test (mode démonstration) : même fichier que lib/store (STORE_FILE). */
export function readStore(): Record<string, unknown> {
  const file = process.env.STORE_FILE ? path.resolve(process.env.STORE_FILE) : path.join(process.cwd(), ".data", "store.json");
  // le serveur peut être en train d'écrire (ancien serveur sans écriture atomique) : on relit
  for (let i = 0; ; i++) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      if (i >= 20) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

/** Boîte d'envoi simulée du mode démonstration. */
export function outbox(): { to: string; subject: string; text: string }[] {
  return (readStore()["email:outbox"] as { to: string; subject: string; text: string }[] | undefined) ?? [];
}

/** Page hydratée : les composants client ont monté leurs effets (raccourcis clavier, équilibreur). */
export async function waitForHydration(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.documentElement.dataset.justification !== undefined, null, { timeout: 30_000 });
}
