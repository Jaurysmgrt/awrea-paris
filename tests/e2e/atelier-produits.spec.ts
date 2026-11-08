import path from "node:path";
import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Produits de l'Atelier (refonte du 07/11, « Shopify simplifié ») : la liste se cherche et se
 * filtre ; une pièce se duplique en brouillon, se renomme, se met en ligne puis s'archive ; une pièce
 * en brouillon ou archivée n'est jamais visible sur le site. Le parcours travaille sur une copie,
 * archivée à la fin, pour ne pas toucher aux pièces des autres tests.
 */
test("liste des produits : recherche, filtres, une ligne ouvre la fiche", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue`);
  await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ajouter un produit" })).toHaveAttribute("href", `${ATELIER}/catalogue/nouveau`);
  const filtres = page.getByRole("group", { name: "Afficher" });
  await expect(filtres.getByRole("button", { name: /^Toutes/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Chercher une pièce").fill("odessa");
  await expect(page.getByRole("link", { name: /La robe Odessa/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Le top Kira/ })).toHaveCount(0);
  await page.getByLabel("Chercher une pièce").fill("pièce qui n’existe pas");
  await expect(page.getByText(/Aucune pièce ne s’appelle/)).toBeVisible();
  await page.getByLabel("Chercher une pièce").fill("");
  // l'adresse exacte : des copies archivées du top Kira peuvent exister (parcours d'aperçu)
  await page.locator(`a[href="${ATELIER}/catalogue/top-kira"]`).click();
  await expect(page.getByRole("heading", { level: 1, name: "Le top Kira" })).toBeVisible();
  await expect(page.locator(".piece-tete .status")).toHaveText("En ligne");
  await expect(page.getByRole("link", { name: "Voir la pièce sur le site" })).toHaveAttribute("href", "/boutique/top-kira");
});

test("une pièce : copie en brouillon, textes, mise en ligne, archive, jamais visible hors ligne", async ({ page, browser }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue/robe-odessa`);
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/catalogue/robe-odessa-copie(-\\d+)?$`));
  const handle = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { level: 1, name: "La robe Odessa (copie)" })).toBeVisible();
  await expect(page.locator(".piece-tete .status")).toHaveText("Brouillon");
  await expect(page.getByText("Vos clientes ne la voient pas.")).toBeVisible();

  const visiteuse = await browser.newContext();
  const site = await visiteuse.newPage();
  try {
    // brouillon : introuvable sur le site
    expect((await site.goto(`/boutique/${handle}`))?.status()).toBe(404);

    // les textes : nom et accroche
    const nom = `Robe Essai ${Date.now().toString(36).slice(-4)}`;
    await page.getByLabel("Nom", { exact: true }).fill(nom);
    await page.getByLabel("Accroche").fill("Une pièce d’essai, créée pour les tests.");
    await page.getByRole("button", { name: "Enregistrer les textes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "C’est enregistré" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: nom })).toBeVisible();

    // en ligne : visible sur le site, avec son nouveau nom
    await page.getByRole("button", { name: "Mettre en ligne" }).click();
    await expect(page.locator(".piece-tete .status")).toHaveText("En ligne");
    await site.goto(`/boutique/${handle}`);
    await expect(site.getByRole("heading", { level: 1, name: nom })).toBeVisible();

    // archivée (après confirmation) : elle quitte le site, et se retrouve dans le filtre des archives
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Archiver" }).click();
    await expect(page.locator(".piece-tete .status")).toHaveText("Archivée");
    expect((await site.goto(`/boutique/${handle}`))?.status()).toBe(404);
    await site.goto("/boutique");
    await expect(site.getByRole("heading", { name: nom })).toHaveCount(0);
    await page.goto(`${ATELIER}/catalogue`);
    await page.getByRole("group", { name: "Afficher" }).getByRole("button", { name: /^Archivées/ }).click();
    await expect(page.getByRole("link", { name: new RegExp(nom) })).toContainText("Archivée");
  } finally {
    await visiteuse.close();
    // quoi qu'il arrive, la copie ne reste pas en ligne
    await page.request.post(`${ATELIER}/api/pieces/${handle}/statut`, { data: { statut: "archivee" } });
  }
});

test("textes refusés : un nom vide n'est pas enregistré", async ({ page }) => {
  await adminLogin(page);
  const r = await page.request.fetch(`${ATELIER}/api/pieces/top-kira`, { method: "PATCH", data: { title: "" } });
  expect(r.status()).toBe(400);
  // nouvelle pièce : un prix sous 1 € est refusé, avec ce qui est à revoir en mots simples
  const prix = await page.request.post(`${ATELIER}/api/catalogue`, { data: { notes: "", priceEuros: 0.004, sizes: ["S"], mediaIds: ["abcdef12"] } });
  expect(prix.status()).toBe(400);
  expect((await prix.json()).error).toMatch(/^À revoir.*le prix/);
  const inconnue = await page.request.post(`${ATELIER}/api/pieces/piece-inconnue/statut`, { data: { statut: "en-ligne" } });
  expect(inconnue.status()).toBe(400);
  expect((await inconnue.json()).error).toMatch(/n’existe pas/);
});

test("aperçu d'un brouillon : la vraie page du site, pour la créatrice seulement, sans commande possible", async ({ page, browser }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue/top-kira`);
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/catalogue/top-kira-copie(-\\d+)?$`));
  const handle = page.url().split("/").pop()!;
  const visiteuse = await browser.newContext();
  try {
    await page.getByRole("link", { name: "Voir l’aperçu sur le site" }).click();
    await expect(page).toHaveURL(new RegExp(`/boutique/${handle}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Le top Kira (copie)" })).toBeVisible();
    await expect(page.locator(".apercu-bandeau")).toContainText("Cette pièce est en brouillon");
    // rien ne s'ajoute au panier depuis un aperçu
    await expect(page.locator(".apercu-commande button").first()).toBeDisabled();
    await expect(page.getByRole("link", { name: "Revenir à sa fiche" })).toHaveAttribute("href", `${ATELIER}/catalogue/${handle}`);
    // ni balisage pour les moteurs, ni indexation
    await expect(page.locator('script[type="application/ld+json"]').filter({ hasText: '"Product"' })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // une visiteuse, elle, ne trouve rien
    const site = await visiteuse.newPage();
    expect((await site.goto(`/boutique/${handle}`))?.status()).toBe(404);
  } finally {
    await visiteuse.close();
    await page.request.post(`${ATELIER}/api/pieces/${handle}/statut`, { data: { statut: "archivee" } });
  }
});

