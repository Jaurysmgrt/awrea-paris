import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
/** adresse secrète de l'Atelier et comptes autorisés du serveur de test (tests/e2e/admin-auth.ts) */
const ADMIN_PATH = process.env.E2E_ADMIN_PATH ?? "/prive-e2e0atelier0test";
const ATELIER_ACCOUNTS = `${process.env.E2E_ATELIER_EMAIL ?? "contact@awreaparis.com"},${process.env.E2E_ATELIER_LOCKABLE ?? "bloquee@exemple.fr"}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" }, testMatch: /checkout|signatures|a11y|rendez-vous/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npx next start -p 3100", url: BASE_URL, reuseExistingServer: true, timeout: 120_000, env: { ADMIN_PATH, ATELIER_ACCOUNTS } },
});
