import { expect, test } from "@playwright/test";
import { acceptCookies } from "./helpers";

/**
 * Panier latéral (cahier des modifications du 27/10) : sur un ordinateur portable ou un téléphone,
 * la pièce ajoutée se voit tout de suite, avec sa photo, sa quantité et « Retirer » ; la zone des
 * lignes défile à la molette malgré le défilement doux du site ; retirer une pièce recalcule le total.
 */
async function addPiece(page: import("@playwright/test").Page, handle: string) {
  await page.goto(`/boutique/${handle}`);
  await page.locator(".product-form .chip").first().click();
  await page.locator(".product-form__actions").getByRole("button", { name: "Ajouter au panier" }).click();
  const drawer = page.locator("dialog.drawer");
  await expect(drawer).toBeVisible();
  // le panier glisse depuis la droite : mesurer une fois l'animation finie
  await drawer.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
}

for (const size of [
  { name: "ordinateur portable", width: 1280, height: 700 },
  { name: "téléphone", width: 375, height: 667 },
]) {
  test(`panier sur ${size.name} : pièce ajoutée visible, quantité, molette, retrait et total`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await acceptCookies(page);
    await addPiece(page, "body-aura");
    await page.keyboard.press("Escape");
    await addPiece(page, "robe-odessa");
    const drawer = page.locator("dialog.drawer");
    const body = drawer.locator(".drawer__body");
    const added = drawer.locator(".cart-line", { hasText: "La robe Odessa" });
    // la pièce ajoutée, sa photo, sa quantité et « Retirer » tiennent dans la zone visible
    const zone = (await body.boundingBox())!;
    for (const part of [added.locator(".cart-line__media"), added.locator(".cart-line__qty"), added.getByRole("button", { name: "Retirer", exact: true })]) {
      const box = (await part.boundingBox())!;
      expect(box.y, "en haut de la zone").toBeGreaterThanOrEqual(zone.y - 1);
      expect(box.y + box.height, "en bas de la zone").toBeLessThanOrEqual(zone.y + zone.height + 1);
    }
    await expect(added.locator(".cart-line__media img")).toBeVisible();
    await expect(added.locator(".cart-line__qty")).toContainText("Quantité");
    await expect(added.getByRole("group", { name: /Quantité/ })).toContainText("1");
    // molette dans le panier (ordinateur) : la zone des lignes défile
    if (size.width > 1024) {
      await body.evaluate((el) => el.scrollTo(0, 0));
      await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2);
      await page.mouse.wheel(0, 400);
      await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    // retirer une pièce : la ligne disparaît et le total se recalcule
    const total = drawer.locator(".drawer__total dd");
    await expect(total).toHaveText(/^170,00\s€$/);
    await drawer.locator(".cart-line", { hasText: "Le body Aura" }).getByRole("button", { name: "Retirer", exact: true }).click();
    await expect(drawer.locator(".cart-line")).toHaveCount(1);
    await expect(total).toHaveText(/^100,00\s€$/);
  });
}
