import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { acceptCookies } from "./helpers";
import { auditInPage, hyphenateJustified, type DesignAudit } from "./design-audit";

/**
 * Testeur « homogénéité » : chaque page, sur mobile, tablette et ordinateur. Les deux polices
 * officielles seulement (Fraunces 72pt Italic pour les titres, Cormorant Garamond pour les textes ;
 * next/font les nomme d'après les constantes d'app/fonts.ts), l'italique réservé aux titres, aucun
 * texte sous 16 px, aucune dorure dans l'interface, espacements multiples de 8 px, interlignage 1,6
 * (notes de 18 px sur 32 px), et des paragraphes justifiés sans trous (espaces entre les mots au plus deux fois leur largeur
 * naturelle, 2,5 sur les plus petits téléphones, et 45 à 75 caractères par ligne sur ordinateur).
 */
const PAGES = [
  "/", "/collections", "/collections/hypnotic-lace", "/boutique", "/boutique/robe-odessa", "/boutique/body-aura", "/outfits",
  "/la-maison", "/atelier", "/journal", "/journal/moodboard-lace-is-more", "/presse", "/contact", "/faq", "/livraison-retours",
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
        // page hydratée et équilibreur monté (sinon React effacerait la césure et l'évènement serait perdu)
        await page.waitForFunction(() => document.documentElement.dataset.justification !== undefined, null, { timeout: 30_000 });
        await hyphenateJustified(page);
        // justification régulière (components/typography/Justification.tsx) : on relance le calcul
        // de toute la page avec la césure
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("awrea:justifier", { detail: { tout: true } })));
        await page.waitForFunction(() => document.documentElement.dataset.justification === "pret", null, { timeout: 30_000 });
        const a = await page.evaluate(auditInPage);
        report[`${size.name} ${path}`] = a;
        if (REPORT) return;
        expect(a.families.filter((f) => !/fraunces|cormorant/i.test(f)), "familles hors des deux polices officielles").toEqual([]);
        expect(a.italics, "italiques hors des titres en Fraunces").toEqual([]);
        expect(a.small, "textes sous 16 px").toEqual([]);
        expect(a.saturated, "couleurs saturées (doré)").toEqual([]);
        expect(a.spacing, "espacements hors de la grille de 8 px").toEqual([]);
        expect(a.leading, "interlignage du texte courant différent de 1,6, ou hors de la grille de 8 px").toEqual([]);
        // espaces entre les mots, rapportés à l'espace naturel de la police : 2 au plus (2,5 sur les
        // plus petits téléphones, où la colonne est déjà élargie et le texte réduit). Un paragraphe
        // visible dès l'ouverture garde son nombre de lignes pour que rien ne bouge (aucun décalage
        // de mise en page) : sa marge est un peu plus large, et les chapeaux concernés sont revus à
        // la rédaction.
        const limit = size.width < 400 ? 2.5 : 2;
        const holes = a.justified.filter((j) => j.lines > 1 && j.maxGap > limit + (j.firstScreen ? 0.6 : 0));
        expect(holes, "trous dans les paragraphes justifiés").toEqual([]);
        if (size.name === "ordinateur") {
          const measure = a.justified.filter((j) => j.lines > 2 && (j.chars < 45 || j.chars > 75));
          expect(measure, "mesure hors de 45–75 caractères par ligne").toEqual([]);
        }
      });
    }
  });
}
