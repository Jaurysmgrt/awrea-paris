/**
 * Atelier › E-mails › Parcours (cahier de l'Atelier du 10/11, § 4) : créer un parcours depuis un
 * modèle, l'ouvrir, changer une étape, s'envoyer un essai, l'activer en simulation, lancer un
 * passage, voir le journal de simulation et la prévision ; l'accord aux envois réels refusé sans
 * code ou avec un mauvais code, donné avec le bon, retiré à la fin sans code ; aucun e-mail de
 * parcours ne part pour de vrai (la variable PARCOURS_ENVOIS_REELS n'est pas posée pendant les tests).
 */
import { expect, test } from "@playwright/test";
import { adminLogin, ATELIER, ATELIER_EMAIL, nouveauCode } from "./admin-auth";
import { readStore } from "./helpers";

type Parti = { to: string; subject: string; tag?: string };
const partis = () => (readStore()["email:outbox"] as Parti[] | undefined) ?? [];

test("Parcours : du modèle au journal de simulation, sans aucun envoi réel", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `parcours-${Date.now()}@exemple.fr`;
  // une nouvelle inscrite à la lettre (le site lui envoie aussitôt son mot de bienvenue)
  const inscription = await page.request.post("/api/newsletter", { data: { formule: "compacte", email, consent: true, source: "e2e" } });
  expect(inscription.ok()).toBeTruthy();

  await adminLogin(page);
  await page.goto(`${ATELIER}/e-mails/parcours`);
  const onglets = page.getByRole("navigation", { name: "Rubriques des e-mails" });
  await expect(onglets.getByRole("link", { name: "Parcours" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1, name: "E-mails" })).toBeVisible();
  // simulation : ni la variable de Vercel, ni l'accord
  const envois = page.locator("section", { has: page.getByRole("heading", { name: "Envois" }) });
  await expect(envois.getByText("Simulation", { exact: true })).toBeVisible();
  await expect(envois.getByText("Pas posée")).toBeVisible();

  // créer le brouillon depuis le modèle « Nouvelle inscrite »
  await page.getByRole("button", { name: "Créer le brouillon « Nouvelle inscrite »" }).click();
  await page.waitForURL(/\/e-mails\/parcours\/p-[a-z0-9]+$/);
  const adresse = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Nouvelle inscrite" })).toBeVisible();
  await expect(page.getByText("Brouillon", { exact: true })).toBeVisible();

  // changer une étape : attendre 4 jours au lieu de 3
  const premiere = page.getByRole("listitem", { name: "Étape 1" });
  await expect(premiere).toContainText("Attendre");
  await premiere.getByLabel("Durée").fill("4");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Parcours enregistré." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem", { name: "Étape 1" }).getByLabel("Durée")).toHaveValue("4");

  // l'essai part seulement à la personne connectée
  const deuxieme = page.getByRole("listitem", { name: "Étape 2" });
  await deuxieme.getByRole("button", { name: "M’envoyer cet e-mail" }).click();
  await expect(deuxieme.getByRole("status")).toContainText(`Essai envoyé à ${ATELIER_EMAIL}`);
  expect(partis().some((m) => m.to === ATELIER_EMAIL && m.tag === "parcours-essai")).toBeTruthy();
  const id = adresse.split("/").pop()!;
  const autreAdresse = await page.request.post(`${ATELIER}/api/parcours/${id}`, { data: { action: "essai", email: "email-parcours-maison", to: email } });
  expect(autreAdresse.status()).toBe(400);
  // un e-mail de commande ne sert jamais dans un parcours
  const commande = await page.request.post(`${ATELIER}/api/parcours/${id}`, { data: { action: "essai", email: "email-commande-recue" } });
  expect(commande.status()).toBe(409);

  // l'activer : il tourne en simulation
  await page.getByRole("button", { name: "Activer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Parcours actif." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mettre en pause" })).toBeVisible();
  await expect(page.getByText("En simulation", { exact: true })).toBeVisible();

  // l'accord aux envois réels demande la confirmation et le code à six chiffres (12/11) : sans
  // confirmation, sans code ou avec un mauvais code, rien ne change
  const accord = (data: Record<string, unknown>) => page.request.post(`${ATELIER}/api/parcours`, { data: { action: "envois-reels", ...data } });
  expect((await accord({ actif: true })).status()).toBe(400);
  expect((await accord({ actif: true, confirme: true })).status()).toBe(400);
  const bon = await nouveauCode(page);
  const faux = String((Number(bon) + 1) % 1_000_000).padStart(6, "0");
  const refus = await accord({ actif: true, confirme: true, code: faux });
  expect(refus.status()).toBe(401);
  expect((await refus.json()).error).toMatch(/Code incorrect/);
  await page.goto(`${ATELIER}/e-mails/parcours`);
  await expect(envois.getByText("Pas donné", { exact: true })).toBeVisible();

  // avec le bon code, depuis l'écran : l'accord est donné, et noté avec la personne connectée ;
  // sans PARCOURS_ENVOIS_REELS, tout reste en simulation
  await envois.getByRole("switch", { name: "Autoriser les envois réels" }).click();
  const confirmation = envois.getByRole("form", { name: "Confirmer les envois réels" });
  await expect(confirmation).toContainText("Autoriser les envois réels des parcours");
  await confirmation.getByLabel("Votre code à six chiffres").fill(bon);
  await confirmation.getByRole("button", { name: "Confirmer avec ce code" }).click();
  await expect(envois.getByRole("status").filter({ hasText: "Votre accord est noté" })).toBeVisible();
  await expect(envois.getByText("Donné", { exact: true })).toBeVisible();
  await expect(envois.getByText(`Par ${ATELIER_EMAIL}`)).toBeVisible();
  await expect(envois.getByText("Simulation", { exact: true })).toBeVisible();

  // un passage maintenant : la nouvelle inscrite entre, rien ne part
  await page.getByRole("button", { name: "Lancer un passage maintenant" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Passage fait/ })).toBeVisible();
  await page.reload();
  const journal = page.locator("section", { has: page.getByRole("heading", { name: "Journal de simulation" }) });
  await expect(journal.getByText(`${email} entre dans « Nouvelle inscrite ».`).first()).toBeVisible();
  // la prévision : le premier e-mail partirait dans quatre jours
  const prevision = page.locator("section", { has: page.getByRole("heading", { name: "Les 30 prochains jours" }) });
  await expect(prevision.getByRole("row", { name: new RegExp(email.replace(/[.]/g, "\\.")) }).first()).toContainText("Awrea Paris, en quelques mots");
  // aucun e-mail de parcours dans la boîte d'envoi : seulement l'essai à l'Atelier
  expect(partis().filter((m) => m.tag === "parcours")).toHaveLength(0);
  expect(partis().filter((m) => m.to === email && m.tag?.startsWith("parcours"))).toHaveLength(0);

  // ranger : l'accord retiré, sans code ; le parcours en pause, puis retiré
  await envois.getByRole("switch", { name: "Envois réels autorisés" }).click();
  await expect(envois.getByRole("status").filter({ hasText: "Envois réels coupés" })).toBeVisible();
  await expect(envois.getByText("Pas donné", { exact: true })).toBeVisible();
  await page.goto(adresse);
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Parcours en pause." })).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Retirer le parcours" }).click();
  await page.waitForURL(/\/e-mails\/parcours$/);

  // hors de l'Atelier : rien
  const visiteuse = await page.context().browser()!.newContext();
  const base = page.url().split(ATELIER)[0];
  expect((await visiteuse.request.post(`${base}${ATELIER}/api/parcours`, { data: { action: "lancer" } })).status()).not.toBe(200);
  expect((await visiteuse.request.post(`${base}${ATELIER}/api/parcours/p-inconnu0`, { data: { action: "statut", statut: "actif" } })).status()).not.toBe(200);
  await visiteuse.close();
});
