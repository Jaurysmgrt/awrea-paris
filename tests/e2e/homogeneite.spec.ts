import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { acceptCookies } from "./helpers";
import { auditInPage, type DesignAudit } from "./design-audit";

/**
 * Testeur « homogénéité » : chaque page, sur mobile, tablette et ordinateur. Les deux polices
 * officielles seulement (Fraunces 72pt Italic pour les titres, Cormorant Garamond pour les textes ;
 * next/font les nomme d'après les constantes d'app/fonts.ts), l'italique réservé aux titres, aucun
 * texte sous 16 px, aucune dorure dans l'interface, espacements multiples de 8 px, interlignage 1,6
 * (notes de 18 px sur 32 px), et des paragraphes alignés à gauche, jamais justifiés
 * (aucun trou entre les mots), de 75 caractères par ligne au plus.
 */
const PAGES = [
  "/", "/collections", "/collections/hypnotic-lace", "/boutique", "/boutique/robe-odessa", "/boutique/body-aura", "/outfits",
  "/la-maison", "/atelier", "/sur-commande", "/guide-des-tailles", "/journal", "/journal/dentelle-drapes-et-dorure", "/presse", "/contact", "/faq", "/livraison-retours",
  "/cgv", "/cgu", "/mentions-legales", "/propriete-intellectuelle", "/confidentialite", "/cookies", "/assistant-ia", "/retractation",
  "/compte", "/liste-envies", "/recherche", "/page-inexistante",
];
const SIZES = [
  { name: "mobile", width: 360, height: 780 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "ordinateur", width: 1440, height: 900 },
];
const REPORT = process.env.HOMOGENEITE_RAPPORT;
const report: Record<string, DesignAudit> = {};

test.describe.configure({ mode: "serial" });
test.afterAll(() => {
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
});

for (const size of SIZES) {
  test.describe(`Homogénéité ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: size.width < 1024, isMobile: size.width < 768 });
    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await acceptCookies(page);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(path, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1", null, { timeout: 30_000 });
        const a = await page.evaluate(auditInPage);
        report[`${size.name} ${path}`] = a;
        if (REPORT) return;
        expect(a.families.filter((f) => !/fraunces|cormorant/i.test(f)), "familles hors des deux polices officielles").toEqual([]);
        expect(a.italics, "italiques hors des titres en Fraunces").toEqual([]);
        expect(a.small, "textes sous 16 px").toEqual([]);
        expect(a.saturated, "couleurs saturées (doré)").toEqual([]);
        expect(a.spacing, "espacements hors de la grille de 8 px").toEqual([]);
        expect(a.leading, "interlignage du texte courant différent de 1,6, ou hors de la grille de 8 px").toEqual([]);
        // texte aligné à gauche : aucun paragraphe justifié, donc aucun trou entre les mots
        expect(a.justified, "paragraphes justifiés").toEqual([]);
        expect(a.wide, "paragraphes de plus de 75 caractères par ligne").toEqual([]);
      });
    }
  });
}
