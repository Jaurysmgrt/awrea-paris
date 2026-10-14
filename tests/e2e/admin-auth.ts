/**
 * Connexion à l'Atelier pour les tests : adresse secrète, compte autorisé, mot de passe, double
 * authentification. À la première connexion, le compte est créé comme le ferait la créatrice
 * (mot de passe d'installation, mot de passe personnel, lecture de la clé, code calculé comme le
 * ferait l'application d'authentification) ; la clé est gardée pour la suite.
 * Les codes déjà utilisés étant refusés, on attend au besoin la période de 30 s suivante.
 */
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const SECRET_FILE = path.join(__dirname, "..", "..", ".data", "e2e-totp.txt");

/** adresse secrète de l'Atelier pendant les tests (playwright.config.ts la donne au serveur) */
export const ATELIER = process.env.E2E_ADMIN_PATH ?? "/prive-e2e0atelier0test";
export const ATELIER_EMAIL = process.env.E2E_ATELIER_EMAIL ?? "contact@awreaparis.com";
/** mot de passe d'installation, puis mot de passe personnel du compte de test */
export const SETUP_PASSWORD = process.env.E2E_ATELIER_PASSWORD ?? "atelier-demo";
export const PERSONAL_PASSWORD = process.env.E2E_ATELIER_PERSONAL ?? "Une robe noire pour les tests";
let lastCounter = -1;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of input.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpAt(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

async function freshCode(page: Page, secret: string): Promise<string> {
  let counter = Math.floor(Date.now() / 30000);
  if (counter <= lastCounter) {
    await page.waitForTimeout((lastCounter + 1) * 30000 - Date.now() + 500);
    counter = Math.floor(Date.now() / 30000);
  }
  lastCounter = counter;
  return totpAt(secret, counter);
}

export async function adminLogin(page: Page) {
  await page.goto(ATELIER);
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/connexion`));
  await page.getByLabel("Adresse e-mail").fill(ATELIER_EMAIL);
  await page.getByLabel("Mot de passe").fill(PERSONAL_PASSWORD);
  await page.getByRole("button", { name: "Continuer" }).click();
  const setup = page.getByLabel("Nouveau mot de passe");
  const enroll = page.locator(".totp-secret");
  const totpField = page.getByLabel("Code de l’application d’authentification");
  const refusedPassword = page.getByText("Adresse ou mot de passe incorrect.");
  await expect(setup.or(enroll).or(totpField).or(refusedPassword)).toBeVisible();
  if (await refusedPassword.isVisible()) {
    // compte encore jamais configuré : mot de passe d'installation, puis mot de passe personnel
    await page.getByLabel("Mot de passe").fill(SETUP_PASSWORD);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(setup).toBeVisible();
  }
  if (await setup.isVisible()) {
    await setup.fill(PERSONAL_PASSWORD);
    await page.getByLabel("Le même, une seconde fois").fill(PERSONAL_PASSWORD);
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
    await expect(enroll).toBeVisible();
  }
  if (await enroll.isVisible()) {
    const secret = (await enroll.textContent())!.replace(/\s/g, "");
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret);
    await page.getByLabel("Code à six chiffres").fill(await freshCode(page, secret));
    await page.getByRole("button", { name: "Activer et entrer" }).click();
    await expect(page.locator(".recovery-codes li")).toHaveCount(8);
    await page.getByRole("button", { name: /J’ai noté mes codes/ }).click();
  } else {
    const secret = process.env.ATELIER_TOTP_SECRET ?? fs.readFileSync(SECRET_FILE, "utf8").trim();
    await totpField.fill(await freshCode(page, secret));
    await page.getByRole("button", { name: "Entrer" }).click();
    // un code déjà utilisé dans cette période de 30 s (par une autre série de tests) est refusé,
    // comme il se doit : on attend la période suivante, comme le ferait la créatrice
    const home = page.getByRole("heading", { level: 1, name: "Bonjour." });
    const refused = page.getByText("Code incorrect ou déjà utilisé.");
    await expect(home.or(refused)).toBeVisible();
    if (await refused.isVisible()) {
      lastCounter = Math.max(lastCounter, Math.floor(Date.now() / 30000));
      await totpField.fill(await freshCode(page, secret));
      await page.getByRole("button", { name: "Entrer" }).click();
    }
  }
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();
}
