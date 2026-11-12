/** E-mails modifiables sans code : rendu, repères, cas, textes à écrire, export vers les services. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail, type EmailContext } from "@/lib/email/render";
import { brandEmail } from "@/lib/email/templates";
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

test("export : syntaxe Brevo et Klaviyo ; aperçus Gmail et Outlook sans polices du site", () => {
  assert.match(renderEmail(doc, { ...ctx, syntax: "brevo" }).html, /\{\{ contact\.PRENOM \}\}.*|\{\{ unsubscribe \}\}/s);
  assert.match(renderEmail(doc, { ...ctx, syntax: "klaviyo" }).html, /\{% unsubscribe_url %\}/);
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

// ------------------------------------------------------------------ éditeur façon Brevo (10/11)

const mis = (blocs: EmailDoc["blocs"]): EmailDoc => ({ ...doc, blocs });

test("mise en forme : police de la Maison, taille, alignement, espaces ; sans réglage, l'allure d'origine", () => {
  // sans réglage, un titre suit la règle du site (12/11) : grand titre en Fraunces droite fine
  const origine = renderEmail(mis([{ id: "b-test0101", type: "titre", titre: "Bonjour" }]), ctx).html;
  assert.match(origine, /font-style:normal;font-weight:300;font-size:40px;line-height:48px;[^"]*text-align:center/);
  assert.match(origine, /padding:0px 48px 32px/);
  // la police choisie dans l'éditeur l'emporte : l'italique reste possible
  const regle = renderEmail(mis([{ id: "b-test0102", type: "titre", titre: "Bonjour", police: "italique", taille: "grande", align: "gauche", avant: 16, apres: 64 }]), ctx).html;
  assert.match(regle, /font-style:italic;font-weight:400;font-size:48px;line-height:56px;[^"]*text-align:left/);
  assert.match(regle, /padding:16px 48px 64px/);
  assert.match(regle, /fraunces-72pt-italic-latin\.woff2/);
  const texte = renderEmail(mis([{ id: "b-test0103", type: "texte", texte: "Petit mot.", taille: "petite", align: "droite", police: "texte" }]), ctx).html;
  assert.match(texte, /font-size:16px;line-height:24px;[^"]*text-align:right/);
});

test("typographie du site : grands titres droits et fins, petits titres en italique, à toutes les tailles", () => {
  for (const taille of ["petite", "normale", "grande"] as const) {
    const html = renderEmail(mis([{ id: "b-test0111", type: "titre", titre: "Bonjour", taille }]), ctx).html;
    // 28 px et plus : toujours un grand titre
    const m = html.match(/<h1[^>]*style="[^"]*font-style:(\w+);font-weight:(\d+);font-size:(\d+)px/);
    assert.ok(m, taille);
    assert.deepEqual([m[1], m[2]], ["normal", "300"], taille);
    assert.ok(Number(m[3]) >= 28, taille);
  }
  // signature, nom d'une pièce, devise du pied : petits titres, Fraunces italique 400
  const petits = renderEmail(
    mis([
      { id: "b-test0112", type: "signature", texte: "La Maison" },
      { id: "b-test0113", type: "produit", pieces: ["body-aura"] },
      { id: "b-test0114", type: "pied", note: "" },
    ]),
    { ...ctx, products: { "body-aura": { title: "Le body Aura", href: "/produits/body-aura" } } },
  ).html;
  assert.match(petits, /<p class="e-ink" style="margin:0;font-family:'Fraunces', Georgia, serif;font-style:italic;font-weight:400;font-size:24px/);
  assert.match(petits, /font-style:italic;font-weight:400;font-size:24px;line-height:32px;[^"]*">Le body Aura</);
  assert.match(petits, /font-style:italic;font-weight:400;font-size:24px;line-height:32px;[^"]*">Consommer plus juste</);
  // les deux faces de Fraunces sont déclarées, avec leur style et leur graisse
  assert.match(petits, /font-family:'Fraunces';font-weight:300;font-style:normal;src:url\('https:\/\/www\.exemple\.fr\/fonts\/fraunces-120pt-light-latin\.woff2'\)/);
  assert.match(petits, /font-family:'Fraunces';font-weight:400;font-style:italic;src:url\('https:\/\/www\.exemple\.fr\/fonts\/fraunces-72pt-italic-latin\.woff2'\)/);
});

test("repli sans police du site : Georgia, jamais Times New Roman dans Outlook pour Windows", () => {
  const envoi = renderEmail(mis([{ id: "b-test0121", type: "titre", titre: "Bonjour" }]), ctx).html;
  // les polices du site, cachées à Outlook pour Windows ; Georgia imposé à Outlook seul
  assert.match(envoi, /<!--\[if !mso\]><!--><style>@font-face/);
  assert.match(envoi, /<\/style><!--<!\[endif\]-->/);
  assert.match(envoi, /<!--\[if mso\]><style>h1,p,div,td,a,span\{font-family:Georgia,serif!important\}<\/style><!\[endif\]-->/);
  // chaque texte garde son repli dans la pile de polices
  assert.match(envoi, /font-family:'Fraunces', Georgia, serif;font-style:normal;font-weight:300/);
  // aperçus Gmail et Outlook : Georgia directement, la graisse et le style du titre gardés
  assert.match(renderEmail(mis([{ id: "b-test0122", type: "titre", titre: "Bonjour" }]), { ...ctx, client: "outlook" }).html, /font-family:Georgia, serif;font-style:normal;font-weight:300/);
});

test("gabarit des e-mails du site (retours, alertes, suivi) : la même typographie", () => {
  const m = brandEmail({ preheader: "Aperçu", title: "Votre retour est enregistré", paragraphs: ["Bonjour."], signature: "La Maison" });
  assert.match(m.html, /<h1 style="margin:0 0 32px;font-family:'Fraunces', Georgia, serif;font-style:normal;font-weight:300;font-size:40px/);
  assert.match(m.html, /font-style:italic;font-weight:400;font-size:24px;line-height:32px;[^"]*white-space:pre-line;">La Maison</);
  assert.match(m.html, /fraunces-120pt-light-latin\.woff2/);
  assert.match(m.html, /<!--\[if mso\]><style>h1,p,div,td,a,span\{font-family:Georgia,serif!important\}/);
});

test("photo : largeur et alignement dans un tableau aligné ; photo et texte côte à côte, empilés sur téléphone", () => {
  const img = { src: "/media/essai", alt: "Une robe", width: 1200, height: 1500 };
  const photo = renderEmail(mis([{ id: "b-test0201", type: "image", image: img, largeur: 50, align: "droite" }]), ctx).html;
  assert.match(photo, /<table role="presentation" align="right" width="252"/);
  assert.match(photo, /<img src="https:\/\/www\.exemple\.fr\/media\/essai\.webp" width="252"/);
  const cote = renderEmail(mis([{ id: "b-test0202", type: "photo-texte", image: img, texte: "La dentelle.", cote: "droite" }]), ctx).html;
  assert.match(cote, /dir="rtl"/);
  assert.match(cote, /class="e-col"/);
  assert.match(cote, /\.e-col\{display:block!important/);
  const deux = renderEmail(mis([{ id: "b-test0203", type: "deux-photos", image: img, image2: { ...img, alt: "Un body" } }]), ctx).html;
  assert.equal((deux.match(/width="244"/g) ?? []).length >= 2, true);
  const bouton = renderEmail(mis([{ id: "b-test0204", type: "bouton", lien: { label: "Voir", href: "/boutique" }, style: "contour", align: "gauche" }]), ctx).html;
  assert.match(bouton, /align="left"[\s\S]*border:1px solid #0a0a0a;border-radius:999px/);
});

test("liens dans un texte : écrits par la Maison seulement ; une valeur de cliente ne devient jamais un lien", () => {
  const m = renderEmail(mis([{ id: "b-test0301", type: "texte", texte: "Voir [la boutique](/boutique) ou [nous écrire](mailto:contact@exemple.fr), {prenom}." }]), { ...ctx, vars: { prenom: "[ici](https://piege.example)" } });
  assert.match(m.html, /<a href="https:\/\/www\.exemple\.fr\/boutique" style="color:inherit;">la boutique<\/a>/);
  assert.match(m.html, /<a href="mailto:contact@exemple\.fr"/);
  assert.doesNotMatch(m.html, /href="https:\/\/piege\.example"/);
  assert.match(m.html, /\[ici\]\(https:\/\/piege\.example\)/);
  assert.match(m.text, /la boutique : https:\/\/www\.exemple\.fr\/boutique/);
  const js = renderEmail(mis([{ id: "b-test0302", type: "texte", texte: "[clic](javascript:alert(1))" }]), ctx).html;
  assert.doesNotMatch(js, /<a href="javascript/);
});

test("aperçu de l'éditeur : blocs repérés et blocs à écrire visibles ; jamais dans un e-mail envoyé", () => {
  const blocs: EmailDoc["blocs"] = [
    { id: "b-test0401", type: "texte", texte: "[Écrire le texte]" },
    { id: "b-test0402", type: "image", image: { src: "", alt: "[Décrire]", width: 1200, height: 1500 } },
    { id: "b-test0403", type: "espace", hauteur: 48 },
  ];
  const apercu = renderEmail(mis(blocs), { ...ctx, marks: true }).html;
  assert.match(apercu, /<tbody data-bloc="b-test0401" data-a-ecrire>/);
  assert.match(apercu, /Écrire le texte/);
  assert.match(apercu, /data-champ="image"/);
  assert.match(apercu, /height:48px/);
  const envoi = renderEmail(mis(blocs), ctx).html;
  assert.doesNotMatch(envoi, /data-bloc|data-champ|Écrire le texte|Glissez/);
});

test("validation des réglages : valeurs prévues seulement", () => {
  const ok = (b: Record<string, unknown>) => EmailDocSchema.safeParse(mis([{ id: "b-test0501", type: "titre", titre: "x", ...b } as EmailDoc["blocs"][number]])).success;
  assert.ok(ok({ police: "droite", taille: "grande", align: "centre", avant: 8, apres: 64 }));
  assert.ok(!ok({ police: "comic" }));
  assert.ok(!ok({ avant: 12 }));
  assert.ok(!ok({ apres: 72 }));
  assert.ok(!ok({ largeur: 20 }));
  assert.ok(!ok({ couleur: "#ff0000" }));
  for (const type of ["photo-texte", "deux-photos", "espace"]) assert.ok(EmailDocSchema.safeParse(mis([createEmailBlock(type)!])).success, type);
});
