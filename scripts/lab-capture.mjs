#!/usr/bin/env node
/**
 * Captures des propositions de design (laboratoire) : pleine page, ordinateur 1440 px et mobile
 * 390 px, en JPEG, dans docs/design/<dossier>/.
 *   node scripts/lab-capture.mjs <dossier> <chemin> [<chemin>…]
 *   ex. node scripts/lab-capture.mjs da-dentelle /lab/da-dentelle /lab/da-dentelle/piece
 * Serveur : BASE_URL (par défaut http://localhost:3100).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [folder, ...paths] = process.argv.slice(2);
if (!folder || !paths.length) {
  console.error("usage : node scripts/lab-capture.mjs <dossier> <chemin>…");
  process.exit(1);
}
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = path.join("docs", "design", folder);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const [name, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: name === "mobile", hasTouch: name === "mobile" });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    // bandeau cookies : refusé comme le ferait une visiteuse (le retirer du DOM dérange React)
    const refuse = page.getByRole("button", { name: "Refuser" });
    if (await refuse.isVisible().catch(() => false)) await refuse.click();
    // tout faire apparaître (images paresseuses, révélations au scroll), puis revenir en haut
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += Math.round(window.innerHeight * 0.8)) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
      document.querySelectorAll("[data-pending]").forEach((el) => el.removeAttribute("data-pending"));
      // toutes les images chargées et décodées (sinon des zones grises apparaissent sur la capture)
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete ? img.decode().catch(() => {}) : new Promise((r) => img.addEventListener("load", r, { once: true }) || img.addEventListener("error", r, { once: true })),
        ),
      );
    });
    await page.waitForTimeout(1200);
    const file = path.join(out, `${p.split("/").filter(Boolean).slice(2).join("-") || "accueil"}-${name}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 72 });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
