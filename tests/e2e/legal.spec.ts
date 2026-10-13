import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

const PAGES = ["/mentions-legales", "/propriete-intellectuelle", "/cgv", "/cgu", "/confidentialite", "/cookies", "/assistant-ia", "/retractation", "/livraison-retours"];

test.describe("Pages légales", () => {
  for (const path of PAGES) {
    test(`${path} : date de mise à jour, sommaire cliquable, liens depuis le pied de page`, async ({ page }) => {
      await acceptCookies(page);
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".legal__updated")).toContainText("Mise à jour le");
      const toc = page.getByRole("navigation", { name: "Sommaire" });
      if (await toc.count()) {
        const first = toc.getByRole("link").first();
        const href = await first.getAttribute("href");
        await first.click();
        await expect(page.locator(href!)).toBeInViewport();
      }
      // aucune accolade de gabarit ne doit apparaître à l'écran
      expect(await page.locator("main").innerText()).not.toMatch(/\{\{|\}\}/);
      if (path !== "/livraison-retours") await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(1);
    });
  }

  test("informations de l’entreprise non inventées : repères « À COMPLÉTER » visibles", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/mentions-legales");
    await expect(page.locator("mark.todo").first()).toBeVisible();
    await expect(page.locator("mark.todo").first()).toContainText("À COMPLÉTER");
  });

  test("CGV : garanties légales, exclusion du sur-mesure, formulaire type de rétractation", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/cgv");
    await expect(page.getByText("Garantie légale de conformité et garantie des vices cachés")).toBeVisible();
    await expect(page.getByText(/L221-28, 3°/)).toBeVisible();
    await expect(page.getByText("Formulaire de rétractation", { exact: true })).toBeVisible();
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
