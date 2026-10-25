import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, waitForHydration } from "./helpers";

/** Navigation principale de l'en-tête (tablette et ordinateur). */
const mainNav = (page: Page) => page.locator(".site-header").getByRole("navigation", { name: "Navigation principale" });

test.describe("En-tête de la maquette : logo centré, navigation centrée dessous", () => {
  test("cinq entrées en Cormorant, Accueil souligné, logo et navigation centrés", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    const nav = mainNav(page);
    const entries = nav.locator(".site-nav__list > li > :is(a, button)");
    const labels = (await entries.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    expect(labels).toEqual(["Accueil", "Sur commande", "Collections", "Contact", "Mon Panier"]);
    await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    // trois menus déroulants, chacun avec son chevron dessiné (aucun signe des polices)
    await expect(nav.locator("button[aria-expanded] svg.chevron")).toHaveCount(3);
    expect(await entries.first().evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/cormorant/i);

    const width = await page.evaluate(() => document.documentElement.clientWidth);
    const logo = (await page.locator(".site-header__logo").boundingBox())!;
    const list = (await nav.locator(".site-nav__list").boundingBox())!;
    expect(Math.abs(logo.x + logo.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(list.x + list.width / 2 - width / 2)).toBeLessThan(2);
    expect(list.y).toBeGreaterThan(logo.y + logo.height - 1); // la navigation sous le logo
    await expect(page.getByRole("link", { name: "Awrea Paris, page d’accueil" })).toHaveCount(1);
  });

  test("menus déroulants au clavier : Entrée ouvre, Tab parcourt, Échap referme et rend le focus", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/contact");
    await waitForHydration(page);
    const nav = mainNav(page);
    const surCommande = nav.getByRole("button", { name: "Sur commande" });
    await expect(nav.getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "page");

    await surCommande.focus();
    await page.keyboard.press("Enter");
    await expect(surCommande).toHaveAttribute("aria-expanded", "true");
    const sous = nav.locator(`[id="${await surCommande.getAttribute("aria-controls")}"]`);
    await expect(sous.getByRole("link", { name: "La commande sur demande" })).toHaveAttribute("href", "/sur-commande");
    await expect(sous.getByRole("link", { name: "L’atelier" })).toHaveAttribute("href", "/atelier");
    await expect(sous.getByRole("link", { name: "Prendre rendez-vous" })).toHaveAttribute("href", "/rendez-vous");
    await page.keyboard.press("Tab");
    await expect(sous.getByRole("link", { name: "La commande sur demande" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(surCommande).toHaveAttribute("aria-expanded", "false");
    await expect(surCommande).toBeFocused();
    await expect(sous).toBeHidden();

    // Espace ouvre « Collections » ; quitter le menu au clavier le referme
    const collections = nav.getByRole("button", { name: "Collections" });
    await collections.focus();
    await page.keyboard.press(" ");
    await expect(collections).toHaveAttribute("aria-expanded", "true");
    const sousCollections = nav.locator(`[id="${await collections.getAttribute("aria-controls")}"]`);
    await expect(sousCollections.getByRole("link", { name: "Hypnotic Lace" })).toHaveAttribute("href", "/collections/hypnotic-lace");
    await expect(sousCollections.getByRole("link", { name: "Toutes les pièces" })).toHaveAttribute("href", "/boutique");
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Contact" })).toBeFocused();
    await expect(collections).toHaveAttribute("aria-expanded", "false");

    // un clic ailleurs referme aussi
    await collections.click();
    await expect(collections).toHaveAttribute("aria-expanded", "true");
    await page.mouse.click(1, 1);
    await expect(collections).toHaveAttribute("aria-expanded", "false");
  });

  test("« Rechercher une pièce » ouvre la recherche ; « Mon Panier » ouvre le tiroir, le compte et les envies", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    const nav = mainNav(page);
    await nav.getByRole("button", { name: "Collections" }).click();
    await nav.getByRole("button", { name: "Rechercher une pièce" }).click();
    const recherche = page.getByRole("dialog", { name: "Recherche" });
    await expect(recherche).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(recherche).toBeHidden();

    const panier = nav.getByRole("button", { name: /Mon Panier\s*: 0 pièce/ });
    await panier.click();
    const sous = nav.locator(`[id="${await panier.getAttribute("aria-controls")}"]`);
    await expect(sous.getByRole("link", { name: /Mon compte/ })).toHaveAttribute("href", "/compte");
    await expect(sous.getByRole("link", { name: /Mes envies/ })).toHaveAttribute("href", "/liste-envies");
    await sous.getByRole("button", { name: /Mon panier\s*: 0 pièce/ }).click();
    await expect(page.locator("dialog.drawer")).toBeVisible();
  });

  test("au défilement, en-tête compact : le monogramme et la même navigation", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    const header = page.locator(".site-header");
    await expect(header).toHaveAttribute("data-compact", "false");
    await expect(page.locator(".site-header__mark")).toBeHidden();
    await page.mouse.wheel(0, 1200);
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect(page.locator(".site-header__mark-mini")).toBeVisible();
    await expect(page.locator(".site-header__logo")).not.toBeInViewport();
    const nav = mainNav(page);
    await expect(nav.getByRole("button", { name: "Collections" })).toBeInViewport();
    const box = (await nav.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(96);
  });

  test("« / » ouvre la recherche ; résultats instantanés, page complète avec Entrée", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Recherche" });
    await expect(dialog).toBeVisible();
    const input = dialog.getByLabel("Rechercher");
    await expect(input).toBeFocused();
    await input.pressSequentially("dentel");
    await expect(dialog.getByRole("heading", { name: /Pièces/ })).toBeVisible();
    await expect(dialog.locator(".search__piece").first()).toBeVisible();
    // le reste de la page est inerte pendant la recherche
    expect(await page.evaluate(() => document.getElementById("contenu")?.closest("[inert]") !== null)).toBe(true);
    await input.fill("retours");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/recherche\?q=retours/);
    await expect(page.locator("main").getByRole("status")).toContainText("résultat");
    await expect(page.getByRole("link", { name: /Livraison & retours/ }).first()).toBeVisible();
    // Échap referme ; la page redevient interactive
    await page.keyboard.press("/");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.getElementById("contenu")?.closest("[inert]") === null)).toBe(true);
  });

  test("recherche sans JavaScript : la page /recherche répond seule", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/recherche?q=robe");
    await expect(page.locator(".search__piece").first()).toBeVisible();
    await ctx.close();
  });
});

