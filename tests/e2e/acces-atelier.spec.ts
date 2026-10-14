import { expect, test } from "@playwright/test";
import { outbox } from "./helpers";
import { adminLogin, ATELIER, ATELIER_EMAIL } from "./admin-auth";

/** second compte autorisé des tests (playwright.config.ts) : on peut le bloquer sans gêner les autres */
const LOCKABLE = process.env.E2E_ATELIER_LOCKABLE ?? "bloquee@exemple.fr";

/**
 * L'Atelier est invisible pour le public : adresse secrète, routes internes introuvables, aucune
 * trace dans les pages publiques, exclu des moteurs ; comptes autorisés avec double
 * authentification, blocage après plusieurs échecs, alerte à chaque connexion, lien « ce n'était
 * pas moi ».
 */
test.describe.configure({ mode: "serial" });

const someIp = () => ({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });

test("routes internes introuvables, adresse absente des pages publiques, moteurs écartés", async ({ page, request }) => {
  expect((await request.get("/gestion", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get("/gestion/commandes", { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.post("/api/gestion/agents/seo")).status()).toBe(404);
  expect((await request.post("/api/gestion/login", { data: { email: ATELIER_EMAIL, password: "x" } })).status()).toBe(404);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /prive-");
  expect(robots).not.toContain(ATELIER);
  for (const path of ["/", "/boutique", "/la-maison", "/sitemap.xml"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain(ATELIER);
    expect(html, path).not.toMatch(/href="\/gestion/);
  }
  // la page de connexion elle-même n'est pas indexable
  const login = await page.goto(`${ATELIER}/connexion`);
  expect(login!.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // sans session, toute page de l'Atelier mène à la connexion
  await page.goto(`${ATELIER}/commandes`);
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/connexion\\?suite=%2Fcommandes`));
});

test("adresse inconnue ou mauvais mot de passe : blocage après cinq essais, même réponse pour une adresse qui n'existe pas", async ({ request }) => {
  for (const email of ["inconnue@exemple.fr", LOCKABLE]) {
    for (let i = 0; i < 5; i++) {
      const r = await request.post(`${ATELIER}/api/login`, { headers: someIp(), data: { email, password: `faux-${i}` } });
      expect(r.status(), email).toBe(401);
      expect((await r.json()).error).toBe("Adresse ou mot de passe incorrect.");
    }
    const blocked = await request.post(`${ATELIER}/api/login`, { headers: someIp(), data: { email, password: "encore-faux" } });
    expect(blocked.status(), email).toBe(429);
    expect((await blocked.json()).error).toContain("bloqué pour une demi-heure");
  }
  // la titulaire du compte réel est prévenue ; rien n'est envoyé pour une adresse inconnue
  await expect.poll(() => outbox().some((m) => m.to.includes(LOCKABLE) && m.subject === "Compte de l’Atelier bloqué")).toBeTruthy();
  expect(outbox().some((m) => m.to.includes("inconnue@exemple.fr"))).toBeFalsy();
});

test("connexion : alerte e-mail, puis « ce n’était pas moi » ferme les sessions et remet le compte à zéro", async ({ page }) => {
  const before = outbox().length;
  await adminLogin(page);
  await expect.poll(() => outbox().slice(0, outbox().length - before + 1).some((m) => m.to.includes(ATELIER_EMAIL) && /^Connexion (inhabituelle )?à l’Atelier$/.test(m.subject))).toBeTruthy();
  const mail = outbox().find((m) => m.to.includes(ATELIER_EMAIL) && /^Connexion (inhabituelle )?à l’Atelier$/.test(m.subject))!;
  const link = new URL(mail.text.match(/https?:\/\/\S+\/revoquer\?t=\S+/)![0]);
  expect(link.pathname).toBe(`${ATELIER}/revoquer`);
  await page.goto(`${link.pathname}${link.search}`);
  await page.getByRole("button", { name: "Fermer toutes les sessions" }).click();
  await expect(page.getByRole("status")).toContainText("Toutes les sessions sont fermées");
  // la session est fermée
  await page.goto(`${ATELIER}/commandes`);
  await expect(page).toHaveURL(new RegExp(`${ATELIER}/connexion`));
  // le compte est remis à zéro : la connexion suivante le recrée (mot de passe d'installation)
  await adminLogin(page);
});
