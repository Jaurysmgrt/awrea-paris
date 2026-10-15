// Captures à intervalles des animations signature : révélation en dentelle et transition drapée.
import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([{ name: "awrea_consent", value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, social: false, date: "2026-01-01" })), url: base }]);
const page = await ctx.newPage();
await page.goto(base + "/", { waitUntil: "domcontentloaded" });
for (const t of [300, 900, 1600, 2600, 4200]) {
  await page.waitForTimeout(t === 300 ? 300 : t - [300, 900, 1600, 2600, 4200][[300, 900, 1600, 2600, 4200].indexOf(t) - 1]);
  await page.screenshot({ path: `${out}/lace-${t}.png` });
}
// transition drapée : clic sur « Boutique »
await page.getByRole("link", { name: "Boutique" }).first().click();
for (const t of [150, 450, 800, 1200, 1700, 2400]) {
  await page.waitForTimeout(t === 150 ? 150 : t - [150, 450, 800, 1200, 1700, 2400][[150, 450, 800, 1200, 1700, 2400].indexOf(t) - 1]);
  await page.screenshot({ path: `${out}/drape-${t}.png` });
}
const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
console.log("webgl:", webgl);
await browser.close();
