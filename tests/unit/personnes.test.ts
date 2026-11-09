/**
 * Personnes ajoutées à l'Atelier (lib/auth/personnes-regles.ts) : qui peut être ajoutée, le code
 * d'invitation (hasard, format, usage borné dans le temps), et ce qui est gardé (jamais le code).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INVITATION_DUREE_MS, PERSONNES_MAX, invitationAccepte, inviter, normaliserCode, nouveauCodeInvitation, problemeAjout, type Personne } from "@/lib/auth/personnes-regles";

const personne = (email: string, invitation?: Personne["invitation"]): Personne => ({ email, ajouteePar: "contact@awreaparis.com", ajouteeLe: "2026-11-09T12:00:00.000Z", invitation });

test("ajout : une adresse valide, nouvelle, dans la limite de cinq personnes", () => {
  const vercel = ["contact@awreaparis.com"];
  assert.equal(problemeAjout("  Lea@Exemple.fr ", { vercel, ajoutees: [] }), null);
  assert.match(problemeAjout("pas-une-adresse", { vercel, ajoutees: [] }) ?? "", /pas valide/);
  assert.match(problemeAjout("CONTACT@awreaparis.com", { vercel, ajoutees: [] }) ?? "", /entre déjà/);
  assert.match(problemeAjout("lea@exemple.fr", { vercel, ajoutees: [personne("lea@exemple.fr")] }) ?? "", /fait déjà partie/);
  const pleines = Array.from({ length: PERSONNES_MAX }, (_, i) => personne(`p${i}@exemple.fr`));
  assert.match(problemeAjout("nouvelle@exemple.fr", { vercel, ajoutees: pleines }) ?? "", /Retirez-en une/);
  assert.match(problemeAjout(`${"a".repeat(195)}@exemple.fr`, { vercel, ajoutees: [] }) ?? "", /pas valide/);
});

test("code d'invitation : seize signes sans confusion possible, en quatre groupes, jamais deux fois le même", () => {
  const vus = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = nouveauCodeInvitation();
    assert.match(code, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    assert.ok(!/[ILOU]/.test(code), code);
    vus.add(code);
  }
  assert.equal(vus.size, 2000);
});

test("invitation : le bon code, même tapé en minuscules ou avec des espaces, jusqu'à son échéance", () => {
  const maintenant = Date.parse("2026-11-09T12:00:00.000Z");
  const { code, invitation } = inviter(maintenant);
  const p = personne("lea@exemple.fr", invitation);
  assert.equal(Date.parse(invitation.expire) - maintenant, INVITATION_DUREE_MS);
  assert.equal(invitationAccepte(p, code, maintenant), true);
  assert.equal(invitationAccepte(p, code.toLowerCase().replace(/-/g, " "), maintenant + 1000), true);
  // un code faux, trop court, sans invitation ou échu : refusé
  assert.equal(invitationAccepte(p, nouveauCodeInvitation(), maintenant), false);
  assert.equal(invitationAccepte(p, code.slice(0, 9), maintenant), false);
  assert.equal(invitationAccepte(personne("lea@exemple.fr"), code, maintenant), false);
  assert.equal(invitationAccepte(null, code, maintenant), false);
  assert.equal(invitationAccepte(p, code, maintenant + INVITATION_DUREE_MS), false);
});

test("invitation : seule l'empreinte est gardée, jamais le code", () => {
  const { code, invitation } = inviter();
  const garde = JSON.stringify(invitation);
  assert.ok(!garde.includes(code));
  assert.ok(!garde.includes(normaliserCode(code)));
  assert.match(invitation.empreinte, /^[0-9a-f]{64}$/);
});
