/** Site privé : ce qui reste ouvert à toutes quand SITE_PRIVE=1. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIVATE_PAGE, openWhilePrivate, sitePrive } from "@/lib/security/private-site";

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
