// Captures d'écran + contrôle de débordement horizontal.
// Usage : node scripts/shoot.mjs <base> <outDir> <chemin...> [--vp=360,768,1440] [--full] [--wait=ms]
import { chromium } from "@playwright/test";
import fs from "node:fs";

const args = process.argv.slice(2);
const base = args[0];
const out = args[1];
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; }));
const paths = args.slice(2).filter((a) => !a.startsWith("--"));
const vps = (flags.vp ?? "360,768,1440").split(",").map(Number);
const heights = { 360: 740, 390: 844, 414: 896, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
for (const w of vps) {
  const ctx = await browser.newContext({ viewport: { width: w, height: heights[w] ?? 900 }, deviceScaleFactor: 1, reducedMotion: flags.reduced ? "reduce" : "no-preference", hasTouch: w < 1024, isMobile: w < 768 });
  await ctx.addCookies([{ name: "awrea_consent", value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, social: false, date: "2026-01-01" })), url: base }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "load" });
    await page.waitForTimeout(Number(flags.wait ?? 3500));
    if (flags.full) {
      // faire défiler pour déclencher les apparitions
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 500) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
    }
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      const offenders = [];
      if (de.scrollWidth > de.clientWidth + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > de.clientWidth + 1 && getComputedStyle(el).position !== "fixed") offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(r.right)}`);
          if (offenders.length > 6) break;
        }
      }
      return { sw: de.scrollWidth, cw: de.clientWidth, offenders, h1: document.querySelectorAll("h1").length };
    });
    const name = `${p.replace(/\W+/g, "_") || "home"}-${w}.png`;
    if (flags.frames) {
      const vh = heights[w] ?? 900;
      const total = await page.evaluate(() => document.body.scrollHeight);
      let i = 0;
      for (let y = 0; y < total && i < Number(flags.frames); y += vh, i++) {
        await page.evaluate((y) => { (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)); }, y);
        await page.waitForTimeout(1900);
        await page.screenshot({ path: `${out}/${name.replace(".png", `-f${String(i).padStart(2, "0")}.png`)}` });
      }
    } else await page.screenshot({ path: `${out}/${name}`, fullPage: Boolean(flags.full) });
    console.log(`${w}px ${p} → ${name} | overflow ${overflow.sw > overflow.cw + 1 ? "OUI " + overflow.offenders.join(" ; ") : "non"} | h1=${overflow.h1}${errors.length ? " | ERREURS: " + errors.slice(0, 3).join(" / ") : ""}`);
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
