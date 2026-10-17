// Captures du tableau de bord Atelier (connexion + pages).
import { chromium } from "@playwright/test";
const [base, out, ...pages] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(base + "/gestion/connexion");
  await page.getByLabel("Mot de passe").fill("atelier-demo");
  await page.getByRole("button", { name: "Entrer" }).click();
  await page.waitForURL(/\/gestion$/);
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: "load" });
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    await page.screenshot({ path: `${out}/admin${p.replace(/\W+/g, "_")}-${w}.png`, fullPage: true });
    console.log(w, p, overflow ? "DÉBORDEMENT" : "ok");
  }
  await ctx.close();
}
await browser.close();
