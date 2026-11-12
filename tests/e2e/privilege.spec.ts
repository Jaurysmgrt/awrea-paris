/**
 * Étapes 4 et 5 des cahiers du 10/11 : la fenêtre « Profitez de votre privilège », l'inscription
 * confirmée par le bouton de la page du lien de l'e-mail, et le −10 % retiré d'office au premier
 * achat, seulement pour une adresse prouvée dans le navigateur (mode démonstration : paiement
 * d'essai, boîte d'envoi simulée).
 */
import { expect, test, type Page } from "@playwright/test";
import { acceptCookies, confirmerInscription, inscrire, ipUnique, lienDeConfirmation, lienRecu, outbox, waitForHydration } from "./helpers";
import { adminLogin, ATELIER } from "./admin-auth";

/** la fenêtre garde le même nom avant et après l'envoi : le titre de la créatrice */
const fenetre = (page: Page) => page.getByRole("dialog", { name: "Profitez de votre privilège" });
/** la fenêtre se présente quelques secondes après l'arrivée */
const ATTENTE = 15_000;
const unique = (nom: string) => `${nom}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}@exemple.fr`;
const euros = (c: number) => new RegExp(`${Math.floor(c / 100)},${String(c % 100).padStart(2, "0")}\\s€`);

async function prix(page: Page, handle: string): Promise<{ variant: string; price: number; title: string }> {
  const j = await (await page.request.get(`/api/products?handles=${handle}`)).json();
  const p = j.products[0] as { title: string; price: number; variants: { id: string }[] };
  return { variant: p.variants[0].id, price: p.price, title: p.title };
}

/** Coordonnées et paiement d'essai accepté sur la page /commande. */
async function payer(page: Page) {
  await page.getByLabel("Prénom").fill("Alma");
  await page.getByLabel("Nom", { exact: true }).fill("Privilège");
  await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Dentelle");
  await page.getByLabel("Code postal").fill("75011");
  await page.getByLabel("Ville").fill("Paris");
  await page.getByLabel("Numéro de carte").fill("4242 4242 4242 4242");
  await page.getByRole("checkbox", { name: /j’accepte les conditions générales de vente/i }).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page).toHaveURL(/\/commande\/confirmation/);
}

/** Commande d'essai passée directement par l'API (panier du navigateur du parcours). */
function commander(page: Page, email: string, extra: Record<string, unknown> = {}) {
  return page.request.post("/api/checkout", {
    data: { email, firstName: "Alma", lastName: "Privilège", address1: "12 rue de la Dentelle", zip: "75011", city: "Paris", country: "FR", shippingRateId: "fr-colissimo", paymentMethod: "card", testOutcome: "accepted", acceptTerms: true, ...extra },
    headers: ipUnique(),
  });
}

/** Adresse saisie au récapitulatif, puis la réponse du serveur sur le privilège. */
async function saisirEmail(page: Page, email: string) {
  const lu = page.waitForResponse((r) => r.url().endsWith("/api/checkout/privilege"));
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Prénom").focus();
  await lu;
}

