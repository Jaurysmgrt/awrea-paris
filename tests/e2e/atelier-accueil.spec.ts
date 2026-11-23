import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER } from "./admin-auth";

/**
 * Vue d'ensemble de l'Atelier et menu clair (brief de la créatrice du 03/11 et du 07/11) : ce qui attend, les gestes courants, quatre chiffres réels, les dernières
 * commandes ; un menu en six rubriques dont les sous-entrées n'apparaissent que dans leur rubrique.
 */
test("Vue d'ensemble : priorités, raccourcis, chiffres et dernières commandes mènent quelque part", async ({ page }) => {
  await adminLogin(page);
  await page.goto(ATELIER);
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour." })).toBeVisible();
  // démonstration : la page le dit, rien n'est présenté comme réel
  await expect(page.locator("#contenu").getByText(/Démonstration.*des exemples, pas des ventes/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "À faire en priorité" })).toBeVisible();
  const raccourcis = page.getByRole("navigation", { name: "Raccourcis" });
  for (const name of ["Ajouter un produit", "Voir les commandes", "Modifier mon site", "Changer une photo", "Écrire une lettre", "Voir le site"]) await expect(raccourcis.getByRole("link", { name })).toBeVisible();

  const kpis = page.locator(".kpis");
  await expect(kpis.getByText(/^Ventes de /)).toBeVisible();
  for (const label of ["Commandes à traiter", "En confection", "Nouvelles clientes"]) await expect(kpis.getByText(label, { exact: true })).toBeVisible();

  // les dernières commandes ouvrent leur fiche
  const dernieres = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dernières commandes" }) });
  const premiere = dernieres.getByRole("link").filter({ hasText: /AW-\d+/ }).first();
  const numero = (await premiere.innerText()).match(/AW-\d+/)![0];
  await premiere.click();
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(numero) })).toBeVisible();

  // « Ajouter un produit » mène au formulaire de la nouvelle pièce
  await page.goto(ATELIER);
  await raccourcis.getByRole("link", { name: "Ajouter un produit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nouvelle pièce" })).toBeVisible();
});

/**
 * Réponses de la créatrice du 12/11 : la domiciliation et le médiateur de la consommation ne sont
 * pas encore choisis. Tant que le registre légal ne les a pas, la liste « À faire en priorité » les
 * rappelle, avec la liste officielle des médiateurs pour le second.
 */
