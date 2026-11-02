/** Tableur des inscrites : lisible par Excel en français, et sans formule cachée dans une cellule. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { inscritesCsv } from "@/lib/email/lettre-csv";

test("tableur des inscrites : en-tête, séparateur « ; », guillemets échappés, formules neutralisées", () => {
  const csv = inscritesCsv([
    { email: "camille@exemple.fr", date: "2026-10-20T10:00:00Z", source: "lettre", prenom: "Camille", nom: "Essai" },
    { email: "=HYPERLINK(\"https://x\")@exemple.fr", date: null, source: "compte", prenom: "+33 6", nom: "Le \"Nom\"" },
  ]);
  const [entete, l1, l2] = csv.split("\r\n");
  assert.equal(entete, "﻿\"E-mail\";\"Prénom\";\"Nom\";\"Inscrite le\";\"Origine\"");
  assert.equal(l1, "\"camille@exemple.fr\";\"Camille\";\"Essai\";\"2026-10-20\";\"lettre\"");
  // une cellule qui commence par = ou + n'est jamais lue comme une formule
  assert.match(l2, /^"'=HYPERLINK\(""https:\/\/x""\)@exemple\.fr";"'\+33 6";"Le ""Nom""";"";"compte"$/);
});
