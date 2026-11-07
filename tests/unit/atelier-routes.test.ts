/**
 * Défense en profondeur de l'Atelier (SECURITE.md, audit du 07/11) : l'adresse secrète et la
 * redirection de proxy.ts ne suffisent pas, chaque route de app/api/gestion revérifie elle-même la
 * session. Seules les étapes de la connexion (avant toute session), la déconnexion et la sortie du
 * mode Édition en sont dispensées, et cette liste ne s'allonge pas sans le dire ici.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../app/api/gestion");

/** routes ouvertes avant la session, ou qui ne font que la fermer */
const SANS_SESSION = new Set([
  "login/route.ts",
  "login/totp/route.ts",
  "login/enroll/route.ts",
  "login/setup/route.ts",
  "login/passkey/route.ts",
  "login/passkey/options/route.ts",
  "login/revoquer/route.ts",
  "logout/route.ts",
  "edition/sortir/route.ts",
]);

function routes(dir: string, rel = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(full).isDirectory()) return routes(full, r);
    return name === "route.ts" ? [r] : [];
  });
}

test("chaque route de l'Atelier revérifie la session, sauf la connexion et la déconnexion", () => {
  const all = routes(ROOT);
  assert.ok(all.length > 40, "routes de l'Atelier introuvables");
  const sansControle = all.filter((r) => !SANS_SESSION.has(r) && !/\b(isAdmin|currentAdmin|editor)\(/.test(readFileSync(path.join(ROOT, r), "utf8")));
  assert.deepEqual(sansControle, [], `routes sans contrôle de session : ${sansControle.join(", ")}`);
  // la liste des exceptions ne garde pas de route disparue
  for (const r of SANS_SESSION) assert.ok(all.includes(r), `exception sans route : ${r}`);
});