test("Vue d'ensemble : domiciliation et médiateur rappelés dans « À faire en priorité »", async ({ page }) => {
  await adminLogin(page);
  await page.goto(ATELIER);
  const todo = page.locator("section").filter({ has: page.getByRole("heading", { name: "À faire en priorité" }) });
  const adresse = todo.getByRole("link", { name: "Choisir l’adresse de la Maison" });
  const mediateur = todo.getByRole("link", { name: "Choisir un médiateur de la consommation" });
  await expect(adresse).toBeVisible();
  await expect(mediateur).toBeVisible();
  await expect(adresse).toHaveAttribute("href", "/mentions-legales#editrice");
  await expect(mediateur).toHaveAttribute("href", "/mentions-legales#mediation");
  // la liste officielle des médiateurs référencés, dans un nouvel onglet
  const liste = todo.getByRole("link", { name: "Liste officielle des médiateurs" });
  await expect(liste).toBeVisible();
  await expect(liste).toHaveAttribute("href", "https://www.economie.gouv.fr/mediation-conso/mediateurs-references");
  await expect(liste).toHaveAttribute("target", "_blank");

  // le rappel mène à l'endroit du site où l'adresse manque encore
  await adresse.click();
  await expect(page).toHaveURL(/\/mentions-legales#editrice$/);
  await expect(page.locator("section#editrice mark.todo")).toHaveText("[À COMPLÉTER : adresse de domiciliation]");
  await page.goto(ATELIER);
  await todo.getByRole("link", { name: "Choisir un médiateur de la consommation" }).click();
  await expect(page).toHaveURL(/\/mentions-legales#mediation$/);
  await expect(page.locator("section#mediation mark.todo")).toHaveText("[À COMPLÉTER : médiateur de la consommation]");
});

test("menu clair : six rubriques, sous-entrées dans leur rubrique, titres identiques aux pages", async ({ page }) => {
  await adminLogin(page);
  await page.goto(ATELIER);
  const side = page.locator(".admin__side");
  await expect(side).toHaveAttribute("data-theme", "ivory");
  const nav = page.getByRole("navigation", { name: "Menu de l’Atelier" });
  for (const titre of ["Ma boutique", "Mon site", "Mon activité", "Intelligence artificielle", "Paramètres"]) await expect(nav.getByText(titre, { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Vue d’ensemble", exact: true })).toHaveAttribute("aria-current", "page");
  // aucune entrée vide ni ancienne rubrique
  await expect(nav.getByText(/Coulisses|Fichier clientes|Aujourd’hui/)).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /^Retours/ })).toHaveCount(0);

  // chaque entrée ouvre la page qui porte son nom
  for (const [name, titre] of [
    ["Produits", "Produits"],
    ["Commandes", "Commandes"],
    ["Clientes", "Clientes"],
    ["Pages", "Pages"],
    ["Rendez-vous", "Rendez-vous"],
    ["Messages", "Messages"],
    ["À valider", "À valider"],
    ["Agents", "Agents"],
    ["Réglages", "Réglages"],
  ] as const) {
    // le nombre de choses à traiter peut suivre le nom (« Messages 3 à traiter »)
    await nav.getByRole("link", { name: new RegExp(`^${name}(\\s|$)`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: titre, exact: true }), name).toBeVisible();
  }

  // dans Commandes, ses sous-entrées apparaissent
  await nav.getByRole("link", { name: /^Commandes(\s|$)/ }).click();
  for (const name of [/^Retours/, /^Factures/]) await expect(nav.getByRole("link", { name })).toBeVisible();
  await nav.getByRole("link", { name: /^Retours/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Retours" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /^Retours/ })).toHaveAttribute("aria-current", "page");
});

test("téléphone : menu replié derrière un bouton, Vue d'ensemble sans débordement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminLogin(page);
  await page.goto(ATELIER);
  const nav = page.getByRole("navigation", { name: "Menu de l’Atelier" });
  await expect(nav.getByRole("link", { name: "Produits", exact: true })).toBeHidden();
  await nav.getByRole("button", { name: "Menu" }).click();
  await expect(nav.getByRole("link", { name: "Produits", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Fermer le menu" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

/**
 * Réglages › Connexions (parcours UX du 23/11) : la page ne s'élargissait plus sur téléphone
 * (1 239 px) et ne montrait que des noms de variables. Chaque service dit son état en mots simples et
 * ce qu'il apporte ; les noms techniques restent dans un détail replié, pour la personne qui
 * s'occupe du site.
 */
test("Réglages › Connexions : aucun débordement, des mots simples, le technique replié", async ({ page }) => {
  await adminLogin(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ATELIER}/reglages`);
    const bloc = page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: "Connexions" }) });
    await bloc.getByText("Voir chaque service", { exact: true }).click();
    const paiement = bloc.locator(".connexion").filter({ has: page.getByText("Paiement en ligne", { exact: true }) });
    await expect(paiement).toHaveCount(1);
    await expect(paiement).toContainText(/Branché|Pas encore branché/);
    await expect(paiement).toContainText("Les clientes règlent leur commande");
    await expect(bloc.getByRole("heading", { name: "À faire par la personne qui s’occupe du site" })).toBeVisible();
    // aucun nom de variable visible tant que le détail technique est replié
    const visible = await bloc.evaluate((el) => (el as HTMLElement).innerText);
    expect(visible, `${width}`).not.toMatch(/[A-Z]{2,}_[A-Z_]+|ACTIVATION\.md|\.data\/store/);
    await bloc.getByText("Détail technique", { exact: true }).click();
    await expect(bloc.getByText(/STRIPE_SECRET_KEY/)).toBeVisible();
    // toutes les parties repliées ouvertes, la page garde la largeur de l'écran
    for (const d of await page.locator("details.replie").all()) await d.evaluate((e) => ((e as HTMLDetailsElement).open = true));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${width}`).toBeLessThanOrEqual(0);
  }
});