test.describe("Fenêtre « Profitez de votre privilège »", () => {
  test("affichage, consentement obligatoire, fermeture, pas de réaffichage", async ({ page }) => {
    test.setTimeout(90_000);
    await acceptCookies(page, { privilege: true });
    await page.goto("/boutique");
    await waitForHydration(page);
    const f = fenetre(page);
    await expect(f).toBeVisible({ timeout: ATTENTE });
    // le titre de la créatrice, en minuscules comme les autres titres, et son texte mot pour mot
    await expect(f.getByRole("heading", { level: 2, name: "Profitez de votre privilège" })).toBeVisible();
    await expect(f.getByText("Inscrivez-vous à notre newsletter et profitez de 10 % de réduction sur votre première pièce.")).toBeVisible();
    await expect(f.getByText("Découvrez l’univers Awrea Paris et recevez nos actualités et nouveautés en avant-première.")).toBeVisible();
    await expect(f.getByText(/Valable 14 jours après la confirmation de votre inscription/)).toBeVisible();
    // case de consentement non cochée, obligatoire
    const consentement = f.getByRole("checkbox");
    await expect(consentement).not.toBeChecked();
    await f.getByLabel("Votre adresse e-mail").fill(unique("fenetre"));
    await f.getByRole("button", { name: "Recevoir mon privilège" }).click();
    await expect(f.getByText("Cochez la case pour recevoir la lettre et votre privilège.")).toBeVisible();
    await expect(consentement).toHaveAttribute("aria-invalid", "true");
    await expect(consentement).toBeFocused();
    // le focus reste dans la fenêtre
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    expect(await f.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    // Échap ferme ; la fenêtre ne revient pas avant 30 jours
    await page.keyboard.press("Escape");
    await expect(f).toBeHidden();
    const memoire = await page.evaluate(() => JSON.parse(localStorage.getItem("awrea_privilege") ?? "{}"));
    expect(memoire.vu).toBeTruthy();
    await page.reload();
    await waitForHydration(page);
    await page.waitForTimeout(ATTENTE - 3000);
    await expect(f).toBeHidden();
  });

  test("absente du paiement, du compte et tant que le panier est ouvert ; la croix ferme", async ({ page }) => {
    test.setTimeout(120_000);
    await acceptCookies(page, { privilege: true });
    for (const chemin of ["/commande", "/compte"]) {
      await page.goto(chemin);
      await waitForHydration(page);
      await page.waitForTimeout(ATTENTE - 4000);
      await expect(fenetre(page)).toBeHidden();
    }
    // le panier ouvert (« Mon Panier » ouvre un sous-menu, son entrée « Mon panier » ouvre le tiroir) :
    // la fenêtre attend qu'il se ferme
    await page.goto("/boutique");
    await waitForHydration(page);
    const nav = page.locator(".site-header").getByRole("navigation", { name: "Navigation principale" });
    const menu = nav.getByRole("button", { name: /Mon Panier\s*: 0 pièce/ });
    await menu.click();
    await nav.locator(`[id="${await menu.getAttribute("aria-controls")}"]`).getByRole("button", { name: /Mon panier\s*: 0 pièce/ }).click();
    await expect(page.locator("dialog.drawer")).toBeVisible();
    await page.waitForTimeout(ATTENTE - 3000);
    await expect(fenetre(page)).toBeHidden();
    await page.locator("dialog.drawer").getByRole("button", { name: "Fermer le panier" }).click();
    await expect(fenetre(page)).toBeVisible({ timeout: ATTENTE });
    await fenetre(page).getByRole("button", { name: "Fermer la fenêtre" }).click();
    await expect(fenetre(page)).toBeHidden();
  });

  test("inscription : rien avant le bouton de la page du lien, puis l'inscription et le privilège", async ({ page }) => {
    test.setTimeout(90_000);
    const email = unique("confirmation");
    await acceptCookies(page, { privilege: true });
    await page.setExtraHTTPHeaders(ipUnique());
    await page.goto("/");
    await waitForHydration(page);
    const f = fenetre(page);
    await expect(f).toBeVisible({ timeout: ATTENTE });
    await f.getByLabel("Votre adresse e-mail").fill(email);
    await f.getByRole("checkbox").check();
    await f.getByRole("button", { name: "Recevoir mon privilège" }).click();
    // le même nom de fenêtre après l'envoi, et un texte qui ne dit rien de l'adresse
    await expect(f.getByRole("heading", { name: "Merci" })).toBeVisible();
    await expect(f.getByText(/Si cette adresse n’est pas encore inscrite/)).toBeVisible();
    await f.getByRole("button", { name: "Fermer la fenêtre" }).click();

    // avant le clic : aucune lettre, aucun privilège ; ouvrir la page ne confirme rien (antivirus)
    const lien = await lienDeConfirmation(email);
    expect(lien).not.toContain(email.split("@")[0]);
    expect(outbox().filter((m) => m.to === email).map((m) => m.subject)).toEqual(["Confirmez votre inscription"]);
    await page.goto(lien);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const confirmer = page.getByRole("button", { name: "Confirmer mon inscription" });
    await expect(confirmer).toBeVisible();
    await page.waitForTimeout(1500);
    expect(outbox().filter((m) => m.to === email && m.subject === "La lettre de la Maison")).toHaveLength(0);
    await confirmer.click();
    await expect(page.getByRole("heading", { level: 2, name: "Votre inscription est confirmée" })).toBeVisible();
    await expect(page.getByText(/Votre privilège de bienvenue vous attend jusqu’au .* depuis cet appareil ou en vous connectant à votre compte/)).toBeVisible();
    // la bienvenue de la lettre part après la confirmation, une fois
    await expect.poll(() => outbox().filter((m) => m.to === email && m.subject === "La lettre de la Maison").length).toBe(1);
    // le lien rouvert ne change rien
    await page.reload();
    await page.getByRole("button", { name: "Confirmer mon inscription" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Votre inscription est confirmée" })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(outbox().filter((m) => m.to === email && m.subject === "La lettre de la Maison")).toHaveLength(1);
    // un faux lien n'ouvre rien
    await page.goto("/lettres/confirmation?jeton=faux.jeton");
    await expect(page.getByRole("heading", { level: 1, name: "Ce lien n’est plus valable" })).toBeVisible();
  });
});

test.describe("−10 % retiré d'office au premier achat", () => {
  test("la réduction se lit avant le paiement et sur la confirmation, une seule fois, alias compris", async ({ page }) => {
    test.setTimeout(150_000);
    const email = unique("premier.achat");
    await acceptCookies(page);
    const signup = await inscrire(page, { formule: "compacte", email, consent: true, source: "e2e" });
    expect(signup.ok(), await signup.text()).toBeTruthy();
    // le bouton de la page du lien, dans ce navigateur : le privilège y est rattaché
    const confirmee = await confirmerInscription(page, email);
    expect(confirmee.privilege).not.toBeNull();

    const chere = await prix(page, "robe-aria");
    const autre = await prix(page, "body-aura");
    expect(chere.price).toBeGreaterThan(autre.price);
    const remise = Math.round(chere.price / 10);
    await page.request.post("/api/cart", { data: { type: "clear" } });
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: chere.variant, quantity: 2 } })).ok()).toBeTruthy();
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: autre.variant } })).ok()).toBeTruthy();

    await page.goto("/commande");
    await waitForHydration(page);
    const recap = page.locator(".checkout-summary");
    const ligne = recap.locator(".totals__privilege");
    await expect(ligne).toHaveCount(0);
    await saisirEmail(page, email);
    // une ligne, avec le nom de la pièce, sur une seule unité de la plus chère, sans prix barré
    await expect(ligne).toContainText(`Privilège de bienvenue, 10 % sur ${chere.title}`);
    await expect(ligne).toContainText(euros(remise));
    await expect(recap.locator("s, del")).toHaveCount(0);
    // adresse prouvée ici : aucun lien « sur cet appareil » proposé
    await expect(page.getByRole("button", { name: "Recevoir mon privilège sur cet appareil" })).toHaveCount(0);
    const total = 2 * chere.price + autre.price - remise;
    await expect(page.getByRole("button", { name: /^Payer/ })).toContainText(euros(total));
    await payer(page);

    // la confirmation de commande montre la remise, comme l'e-mail et la facture
    const confirmation = page.locator(".confirmation__details .totals__privilege");
    await expect(confirmation).toContainText(`Privilège de bienvenue, 10 % sur ${chere.title}`);
    await expect(confirmation).toContainText(euros(remise));
    const numero = new URL(page.url()).searchParams.get("n")!;
    await expect.poll(() => outbox().find((m) => m.to === email && /Votre commande AW-\d+ est reçue/.test(m.subject))?.text ?? "").toContain(`Privilège de bienvenue, 10 % sur ${chere.title}`);

    // seconde commande (livraison offerte aussi) : plus de réduction
    expect((await page.request.post("/api/cart", { data: { type: "add", variantId: chere.variant, quantity: 2 } })).ok()).toBeTruthy();
    await page.goto("/commande");
    await waitForHydration(page);
    await saisirEmail(page, email);
    await page.waitForTimeout(300);
    await expect(recap.locator(".totals__privilege")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Payer/ })).toContainText(euros(2 * chere.price));
    // même en appelant le serveur directement, ni avec la même adresse, ni avec un alias
    for (const alias of [email, email.replace("@", "+bis@"), email.toUpperCase()]) {
      const api = await page.request.post("/api/checkout/privilege", { data: { email: alias } });
      expect((await api.json()).remise, alias).toBeNull();
    }
    await page.request.post("/api/cart", { data: { type: "clear" } });

    // l'Atelier : le privilège se lit sur la fiche de la commande
    await adminLogin(page);
    await page.goto(`${ATELIER}/commandes/${encodeURIComponent(numero)}`);
    await expect(page.getByText(new RegExp(`Privilège de bienvenue\\s: ${chere.title}`))).toBeVisible();
  });

  test("livraison offerte jugée avant le −10 %", async ({ page }) => {
    const email = unique("livraison");
    await acceptCookies(page);
    expect((await inscrire(page, { formule: "compacte", email, consent: true, source: "e2e" })).ok()).toBeTruthy();
    await confirmerInscription(page, email);
    const robe = await prix(page, "robe-sienna");
    const body = await prix(page, "body-aura");
    const sousTotal = robe.price + body.price;
    const remise = Math.round(robe.price / 10);
    // un panier au seuil de la livraison offerte, que la remise ferait passer dessous
    expect(sousTotal).toBeGreaterThanOrEqual(25_000);
    expect(sousTotal - remise).toBeLessThan(25_000);
    await page.request.post("/api/cart", { data: { type: "clear" } });
    await page.request.post("/api/cart", { data: { type: "add", variantId: robe.variant } });
    await page.request.post("/api/cart", { data: { type: "add", variantId: body.variant } });
    await page.goto("/commande");
    await waitForHydration(page);
    await saisirEmail(page, email);
    await expect(page.locator(".checkout-summary .totals__privilege")).toContainText(euros(remise));
    await expect(page.getByRole("button", { name: /^Payer/ })).toContainText(euros(sousTotal - remise));
    await page.request.post("/api/cart", { data: { type: "clear" } });
  });

  test("sans inscription confirmée, aucune réduction (commande sans compte)", async ({ page }) => {
    await acceptCookies(page);
    const email = unique("sans.confirmation");
    await inscrire(page, { formule: "compacte", email, consent: true, source: "e2e" });
    const piece = await prix(page, "robe-aria");
    await page.request.post("/api/cart", { data: { type: "clear" } });
    await page.request.post("/api/cart", { data: { type: "add", variantId: piece.variant } });
    const r = await page.request.post("/api/checkout/privilege", { data: { email } });
    expect((await r.json()).remise).toBeNull();
    await page.request.post("/api/cart", { data: { type: "clear" } });
  });

  test("preuve de l'adresse : rien pour un autre navigateur, puis le lien « sur cet appareil »", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const email = unique("appareil");
    // sur le téléphone : inscription confirmée, privilège ouvert
    await acceptCookies(page);
    await inscrire(page, { formule: "compacte", email, consent: true, source: "e2e" });
    expect((await confirmerInscription(page, email)).privilege).not.toBeNull();

    // sur l'ordinateur : même adresse, aucun cookie, aucune session
    const ordinateur = await browser.newContext();
    const o = await ordinateur.newPage();
    try {
      await acceptCookies(o);
      const piece = await prix(o, "robe-aria");
      await o.request.post("/api/cart", { data: { type: "clear" } });
      await o.request.post("/api/cart", { data: { type: "add", variantId: piece.variant } });
      const remise = Math.round(piece.price / 10);
      // le serveur ne dit rien : même réponse qu'une adresse inconnue
      const lu = await (await o.request.post("/api/checkout/privilege", { data: { email } })).json();
      const inconnue = await (await o.request.post("/api/checkout/privilege", { data: { email: unique("inconnue") } })).json();
      expect(lu).toEqual({ remise: null, nonCumulable: false, preuve: false });
      expect(inconnue).toEqual(lu);
      // et une commande avec l'adresse d'une autre ne prend pas son privilège
      const volee = await commander(o, email, { privilegeAffiche: remise });
      expect(volee.status()).toBe(409);

      await o.goto("/commande");
      await waitForHydration(o);
      await saisirEmail(o, email);
      await expect(o.locator(".checkout-summary .totals__privilege")).toHaveCount(0);
      await expect(o.getByText("Vous avez confirmé votre inscription sur un autre appareil ?")).toBeVisible();
      await o.getByRole("button", { name: "Recevoir mon privilège sur cet appareil" }).click();
      await expect(o.getByRole("status").filter({ hasText: /Si un privilège de bienvenue attend cette adresse/ })).toBeVisible();

      // une adresse sans privilège : la même réponse, et aucun e-mail
      const personne = unique("personne");
      expect((await o.request.post("/api/checkout/privilege/appareil", { data: { email: personne } })).ok()).toBeTruthy();

      // l'e-mail arrive ; son lien, ouvert sur l'ordinateur, y applique le privilège (après le bouton)
      const lien = await lienRecu(email, /Votre privilège sur cet appareil/);
      expect(lien).not.toContain(email.split("@")[0]);
      await o.goto(lien);
      await o.getByRole("button", { name: "Appliquer mon privilège ici" }).click();
      await expect(o.getByRole("heading", { level: 2, name: "Votre privilège est prêt sur cet appareil" })).toBeVisible();
      await o.getByRole("link", { name: "Reprendre ma commande" }).click();
      await waitForHydration(o);
      await saisirEmail(o, email);
      await expect(o.locator(".checkout-summary .totals__privilege")).toContainText(euros(remise));
      expect(outbox().some((m) => m.to === personne)).toBe(false);
      await o.request.post("/api/cart", { data: { type: "clear" } });
    } finally {
      await ordinateur.close();
    }
  });
});

test.describe("Case « Recevoir la lettre » cochée en commandant", () => {
  for (const [langue, sujet] of [
    ["fr", "Confirmez votre inscription"],
    ["en", "Confirm your sign-up"],
  ] as const) {
    test(`l'e-mail de confirmation part dans la langue de la commande (${langue})`, async ({ page }) => {
      const email = unique(`commande.lettre.${langue}`);
      await acceptCookies(page);
      const piece = await prix(page, "body-aura");
      await page.request.post("/api/cart", { data: { type: "clear" } });
      await page.request.post("/api/cart", { data: { type: "add", variantId: piece.variant } });
      const r = await commander(page, email, { newsletter: true, langue });
      expect(r.ok(), await r.text()).toBeTruthy();
      await expect.poll(() => outbox().filter((m) => m.to === email).map((m) => m.subject)).toContain(sujet);
      // inscription en attente du clic : aucune lettre avant
      expect(outbox().some((m) => m.to === email && /La lettre de la Maison|The Maison’s letter/.test(m.subject))).toBe(false);
      await page.request.post("/api/cart", { data: { type: "clear" } });
    });
  }
});
