/**
 * OUTIL DE RÉDACTION (équipe Contenu) : mesure la régularité de la justification d'un texte avant
 * de l'adopter, sur cinq largeurs d'écran, sur le serveur de développement (port 3100).
 *   LEAD_PATH=/outfits LEAD_SEL=p.page-head__lead LEAD_TEXTS='["Texte A","Texte B"]' \
 *     npx playwright test --config=tests/outils/pw.config.ts
 * Pour chaque largeur : [nombre de lignes, plus grand écart entre les mots / espace naturel].
 * Viser moins de 1,6 partout (MARQUE.md) ; au-delà de 2, le contrôle d'homogénéité échoue.
 */
import { test } from "@playwright/test";
import { auditInPage, hyphenateJustified } from "../e2e/design-audit";
const PATH = process.env.LEAD_PATH ?? "/outfits";
const SEL = process.env.LEAD_SEL ?? "p.page-head__lead";
const CANDIDATES = JSON.parse(process.env.LEAD_TEXTS ?? "[]") as string[];
for (const width of [360, 390, 768, 1024, 1440]) test(`lead ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto((process.env.BASE_URL ?? "http://localhost:3100") + PATH, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.dataset.justification === "pret", null, { timeout: 30000 }).catch(() => {});
  for (const text of CANDIDATES) {
    await page.evaluate(([t, sel]) => { const el = document.querySelector(sel)!; el.textContent = t; }, [text, SEL]);
    await hyphenateJustified(page);
    await page.evaluate(() => {
      document.documentElement.dataset.justification = "en-cours";
      window.dispatchEvent(new CustomEvent("awrea:justifier", { detail: { tout: true } }));
    });
    await page.waitForFunction(() => document.documentElement.dataset.justification === "pret", null, { timeout: 15000 }).catch(() => {});
    const a = await page.evaluate(auditInPage);
    const cls = SEL.replace(/^p/, "p");
    const j = a.justified.filter((x) => cls.split(".").slice(1).every((c) => x.selector.includes(c)));
    console.log(width, JSON.stringify(j.map((x) => [x.lines, x.maxGap])), text.slice(0, 40));
  }
});
