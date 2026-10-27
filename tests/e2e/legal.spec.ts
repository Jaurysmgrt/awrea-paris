import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

const PAGES = ["/mentions-legales", "/propriete-intellectuelle", "/cgv", "/cgu", "/confidentialite", "/cookies", "/assistant-ia", "/retractation", "/livraison-retours"];
/** pages légales reliées au pied de page (maquette BAS DE PAGE : colonnes LÉGAL et SERVICE CLIENT) */
const FOOTER = ["/mentions-legales", "/cgv", "/confidentialite", "/livraison-retours"];
/** articles des CGV officielles, dans l'ordre, avec leurs ancres (liens « /cgv#… » des autres pages) */
const ARTICLES = ["champ-application", "prix", "commande", "paiement", "livraison", "transfert-propriete", "retractation", "garanties", "donnees", "propriete-intellectuelle", "droit"];

test.describe("Pages légales", () => {
  for (const path of PAGES) {
    test(`${path} : date de mise à jour, sommaire cliquable, liens depuis le pied de page`, async ({ page }) => {
      await acceptCookies(page);
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".legal__updated")).toContainText("Mise à jour le");
      const toc = page.getByRole("navigation", { name: "Sommaire" });
      if (await toc.count()) {
        // chaque lien du sommaire (rubriques et intertitres) mène à une section de la page
        const hrefs = await toc.getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
        for (const h of hrefs) expect(await page.locator(`[id="${h.slice(1)}"]`).count(), h).toBe(1);
        const first = toc.getByRole("link").first();
        const href = await first.getAttribute("href");
        await first.click();
        await expect(page.locator(href!)).toBeInViewport();
      }
      const text = (await page.locator("main").innerText()).replace(/\u00ad/g, "");
      // aucune accolade de gabarit ne doit apparaître à l'écran
      expect(text).not.toMatch(/\{\{|\}\}/);
      // création sur demande : aucune notion de rareté, de précommande ni de série numérotée
      expect(text).not.toMatch(/précommande|épuisé|série numérotée|édition limitée|liste d’attente|pièces restantes|retour en stock/i);
      if (FOOTER.includes(path)) await expect(page.locator(`footer .site-footer__cols a[href="${path}"]`)).toHaveCount(1);
    });
  }

  test("CGV : les onze articles officiels, dans l’ordre, avec leurs ancres", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/cgv");
    const titres = page.locator("main .legal__body > section[data-officiel] > h2");
    await expect(titres).toHaveCount(ARTICLES.length);
    const textes = await titres.allInnerTexts();
    textes.forEach((t, i) => expect(t.trim()).toMatch(new RegExp(`^ARTICLE ${i + 1} `)));
    await expect(titres.first()).toHaveText("ARTICLE 1 – Champ d’application");
    for (const id of ARTICLES) await expect(page.locator(`section#${id}[data-officiel]`)).toHaveCount(1);
    // listes de l'original en vraies listes (article 8 : deux garanties ; article 9 : destinataires et droits)
    await expect(page.locator("#garanties ul > li")).toHaveCount(2);
    await expect(page.locator("#donnees ul > li")).toHaveCount(9);
    // coordonnées de la Maison (article 1)
    await expect(page.locator("#champ-application")).toContainText("awrea.contact@gmail.com");
    // annexe de la Maison, hors texte officiel : formulaire type adressé à l'entreprise
    expect(await page.locator("#annexe").getAttribute("data-officiel")).toBeNull();
    await expect(page.getByText("Formulaire de rétractation", { exact: true })).toBeVisible();
    await expect(page.locator(".legal__model")).toContainText("Léane Soubrier");
  });

  test("CGV : l’ancre de l’article 7 citée par les pages Livraison et Rétractation", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/retractation");
    await page.locator('main a[href="/cgv#retractation"]').first().click();
    await expect(page).toHaveURL(/\/cgv#retractation$/);
    await expect(page.locator("#retractation h2")).toBeInViewport();
    await expect(page.locator("#retractation")).toContainText("Les frais de retour restant à la charge du Client.");
  });

  test("mentions légales : texte officiel, informations de l’entreprise, repères « À COMPLÉTER » des compléments", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/mentions-legales");
    const entreprise = page.locator("section#entreprise[data-officiel]");
    await expect(entreprise).toContainText("Léane Soubrier");
    await expect(entreprise).toContainText("100 222 926");
    await expect(entreprise).toContainText("46 rue Paul Déroulède, 78290 Croissy-sur-Seine");
    await expect(page.locator("main .legal__body > [data-officiel]").first()).toContainText("loi n° 2004-575", { ignoreCase: true });
    // sommaire à deux niveaux : les intertitres du texte officiel y sont repris
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await expect(toc.getByRole("link", { name: "Hébergement" })).toHaveAttribute("href", "#hebergement");
    await expect(toc.getByRole("link", { name: "Données personnelles" })).toHaveAttribute("href", "#donnees-personnelles");
    // compléments demandés par la loi, absents du texte officiel : jamais inventés
    for (const id of ["publication", "mediation"]) {
      await expect(page.locator(`#${id} mark.todo`)).toBeVisible();
      await expect(page.locator(`#${id} mark.todo`)).toContainText("À COMPLÉTER");
    }
  });

  test("livraison et retours : création sur demande, livraison en France métropolitaine, frais de retour", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/livraison-retours");
    await expect(page.locator("#fabrication")).toContainText("Aucune pièce n’attend en stock");
    await expect(page.locator("#fabrication")).toContainText("délai de fabrication");
    await expect(page.locator("#delais")).toContainText("France métropolitaine");
    await expect(page.locator("#retours")).toContainText("Les frais de retour restent à votre charge.");
  });

  test("politique cookies : liste par catégorie et gestionnaire de consentement", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/cookies");
    for (const cat of ["Nécessaires", "Mesure d’audience", "Personnalisation", "Publicité"]) await expect(page.locator("caption", { hasText: cat })).toHaveCount(1);
    await page.locator("main").getByRole("button", { name: "Gérer mes cookies" }).click();
    await expect(page.getByRole("region", { name: "Cookies" })).toBeVisible();
  });

  test("rétractation en ligne en deux étapes avec accusé de réception", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/retractation");
    await page.getByLabel("Nom et prénom").fill("Camille Demo");
    await page.getByLabel("E-mail (pour l’accusé de réception)").fill("camille.demo@exemple.fr");
    await page.getByLabel("Numéro de commande").fill("AW-1031");
    await page.getByRole("button", { name: "Se rétracter du contrat ici" }).click();
    await expect(page.getByText("Vérifiez votre demande avant de la confirmer")).toBeVisible();
    await page.getByRole("button", { name: "Confirmer la rétractation" }).click();
    await expect(page.getByText("Rétractation enregistrée")).toBeVisible();
    await expect(page.getByText(/référence RET-[0-9A-F]{6}/)).toBeVisible();
  });
});
