import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { acceptCookies } from "./helpers";
import { auditInPage, type DesignAudit } from "./design-audit";

/**
 * Testeur « homogénéité » : chaque page, sur mobile, tablette et ordinateur. Deux piles de polices
 * seulement : Fraunces pour les titres (120pt Light pour les grands et 72pt Italic pour les petits) ;
 * pour les textes, depuis le choix de la créatrice du 23/11, « Avenir Next », « Avenir » puis Mulish
 * (next/font nomme ses polices d'après les constantes d'app/fonts.ts). Cormorant Garamond n'est plus
 * téléchargée, Mulish jamais préchargée. L'italique réservé aux titres, aucun texte sous 16 px, aucune dorure dans
 * l'interface, espacements multiples de 8 px, interlignage 1,6 (notes de 18 px sur 32 px),
 * paragraphes alignés à gauche sur téléphone et justifiés au-delà, avec césure et sans trou entre
 * les mots, de 75 caractères par ligne au plus, et textes alignés sur le bord de leur titre.
 */
const PAGES = [
  "/", "/collections", "/collections/hypnotic-lace", "/boutique", "/boutique/robe-odessa", "/boutique/body-aura", "/outfits",
  "/la-maison", "/atelier", "/sur-commande", "/rendez-vous", "/guide-des-tailles", "/journal", "/journal/dentelle-drapes-et-dorure", "/presse", "/contact", "/faq", "/livraison-retours",
  "/cgv", "/cgu", "/mentions-legales", "/propriete-intellectuelle", "/confidentialite", "/cookies", "/assistant-ia", "/retractation",
  "/compte", "/liste-envies", "/recherche", "/page-inexistante",
];
const SIZES = [
  { name: "mobile", width: 360, height: 780 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "ordinateur", width: 1440, height: 900 },
];
const REPORT = process.env.HOMOGENEITE_RAPPORT;
/** pile des titres : Fraunces, son repli réglé par next/font, puis Georgia */
const PILE_TITRES = /^fraunces, fraunces Fallback, /;
/** pile des textes : Avenir Next et Avenir par leur nom (installées sur les appareils Apple), puis Mulish */
const PILE_TEXTES = /^Avenir Next, Avenir, mulish, mulish Fallback, /;
const report: Record<string, DesignAudit> = {};

test.describe.configure({ mode: "serial" });

/**
 * Polices téléchargées (choix de la créatrice du 23/11) : Fraunces préchargée pour les titres ;
 * Cormorant Garamond plus jamais ; Mulish jamais préchargée, et téléchargée seulement là où
 * Avenir Next manque (Windows, Android, Linux), jamais sur un appareil qui l'a (iPhone, iPad, Mac).
 */
test("polices téléchargées : Fraunces, puis Mulish seulement sans Avenir Next ; plus jamais Cormorant", async ({ page }) => {
  const fichiers: string[] = [];
  page.on("request", (r) => {
    if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fichiers.push(r.url());
  });
  await acceptCookies(page);
  for (const path of ["/", "/boutique/body-aura", "/livraison-retours"]) {
    await page.goto(path, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const prechargees = await page.locator('link[rel="preload"][as="font"]').evaluateAll((ls) => ls.map((l) => l.getAttribute("href") ?? ""));
    expect(prechargees.length, path).toBeGreaterThan(0);
    expect(prechargees.filter((h) => !/fraunces/i.test(h)), `${path} : seule Fraunces est préchargée`).toEqual([]);
  }
  expect(fichiers.filter((u) => /cormorant/i.test(u)), "Cormorant Garamond téléchargée").toEqual([]);
  // Avenir Next installée ? (même mesure qu'avec la police à chasse fixe du système : absente)
  const avenir = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d")!;
    const w = (f: string) => ((c.font = `72px ${f}`), c.measureText("mmmmmmmmmmlliWWwwAvenir").width);
    return w('"Avenir Next", monospace') !== w("monospace");
  });
  const mulish = fichiers.filter((u) => /mulish/i.test(u));
  if (avenir) expect(mulish, "Mulish téléchargée alors qu'Avenir Next est installée").toEqual([]);
  else {
    expect(mulish.length, "Mulish, la police des textes là où Avenir Next manque").toBeGreaterThan(0);
    expect(await page.evaluate(() => Array.from(document.fonts).some((f) => f.family === "mulish" && f.status === "loaded"))).toBe(true);
  }
});
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
        // césure et réglage des paragraphes justifiés terminés (components/ui/Justification.tsx)
        await page.waitForFunction(() => document.documentElement.dataset.justification === "1", null, { timeout: 30_000 });
        const a = await page.evaluate(auditInPage);
        report[`${size.name} ${path}`] = a;
        if (REPORT) return;
        expect(a.families.filter((f) => !PILE_TITRES.test(f) && !PILE_TEXTES.test(f)), "polices hors des deux piles (Fraunces ; Avenir Next, Avenir, Mulish)").toEqual([]);
        expect(a.italics, "italiques hors des titres en Fraunces").toEqual([]);
        expect(a.small, "textes sous 16 px").toEqual([]);
        expect(a.saturated, "couleurs saturées (doré)").toEqual([]);
        expect(a.spacing, "espacements hors de la grille de 8 px").toEqual([]);
        expect(a.leading, "interlignage du texte courant différent de 1,6, ou hors de la grille de 8 px").toEqual([]);
        // corps de texte justifiés sur tablette et ordinateur, alignés à gauche sur téléphone ;
        // justifiés seulement sans trou : aucun espace au-delà de 2 fois l'espace normal, 50 caractères par ligne au moins
        if (size.width < 768) expect(a.justified, "paragraphes justifiés sur téléphone").toEqual([]);
        expect(a.gappy, "paragraphes justifiés trop étroits ou sans césure").toEqual([]);
        expect(a.wide, "paragraphes de plus de 75 caractères par ligne").toEqual([]);
        expect(a.misaligned, "textes décalés par rapport à leur titre").toEqual([]);
      });
    }
  });
}
