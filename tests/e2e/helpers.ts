import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { CONSENT_COOKIE, encodeConsent } from "../../lib/consent";

/**
 * Pose le cookie de consentement (tout refusé) pour que le bandeau ne gêne pas les tests (il est testé à
 * part). La fenêtre « Profitez de votre privilège » est aussi notée déjà vue, pour qu'elle ne s'ouvre
 * pas au milieu d'un parcours (elle est testée à part, avec `{ privilege: true }`).
 */
export async function acceptCookies(page: Page, o: { privilege?: boolean } = {}) {
  const base = test_base();
  const value = encodeConsent({ id: "e2etests01", analytics: false, personalization: false, advertising: false, date: Date.now(), policy: "2026-10" });
  await page.context().addCookies([{ name: CONSENT_COOKIE, value, url: base }]);
  if (!o.privilege)
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem("awrea_privilege")) localStorage.setItem("awrea_privilege", JSON.stringify({ vu: new Date().toISOString() }));
      } catch {
        /* stockage indisponible */
      }
    });
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

/**
 * Adresse IP propre à un appel : les inscriptions à la lettre sont limitées par adresse IP (8 par
 * 10 minutes en production, inchangé) ; toute la suite part du même poste, chaque inscription d'un
 * parcours a donc la sienne.
 */
export const ipUnique = () => ({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });

/** Inscription à la lettre par l'API, depuis une adresse IP propre au parcours. */
export function inscrire(page: Page, data: Record<string, unknown>) {
  return page.request.post("/api/newsletter", { data, headers: ipUnique() });
}

/** Lien d'un e-mail de la Maison reçu par cette adresse (le plus récent dont le sujet correspond), chemin et jeton. */
export async function lienRecu(email: string, sujet: RegExp): Promise<string> {
  for (let i = 0; i < 40; i++) {
    // la boîte d'envoi garde le plus récent en tête
    const mail = outbox().find((m) => m.to === email && sujet.test(m.subject));
    const lien = mail?.text.match(/https?:\/\/\S+?\/lettres\/confirmation\?jeton=[^\s)]+/)?.[0];
    if (lien) {
      const u = new URL(lien);
      return u.pathname + u.search;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun e-mail « ${sujet.source} » pour ${email}`);
}

/** Lien de l'e-mail « Confirmez votre inscription » reçu par cette adresse (le plus récent), chemin et jeton. */
export const lienDeConfirmation = (email: string) => lienRecu(email, /Confirmez votre inscription|Confirm your sign-up/);

/**
 * Confirme l'inscription à la lettre comme le bouton de la page ouverte depuis l'e-mail (le cookie
 * du privilège se pose dans le navigateur du parcours).
 */
export async function confirmerInscription(page: Page, email: string) {
  const jeton = new URL(await lienDeConfirmation(email), "http://x").searchParams.get("jeton");
  const r = await page.request.post("/api/newsletter/confirmation", { data: { jeton }, headers: ipUnique() });
  if (!r.ok()) throw new Error(`Confirmation refusée : ${await r.text()}`);
  return (await r.json()) as { ok: true; type: "lettre" | "appareil"; privilege: { expireLe: string } | null };
}

/** Page hydratée : les composants client ont monté leurs effets (components/layout/HydrationMark.tsx). */
export async function waitForHydration(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1", null, { timeout: 30_000 });
}