test.describe("Téléphone : Menu, logo au centre, panier ; menu plein écran", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("bouton Menu à gauche, logo au centre, panier à droite ; le menu reprend les cinq entrées", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/la-maison");
    await waitForHydration(page);
    const menuButton = page.getByRole("button", { name: "Menu" });
    const mark = page.locator(".site-header__mark");
    const cart = page.getByRole("button", { name: /^Panier\s*: 0 pièce/ });
    const [m, l, c] = await Promise.all([menuButton.boundingBox(), mark.boundingBox(), cart.boundingBox()]);
    expect(m!.x + m!.width).toBeLessThan(l!.x);
    expect(l!.x + l!.width).toBeLessThan(c!.x);
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    expect(Math.abs(l!.x + l!.width / 2 - width / 2)).toBeLessThan(2);
    await expect(mainNav(page)).toBeHidden();
    // tout tient sur une ligne à 360 px
    expect(await page.locator(".site-header__inner").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    await menuButton.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(page.locator("#site-menu")).toHaveAttribute("data-open", "true");
    await expect(menu.getByRole("link", { name: "Accueil" })).toBeFocused();
    for (const name of ["Sur commande", "Collections", "Mon Panier"]) await expect(menu.getByRole("button", { name, exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    const collections = menu.getByRole("button", { name: "Collections" });
    await collections.click();
    await expect(collections).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: "Hypnotic Lace" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.locator("#site-menu")).toHaveAttribute("data-open", "false");
    await expect(menuButton).toBeFocused();

    // le panier s'ouvre aussi depuis le menu
    await menuButton.click();
    await menu.getByRole("button", { name: "Mon Panier", exact: true }).click();
    await menu.getByRole("button", { name: /Mon panier\s*: 0 pièce/ }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("dialog.drawer")).toBeVisible();
  });
});

test.describe("Pied de page de la maquette et lettre de la Maison", () => {
  test("filet centré, quatre colonnes, Instagram en pastille noire, © Awrea Paris 2026", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    const footer = page.locator("footer.site-footer");
    await expect(footer.locator("hr.rule--center")).toBeVisible();
    const cols = footer.getByRole("navigation", { name: "Pied de page" });
    for (const title of ["La marque", "Service client", "Légal", "Nous suivre"]) await expect(cols.getByRole("heading", { level: 2, name: new RegExp(`^${title}$`, "i") })).toBeVisible();
    const liens: [string, string][] = [
      ["Contact", "/contact"],
      ["À propos", "/la-maison"],
      ["Guide des tailles", "/guide-des-tailles"],
      ["Livraison & retours", "/livraison-retours"],
      ["Suivre ma commande", "/suivi"],
      ["Mentions légales", "/mentions-legales"],
      ["CGV", "/cgv"],
      ["Confidentialité", "/confidentialite"],
    ];
    for (const [name, href] of liens) await expect(cols.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    const insta = cols.getByRole("link", { name: /Instagram/ });
    await expect(insta).toHaveAttribute("href", "https://www.instagram.com/awrea.paris");
    await expect(insta).toHaveAttribute("target", "_blank");
    await expect(insta).toHaveAttribute("rel", /noopener/);
    await insta.scrollIntoViewIfNeeded();
    await expect.poll(() => insta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(10, 10, 10)");
    const copy = footer.getByText("© Awrea Paris 2026", { exact: true });
    await expect(copy).toBeVisible();
    expect(await copy.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");

    // « Gérer les cookies » rouvre les préférences
    await cols.getByRole("button", { name: "Gérer les cookies" }).click();
    await expect(page.getByRole("region", { name: "Cookies" })).toBeVisible();
  });

  test("lettre compacte du pied de page : e-mail et consentement, erreurs signalées, puis inscription", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await waitForHydration(page);
    const lettre = page.locator(".site-footer__news");
    await expect(lettre.getByText("Suivez-nous", { exact: true })).toBeVisible();
    await expect(lettre.getByRole("heading", { name: "Soyez informé avant tout le monde" })).toBeVisible();
    // le pied de page ne double jamais les champs Nom et Prénom des formulaires de la page
    await expect(page.locator("footer input[name=nom], footer input[name=prenom]")).toHaveCount(0);
    await lettre.getByRole("button", { name: "M’inscrire" }).click();
    const email = lettre.getByLabel(/^E-mail/);
    await expect(email).toBeFocused();
    for (const champ of [email, lettre.getByRole("checkbox")]) await expect(champ).toHaveAttribute("aria-invalid", "true");
    await expect(lettre.getByText("Cochez la case pour recevoir la lettre de la Maison.")).toBeVisible();

    await email.fill(`lettre-${Date.now()}@exemple.fr`);
    await lettre.getByRole("checkbox", { name: /Oui je souhaite m’inscrire à la Newsletter/ }).check();
    await lettre.getByRole("button", { name: "M’inscrire" }).click();
    await expect(lettre.getByRole("status")).toContainText("Merci.");
  });

  test("API de la lettre : Nom, Prénom et E-mail obligatoires, Téléphone facultatif mais vérifié", async ({ request }) => {
    const manque = await request.post("/api/newsletter", { data: { email: "alma@exemple.fr", consent: true } });
    expect(manque.status()).toBe(400);
    expect(await manque.json()).toMatchObject({ error: "invalide", champs: ["nom", "prenom"] });
    // la version compacte du pied de page ne demande que l'e-mail et le consentement
    const compacte = await request.post("/api/newsletter", { data: { formule: "compacte", email: "alma@exemple.fr", consent: false } });
    expect(await compacte.json()).toMatchObject({ error: "invalide", champs: ["consentement"] });
    const telephone = await request.post("/api/newsletter", { data: { nom: "Martin", prenom: "Alma", email: "alma@exemple.fr", telephone: "abc", consent: true } });
    expect(telephone.status()).toBe(400);
    expect((await telephone.json()).champs).toContain("telephone");
    const sansConsentement = await request.post("/api/newsletter", { data: { nom: "Martin", prenom: "Alma", email: "alma@exemple.fr", consent: false } });
    expect((await sansConsentement.json()).champs).toContain("consentement");
  });

  test("mode Nuit : automatique selon le réglage de l’appareil, puis au choix, sans flash au rechargement", async ({ page }) => {
    await acceptCookies(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const footer = page.locator("footer");
    // réglages d'affichage repliés derrière le lien « Affichage » du pied de page
    const ouvrirAffichage = () => footer.locator(".site-footer__tools > summary").click();
    await ouvrirAffichage();
    await footer.getByText("Jour", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await footer.getByText("Nuit", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    // le choix est appliqué par le script de <head>, avant le premier affichage
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/boutique", { waitUntil: "commit" });
    await page.waitForSelector("body");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgb(247, 246, 243)"); // jamais de blanc cassé en mode Nuit
    // la pastille Instagram s'inverse : blanc cassé sur fond noir
    await expect.poll(() => page.locator(".site-footer__social").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(247, 246, 243)");
    await ouvrirAffichage();
    await footer.getByText(/^Auto/).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  });

  test("animations apaisées sur demande, même si le système ne le demande pas", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/");
    await page.locator("footer .site-footer__tools > summary").click();
    await page.locator("footer").getByRole("switch", { name: "Animations apaisées" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  });

  test("prix sobres : jamais de prix barré", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique");
    await expect(page.locator(".price del, .price s")).toHaveCount(0);
  });
});
