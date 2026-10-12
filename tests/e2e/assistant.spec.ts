import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

test.describe("Assistante clientes (mode démonstration sans clé API)", () => {
  test("conseil de taille, carte de la pièce et transmission à l’atelier", async ({ page }) => {
    await acceptCookies(page);
    await page.goto("/boutique/robe-odessa");
    await page.getByRole("button", { name: "Une question ?" }).click();
    const panel = page.getByRole("dialog", { name: "L’assistante Awrea" });
    await expect(panel).toBeVisible();

    await panel.getByLabel("Votre question").fill("Je fais du 38, quelle taille pour la robe Odessa ?");
    await panel.getByRole("button", { name: "Envoyer" }).click();
    await expect(panel.getByText(/correspond à notre taille M/)).toBeVisible();
    await expect(panel.locator(".assistant__piece", { hasText: "Robe Odessa" })).toBeVisible();

    await panel.getByLabel("Votre question").fill("Je voudrais parler à la créatrice, mon e-mail est cliente.test@exemple.fr");
    await panel.getByRole("button", { name: "Envoyer" }).click();
    await expect(panel.getByText(/Transmis à l’atelier/)).toBeVisible();

    // la conversation survit à une navigation
    await page.getByRole("link", { name: "Robe Odessa" }).first().click();
    await expect(panel.getByText(/correspond à notre taille M/)).toBeVisible();

    // fermeture au clavier
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  test("suivi de commande protégé par l’e-mail", async ({ request }) => {
    const res = await request.post("/api/assistant", { data: { messages: [{ role: "user", content: "Où en est la commande AW-1031 ? intrus@exemple.fr" }] } });
    const text = (await res.text())
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((e) => e.type === "text")
      .map((e) => e.text)
      .join("");
    expect(text).toContain("Je ne trouve aucune commande");
  });
});
