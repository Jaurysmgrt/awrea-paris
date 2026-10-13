import { expect, test } from "@playwright/test";
import { acceptCookies, VIEWPORTS } from "./helpers";

const PAGES = [
  "/", "/collections", "/collections/lace-is-more", "/boutique", "/boutique?categorie=body", "/boutique/robe-odessa", "/boutique/etole-nyx",
  "/silhouettes", "/la-maison", "/atelier", "/journal", "/journal/moodboard-lace-is-more", "/presse", "/contact", "/faq",
  "/livraison-retours", "/cgv", "/cgu", "/mentions-legales", "/propriete-intellectuelle", "/confidentialite", "/cookies", "/assistant-ia", "/retractation", "/compte", "/liste-envies", "/commande", "/page-inexistante",
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 1024, isMobile: vp.width < 768 });

    for (const path of PAGES) {
      test(`${path}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
        });
        await acceptCookies(page);
        await page.goto(path, { waitUntil: "load" });
        await page.waitForTimeout(400);
        // faire défiler toute la page pour monter les éléments paresseux
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
          window.scrollTo(0, 0);
        });
        const r = await page.evaluate(() => {
          const de = document.documentElement;
          const offenders: string[] = [];
          if (de.scrollWidth > de.clientWidth + 1) {
            for (const el of Array.from(document.querySelectorAll("body *"))) {
              const b = el.getBoundingClientRect();
              const pos = getComputedStyle(el).position;
              if (b.right > de.clientWidth + 1 && b.width > 0 && pos !== "fixed") offenders.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 40)}`);
              if (offenders.length > 4) break;
            }
          }
          const imgsNoAlt = Array.from(document.querySelectorAll("img")).filter((i) => !i.hasAttribute("alt")).length;
          const badJustify = Array.from(document.querySelectorAll("main h1, main h2, main h3, main .btn, main .price, main nav a")).filter((el) => getComputedStyle(el).textAlign === "justify").length;
          // mêmes exclusions que la règle de styles/base.css : étiquettes, titres, prix, citations calligraphiées
          const notText = ".t-label, .eyebrow, .price, .t-h1, .t-h2, .t-h3, .t-h4, .t-display, .t-script, .t-center, .t-left, .badge";
          const prose = Array.from(document.querySelectorAll(`main .prose p:not(${notText}), main p.t-body:not(${notText})`)).filter((p) => p.tagName === "P");
          const notJustified = prose.filter((p) => getComputedStyle(p).textAlign !== "justify").length;
          return { overflow: de.scrollWidth - de.clientWidth, offenders, h1: document.querySelectorAll("h1").length, imgsNoAlt, badJustify, notJustified, lang: de.lang };
        });
        expect(r.overflow, `Débordement horizontal : ${r.offenders.join(", ")}`).toBeLessThanOrEqual(1);
        expect(r.h1, "Une seule balise H1").toBe(1);
        expect(r.imgsNoAlt, "Images sans attribut alt").toBe(0);
        expect(r.badJustify, "Titres, boutons, prix ou navigation justifiés").toBe(0);
        expect(r.notJustified, "Paragraphes de texte non justifiés").toBe(0);
        expect(r.lang).toBe("fr");
        expect(errors, errors.join("\n")).toHaveLength(0);
      });
    }
  });
}
