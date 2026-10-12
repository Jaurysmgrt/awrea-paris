import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.addCookies([{ name: "awrea_consent", value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, social: false, date: "2026-01-01" })), url: base }]);
  const page = await ctx.newPage();
  await page.goto(base + "/boutique/robe-odessa", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/assist-closed-${w}.png` });
  await page.locator(".assistant-launcher").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/assist-open-${w}.png` });
  await page.locator("#assistant-input").fill("Je fais du 38, quelle taille pour la robe Odessa ?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/assist-answer-${w}.png` });
  await ctx.close();
}
await browser.close();
