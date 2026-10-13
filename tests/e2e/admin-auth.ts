/**
 * Connexion à l'Atelier pour les tests : mot de passe + double authentification.
 * À la première connexion, l'enrôlement est fait comme le ferait la créatrice (lecture de la clé,
 * code calculé comme le ferait l'application d'authentification) ; la clé est gardée pour la suite.
 * Les codes déjà utilisés étant refusés, on attend au besoin la période de 30 s suivante.
 */
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const SECRET_FILE = path.join(__dirname, "..", "..", ".data", "e2e-totp.txt");
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
  await page.goto("/gestion");
  await expect(page).toHaveURL(/\/gestion\/connexion/);
  await page.getByLabel("Mot de passe").fill(process.env.E2E_ATELIER_PASSWORD ?? "atelier-demo");
  await page.getByRole("button", { name: "Continuer" }).click();
  const enroll = page.locator(".totp-secret");
  const totpField = page.getByLabel("Code de l’application d’authentification");
  await expect(enroll.or(totpField)).toBeVisible();
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
  }
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();
}
