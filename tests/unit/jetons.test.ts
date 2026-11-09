/**
 * Jetons signés de l'Atelier (lib/auth/session.ts) : un jeton n'a qu'une seule écriture. Un segment
 * ajouté ou retiré, ou un corps modifié, le rend invalide : le lien « Ce n'était pas moi » à usage
 * unique ne se rejoue pas en ajoutant « .1 » à la fin (relecture de sécurité du 09/11).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify } from "@/lib/auth/session";

test("un jeton signé se relit tel quel, et seulement tel quel", () => {
  const t = sign({ purpose: "revoquer", email: "contact@awreaparis.com" }, 60);
  assert.equal(verify<{ email: string }>(t)?.email, "contact@awreaparis.com");
  for (const variante of [`${t}.1`, `${t}.`, `.${t}`, t.split(".")[0], `${t.split(".")[0]}x.${t.split(".")[1]}`]) assert.equal(verify(variante), null, variante);
  assert.equal(verify(sign({ a: 1 }, -1)), null);
  assert.equal(verify(""), null);
  assert.equal(verify(null), null);
});
