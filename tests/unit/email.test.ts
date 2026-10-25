/** E-mails modifiables sans code : rendu, repères, cas, textes à écrire, export vers les services. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail, type EmailContext } from "@/lib/email/render";
import { createEmailBlock, emailTexts, type EmailDoc } from "@/lib/email/blocks";
import { EmailDocSchema } from "@/lib/email/schema";

const ctx: EmailContext = {
  site: "https://www.exemple.fr",
  commun: { devise: "Consommer plus juste", lignePied: "Pièces créées sur demande par des artisans français", desinscription: "Ne plus recevoir les lettres", mentions: "", voirPiece: "Voir la pièce", total: "Total" },
  vars: { prenom: "Camille", precommande: "" },
  unsubscribe: "https://www.exemple.fr/lettres/desinscription?jeton=x",
};

const doc: EmailDoc = {
  nom: "Essai",
  quand: "Pour les tests.",
  famille: "lettre",
  sujet: "Bonjour {prenom}",
  preheader: "Une ligne d’aperçu",
  variables: { prenom: { description: "Le prénom", exemple: "Camille" }, precommande: { description: "Une précommande", exemple: "oui" } },
  blocs: [
    { id: "b-test0001", type: "entete", fond: "noir" },
    { id: "b-test0002", type: "titre", titre: "Pour vous, {prenom}" },
    { id: "b-test0003", type: "texte", texte: "Premier paragraphe <b>.\n\nSecond paragraphe." },
    { id: "b-test0004", type: "texte", texte: "Votre pièce est en fabrication.", si: "precommande" },
    { id: "b-test0005", type: "texte", texte: "[Écrire le texte]" },
    { id: "b-test0006", type: "bouton", lien: { label: "Voir les pièces", href: "/boutique" } },
    { id: "b-test0007", type: "pied", note: "" },
  ],
};

test("rendu : repères remplacés, HTML échappé, liens absolus, mode sombre, désinscription", () => {
  const m = renderEmail(doc, ctx);
  assert.equal(m.subject, "Bonjour Camille");
  assert.match(m.html, /Pour vous, Camille/);
  assert.match(m.html, /Premier paragraphe &lt;b&gt;\./);
  assert.match(m.html, /href="https:\/\/www\.exemple\.fr\/boutique"/);
  assert.match(m.html, /prefers-color-scheme:dark/);
  assert.match(m.html, /\[data-ogsc\]/);
  assert.match(m.html, /Ne plus recevoir les lettres/);
  assert.match(m.text, /Voir les pièces : https:\/\/www\.exemple\.fr\/boutique/);
  assert.doesNotMatch(m.text, /—|–/);
});

test("cas et textes à écrire : un bloc conditionnel ou entre crochets ne part jamais", () => {
  const sans = renderEmail(doc, ctx);
  assert.doesNotMatch(sans.html, /en fabrication/);
  assert.doesNotMatch(sans.html, /Écrire le texte/);
  const avec = renderEmail(doc, { ...ctx, vars: { prenom: "Camille", precommande: "oui" } });
  assert.match(avec.html, /en fabrication/);
});

test("export : syntaxe Brevo, Klaviyo et Shopify ; aperçus Gmail et Outlook sans polices du site", () => {
  assert.match(renderEmail(doc, { ...ctx, syntax: "brevo" }).html, /\{\{ contact\.PRENOM \}\}.*|\{\{ unsubscribe \}\}/s);
  assert.match(renderEmail(doc, { ...ctx, syntax: "klaviyo" }).html, /\{% unsubscribe_url %\}/);
  const shop = renderEmail({ ...doc, famille: "commande", blocs: [...doc.blocs, { id: "b-test0008", type: "commande" }] }, { ...ctx, syntax: "shopify" });
  assert.match(shop.html, /\{\{ customer\.first_name \}\}/);
  assert.match(shop.html, /\{% for line in line_items %\}/);
  assert.doesNotMatch(renderEmail(doc, { ...ctx, client: "outlook" }).html, /@font-face/);
  assert.match(renderEmail(doc, { ...ctx, client: "apple" }).html, /@font-face/);
});

test("bibliothèque et validation : blocs neufs valides, forme inconnue refusée, textes listés", () => {
  const b = createEmailBlock("texte");
  assert.ok(b && b.type === "texte");
  assert.ok(EmailDocSchema.safeParse({ ...doc, blocs: [...doc.blocs, b] }).success);
  assert.ok(!EmailDocSchema.safeParse({ ...doc, blocs: [{ id: "b-xxxx0001", type: "script", texte: "x" }] }).success);
  assert.ok(!EmailDocSchema.safeParse({ ...doc, blocs: [{ id: "b-xxxx0001", type: "bouton", lien: { label: "x", href: "javascript:alert(1)" } }] }).success);
  assert.ok(emailTexts(doc).some((t) => t.path === "blocs.1.titre"));
});
