import { defineConfig } from "@playwright/test";

/** Outils de mesure ponctuels (hors de la suite de tests) : voir justification.spec.ts. */
export default defineConfig({ testDir: ".", timeout: 180_000, use: { launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} } });
