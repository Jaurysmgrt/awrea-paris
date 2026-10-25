import { expect, test, type APIRequestContext } from "@playwright/test";
import { acceptCookies } from "./helpers";

/** Réponse texte complète de l'assistante (flux NDJSON). */
async function ask(request: APIRequestContext, content: string): Promise<string> {
  const res = await request.post("/api/assistant", { data: { messages: [{ role: "user", content }] } });
  return (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((e) => e.type === "text")
    .map((e) => e.text)
    .join("");
}

test.describe("Assistante clientes (mode démonstration sans clé API)", () => {
  test("conseil de taille, carte de la pièce créée sur demande et transmission à la créatrice", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/robe-odessa");
    await page.getByRole("button", { name: "Une question ?" }).click();
    const panel = page.getByRole("dialog", { name: "L’assistante Awrea" });
    await expect(panel).toBeVisible();

    await panel.getByLabel("Votre question").fill("Je fais du 38, quelle taille pour la robe Odessa ?");
    await panel.getByRole("button", { name: "Envoyer" }).click();
    await expect(panel.getByText(/correspond à notre taille M/)).toBeVisible();
    const card = panel.locator(".assistant__piece", { hasText: "La robe Odessa" });
    await expect(card).toBeVisible();
    // la carte donne le délai de fabrication, jamais un stock
    await expect(card).toContainText(/Sur demande, \d+ à \d+ semaines/);
    await expect(card).not.toContainText(/stock|épuisé|restante/i);

    await panel.getByLabel("Votre question").fill("Je voudrais parler à la créatrice, mon e-mail est cliente.test@exemple.fr");
    await panel.getByRole("button", { name: "Envoyer" }).click();
    await expect(panel.getByText(/Votre message est entre les mains de la créatrice/)).toBeVisible();

    // la conversation survit à une navigation
    await panel.getByRole("link", { name: /La robe Odessa/ }).first().click();
    await expect(panel.getByText(/correspond à notre taille M/)).toBeVisible();

    // fermeture au clavier
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("étape d’une commande : seulement avec le numéro et l’e-mail de la commande", async ({ request }) => {
    expect(await ask(request, "Où en est la commande AW-1031 ? intrus@exemple.fr")).toContain("Je ne trouve aucune commande");
    expect(await ask(request, "Où en est ma commande AW-1031 ?")).toContain("l’adresse e-mail utilisée pour la commande AW-1031");
    const ok = await ask(request, "Où en est la commande AW-1031 ? camille.demo@exemple.fr");
    expect(ok).toContain("Votre commande AW-1031");
    expect(ok).toContain("livrée");
    // sans numéro ni session : rien n'est dit d'une commande
    expect(await ask(request, "Suivre ma commande")).toContain("numéro de commande");
  });

  test("délais, livraison et retours : création sur demande et conditions générales de vente", async ({ request }) => {
    const delai = await ask(request, "Combien de temps pour ma pièce ?");
    expect(delai).toContain("créée sur demande");
    expect(delai).toContain("artisans français");
    expect(delai).not.toMatch(/série|numérotée|liste d’attente|précommande/i);

    const livraison = await ask(request, "Livrez-vous en Belgique ?");
    expect(livraison).toContain("France métropolitaine");
    expect(livraison).toContain("5 à 10 jours ouvrés");

    const retour = await ask(request, "Je voudrais retourner ma robe");
    expect(retour).toContain("quatorze jours");
    expect(retour).toContain("frais de retour restent à votre charge");

    // une information que la Maison n'a pas donnée n'est jamais inventée
    const entretien = await ask(request, "Comment laver le body Aura ?");
    expect(entretien).toContain("la créatrice vous répondra");
    expect(entretien).not.toMatch(/eau froide|nettoyage à sec|\d+ %/);
  });
});