test("photos d'une pièce : ajouter, choisir la principale, décrire, retirer", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ATELIER}/catalogue/robe-odessa`);
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/catalogue/robe-odessa-copie(-\\d+)?$`));
  const handle = page.url().split("/").pop()!;
  try {
    const photos = page.locator(".piece-photos-liste > li");
    const avant = await photos.count();
    expect(avant).toBeGreaterThan(0);
    // ajouter : la nouvelle photo arrive en dernier
    await page.locator(".piece-photos-liste ~ .dropzone input[type=file]").setInputFiles(path.join(__dirname, "fixture-piece.jpg"));
    await expect(page.getByRole("status").filter({ hasText: "1 photo ajoutée" })).toBeVisible();
    await expect(photos).toHaveCount(avant + 1);
    await expect(photos.last().locator("img")).toHaveAttribute("src", /\/api\/media\//);
    // la principale : la nouvelle passe en premier
    await photos.last().getByRole("button", { name: "Mettre en premier" }).click();
    await expect(photos.first().locator("img")).toHaveAttribute("src", /\/api\/media\//);
    await expect(photos.first()).toContainText("Photo principale");
    // ce que montre la photo : enregistré, et toujours là après un rechargement
    const texte = "La robe Odessa portée de face, dentelle noire sur fond clair.";
    await photos.first().getByLabel("Ce que montre la photo").fill(texte);
    await photos.first().getByRole("button", { name: "Enregistrer le texte" }).click();
    await expect(page.getByRole("status").filter({ hasText: "texte de la photo enregistré" })).toBeVisible();
    await page.reload();
    await expect(photos.first().getByLabel("Ce que montre la photo")).toHaveValue(texte);
    // retirer, après confirmation
    page.once("dialog", (d) => d.accept());
    await photos.first().getByRole("button", { name: "Retirer" }).click();
    await expect(photos).toHaveCount(avant);
    await expect(photos.first().locator("img")).not.toHaveAttribute("src", /\/api\/media\//);
    // une photo inconnue ou un texte trop court sont refusés
    const inconnue = await page.request.post(`${ATELIER}/api/pieces/${handle}/photos`, { data: { action: "texte", cle: "inconnue", alt: "Une photo qui n’existe pas" } });
    expect(inconnue.status()).toBe(400);
    expect((await inconnue.json()).error).toMatch(/plus sur la pièce/);
    const court = await page.request.post(`${ATELIER}/api/pieces/${handle}/photos`, { data: { action: "texte", cle: "inconnue", alt: "ok" } });
    expect(court.status()).toBe(400);
    expect((await court.json()).error).toMatch(/entre 3 et 240/);
  } finally {
    await page.request.post(`${ATELIER}/api/pieces/${handle}/statut`, { data: { statut: "archivee" } });
  }
});
