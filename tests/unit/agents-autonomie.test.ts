/**
 * Ce que les agents font seuls (choix de la créatrice du 02/11) : les limites des e-mails, les avis
 * publiables sans elle, les corrections de page qui ne changent pas le sens, et le lien entre
 * chaque action autonome et son interrupteur des Réglages.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTONOMIES, avisPublicable, envoiPermis, LISTE_AUTONOMIES } from "@/lib/agents/autonomie-regles";
import { corrigerContenu, resumerCorrections } from "@/lib/agents/corrections";
import { AUTONOMIE_DE, POLICY } from "@/lib/agents/policy";

const NBSP = " ";

test("chaque action autonome dépend d'un interrupteur, et n'est jamais une action d'argent", () => {
  const liees = Object.entries(AUTONOMIE_DE);
  assert.deepEqual(new Set(liees.map(([, a]) => a)), new Set(LISTE_AUTONOMIES));
  for (const [action] of liees) assert.equal(POLICY[action as keyof typeof POLICY].approval, false, action);
  for (const a of LISTE_AUTONOMIES) assert.ok(AUTONOMIES[a].regle.length > 40, a);
  // l'argent et la lettre à toute la liste restent ses décisions
  for (const a of ["refund_order", "cancel_order", "change_price", "send_newsletter_all", "delete_product"] as const) assert.equal(POLICY[a].approval, true, a);
});

test("e-mails partis seuls : un seul par sujet, au plus un par cliente et par semaine", () => {
  const now = new Date("2026-11-10T09:00:00Z");
  assert.equal(envoiPermis({}, "camille@exemple.fr", "retour:R-1", now), true);
  // même sujet : jamais deux fois
  assert.equal(envoiPermis({ "sujet:retour:R-1": "2026-10-01T09:00:00Z" }, "camille@exemple.fr", "retour:R-1", now), false);
  // même cliente il y a trois jours (l'adresse compte sans les majuscules) : on attend
  assert.equal(envoiPermis({ "cliente:camille@exemple.fr": "2026-11-07T09:00:00Z" }, "Camille@Exemple.fr", "cercle:c1", now), false);
  // il y a huit jours : permis
  assert.equal(envoiPermis({ "cliente:camille@exemple.fr": "2026-11-02T09:00:00Z" }, "camille@exemple.fr", "cercle:c1", now), true);
});

test("avis publiés sans la créatrice : vérifiés, sans photo, sans souci, sans coordonnées", () => {
  assert.equal(avisPublicable({ body: "Une robe magnifique, la dentelle est d’une grande finesse.", fit: "juste" }), true);
  assert.equal(avisPublicable({ body: "Une robe magnifique, portée pour un mariage." }), true);
  // une photo, une taille qui ne tombe pas juste : à elle
  assert.equal(avisPublicable({ body: "Une robe magnifique, portée pour un mariage.", photos: ["p1"] }), false);
  assert.equal(avisPublicable({ body: "Une robe magnifique, portée pour un mariage.", fit: "petite" }), false);
  // un souci, même au détour d'une phrase, avec ou sans accent
  for (const body of ["Très belle mais reçue abîmée, dommage.", "Belle pièce, un peu déçue par le délai.", "Le colis est arrivé ouvert.", "Jolie, mais la couture était cassée", "Elle taille petit, trop petite pour moi"]) assert.equal(avisPublicable({ body }), false, body);
  // des coordonnées ou un lien : à elle
  assert.equal(avisPublicable({ body: "Superbe, écrivez-moi sur camille@exemple.fr" }), false);
  assert.equal(avisPublicable({ body: "Superbe pièce, voir https://exemple.fr" }), false);
  // trop court pour être lu
  assert.equal(avisPublicable({ body: "Top" }), false);
});

test("corrections sans changement de sens : typographie et descriptions de photo, jamais l'officiel", () => {
  const page = {
    titre: "L'atelier vous répond : chaque jour",
    lien: { label: "Voir l'atelier", href: "/l'atelier" },
    image: { src: "/media/img/sienna-1", alt: "", width: 800, height: 1200 },
    autre: { src: "/media/img/inconnue", alt: "" },
    apropos: { officiel: true, texte: "Texte de la créatrice : repris tel quel, avec l'apostrophe droite." },
    email: "Bonjour {prenom}, l'atelier vous écrit.",
    code: "AW-1042",
  };
  const { value, corrections } = corrigerContenu(page, "fr", { "/media/img/sienna-1.webp": "La robe Sienna, dentelle noire et or" });
  assert.equal(value.titre, `L’atelier vous répond${NBSP}: chaque jour`);
  assert.equal(value.lien.label, "Voir l’atelier");
  // champs techniques intacts
  assert.equal(value.lien.href, "/l'atelier");
  assert.equal(value.code, "AW-1042");
  // la photo d'une pièce reprend la description du catalogue ; une photo inconnue reste à décrire
  assert.equal(value.image.alt, "La robe Sienna, dentelle noire et or");
  assert.equal(value.autre.alt, "");
  // texte officiel et texte à variables : jamais retouchés
  assert.deepEqual(value.apropos, page.apropos);
  assert.equal(value.email, page.email);
  assert.equal(resumerCorrections(corrections), "2 corrections de typographie, 1 description de photo");
  // déjà propre : rien à faire
  assert.equal(corrigerContenu(value, "fr").corrections.length, 0);
});
