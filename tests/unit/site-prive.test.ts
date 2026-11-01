/** Site privé : ce qui reste ouvert à toutes quand SITE_PRIVE=1. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIVATE_PAGE, isPreviewKey, isPreviewToken, openWhilePrivate, previewKey, previewToken, sitePrive } from "@/lib/security/private-site";

test("site privé : seuls la page d’attente, les webhooks et les tâches planifiées restent ouverts", () => {
  assert.equal(openWhilePrivate(PRIVATE_PAGE), true);
  assert.equal(openWhilePrivate("/api/webhooks/shopify"), true);
  assert.equal(openWhilePrivate("/api/cron/agents"), true);
  for (const path of ["/", "/boutique/body-aura", "/la-maison", "/api/search", "/api/checkout", "/feeds/google.xml", "/acces-prive-bis", "/compte"]) {
    assert.equal(openWhilePrivate(path), false, path);
  }
});

test("site privé : interrupteur SITE_PRIVE=1 seulement", () => {
  const before = process.env.SITE_PRIVE;
  try {
    delete process.env.SITE_PRIVE;
    assert.equal(sitePrive(), false);
    process.env.SITE_PRIVE = "0";
    assert.equal(sitePrive(), false);
    process.env.SITE_PRIVE = "1";
    assert.equal(sitePrive(), true);
  } finally {
    if (before === undefined) delete process.env.SITE_PRIVE;
    else process.env.SITE_PRIVE = before;
  }
});

test("lien privé : seule la bonne clé ouvre le site, et changer la clé ferme les accès donnés", () => {
  const key = "cle-de-test-0123456789-abcdefgh";
  assert.equal(isPreviewKey(key, key), true);
  assert.equal(isPreviewKey(`${key}x`, key), false);
  assert.equal(isPreviewKey("", key), false);
  assert.equal(isPreviewKey(key, null), false);
  const token = previewToken(key);
  assert.ok(token);
  assert.ok(!token!.includes(key), "le cookie ne porte jamais la clé elle-même");
  assert.equal(isPreviewToken(token, key), true);
  assert.equal(isPreviewToken(token, "une-autre-cle-0123456789-abcdef"), false);
  assert.equal(isPreviewToken(token, null), false);
  assert.equal(isPreviewToken(undefined, key), false);
  assert.equal(isPreviewToken(`${token}x`, key), false);
});

test("lien privé : une clé trop courte pour ne pas être devinée n'ouvre rien", () => {
  const before = process.env.SITE_PRIVE_CLE;
  try {
    process.env.SITE_PRIVE_CLE = "courte";
    assert.equal(previewKey(), null);
    assert.equal(previewToken(), null);
    process.env.SITE_PRIVE_CLE = "une-cle-assez-longue-0123456789";
    assert.equal(previewKey(), "une-cle-assez-longue-0123456789");
  } finally {
    if (before === undefined) delete process.env.SITE_PRIVE_CLE;
    else process.env.SITE_PRIVE_CLE = before;
  }
});
