import type { Page } from "@playwright/test";

/** Pose le cookie de consentement pour que le bandeau ne gêne pas les tests (il est testé à part). */
export async function acceptCookies(page: Page) {
  const base = test_base();
  await page.context().addCookies([
    { name: "awrea_consent", value: encodeURIComponent(JSON.stringify({ v: 1, analytics: false, social: false, date: "2026-01-01" })), url: base },
  ]);
}

export function test_base() {
  return process.env.BASE_URL ?? "http://localhost:3100";
}

export const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "tablette-768", width: 768, height: 1024 },
  { name: "tablette-1024", width: 1024, height: 768 },
  { name: "portable-1280", width: 1280, height: 800 },
  { name: "ecran-1440", width: 1440, height: 900 },
  { name: "grand-1920", width: 1920, height: 1080 },
];
