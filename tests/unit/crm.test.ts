/**
 * CRM de la Maison (cahier de l'Atelier du 10/11, § 1 et 5) : une fiche par adresse normalisée,
 * statut de la lettre et preuve du consentement, désinscription valable partout, règle unique des
 * envois marketing, segments.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abonnerParCompte,
  avecCoordonnees,
  cleCanonique,
  confirmer,
  demander,
  dernieresDesinscriptions,
  desinscrire,
  purgerAttente,
  etatLettre,
  fusionnerContacts,
  historique,
  libelleLettre,
  modifier,
  normaliserEmail,
  nouvelleFiche,
  peutRecevoirMarketingSelon,
  segmentsDe,
  compterParSegment,
  type FicheCRM,
  type SourcesCRM,
} from "@/lib/crm/regles";

const T0 = new Date("2026-11-01T10:00:00Z");
const T1 = new Date("2026-11-02T10:00:00Z");
const T2 = new Date("2026-11-03T10:00:00Z");
const idDe = (e: string) => `d_${e.replace(/[^a-z]/g, "").slice(0, 12)}`;
const vide = (): SourcesCRM => ({ fiches: {}, anciennes: [], comptes: [], commandes: [], rendezVous: [] });

test("adresse normalisée : minuscules, aucun espace, ni insécable ni invisible", () => {
  assert.equal(normaliserEmail("  Camille.Durand@Exemple.FR "), "camille.durand@exemple.fr");
  assert.equal(normaliserEmail("camille @exemple.fr"), "camille@exemple.fr");
  assert.equal(normaliserEmail("ca mille​@exemple.fr"), "camille@exemple.fr");
});

test("une fiche par adresse : compte, commande, ancienne inscription, rendez-vous et CRM réunis", () => {
  const s = vide();
  s.comptes.push({ id: "uuid-1", email: "Camille@Exemple.fr", prenom: "Camille", nom: null, telephone: null, creeLe: "2026-10-05T00:00:00Z", cercle: false, lettre: false, lettreLe: null });
  s.commandes.push({ number: "AW-1", email: " camille@exemple.fr", createdAt: "2026-10-10T00:00:00Z", total: 26000, status: "paid", prenom: "Camille", nom: "Durand" });
  s.commandes.push({ number: "AW-2", email: "CAMILLE@EXEMPLE.FR", createdAt: "2026-10-12T00:00:00Z", total: 10000, status: "pending" });
  s.anciennes.push({ email: "camille@exemple.fr", date: "2026-09-01T00:00:00Z", source: "footer" });
  s.rendezVous.push({ email: "camille@exemple.fr", name: "Camille Durand", start: "2026-11-20T10:00:00Z", createdAt: "2026-11-02T00:00:00Z", status: "confirme", type: "visio" });
  s.fiches["camille@exemple.fr"] = { ...nouvelleFiche("camille@exemple.fr", T0), telephone: "06 00 00 00 00" };
  // une autre personne, inscrite seulement
  s.anciennes.push({ email: "lea@exemple.fr", date: "2026-10-20T00:00:00Z" });
  const liste = fusionnerContacts(s, idDe, T2);
  assert.equal(liste.length, 2);
  const c = liste.find((x) => x.email.toLowerCase() === "camille@exemple.fr")!;
  assert.equal(c.id, "uuid-1", "le compte donne l'identifiant");
  assert.equal(c.compte, true);
  assert.equal(c.ordersCount, 1, "seules les ventes comptent");
  assert.equal(c.totalSpent, 26000);
  assert.equal(c.lastName, "Durand", "nom repris de la commande à défaut d'autre");
  assert.equal(c.telephone, "06 00 00 00 00", "les coordonnées du CRM priment");
  assert.equal(c.createdAt, "2026-09-01T00:00:00Z", "la première trace donne la date d'inscription");
  assert.equal(c.lettre.statut, "abonnee");
  assert.deepEqual(c.segments, ["clientes", "abonnees"]);
  const lea = liste.find((x) => x.email === "lea@exemple.fr")!;
  assert.equal(lea.id, idDe("lea@exemple.fr"));
  assert.equal(lea.compte, false);
  assert.ok(lea.segments.includes("prospects"));
});

test("statut de la lettre : le CRM fait foi, puis l'ancienne liste, puis la case du compte", () => {
  assert.equal(etatLettre({}).statut, "non-abonnee");
  assert.equal(etatLettre({ ancienne: { email: "a@b.fr", date: "2026-01-01T00:00:00Z" } }).statut, "abonnee");
  const compte = etatLettre({ compte: { lettre: true, lettreLe: null, creeLe: "2026-02-01T00:00:00Z" } });
  assert.equal(compte.statut, "abonnee");
  assert.equal(compte.confirmee, true, "adresse vérifiée par la connexion");
  const f = desinscrire(nouvelleFiche("a@b.fr", T0), { source: "lien" }, T1);
  // désinscrite dans le CRM : l'ancienne liste et la case du compte ne la réabonnent pas
  const e = etatLettre({ fiche: f, ancienne: { email: "a@b.fr" }, compte: { lettre: true, lettreLe: null, creeLe: "2026-02-01T00:00:00Z" } });
  assert.equal(e.statut, "desinscrite");
  assert.equal(peutRecevoirMarketingSelon(e), false);
});

test("double confirmation : rien avant le clic, abonnée après, preuve gardée", () => {
  let f = nouvelleFiche("Camille@Exemple.fr", T0);
  assert.equal(f.email, "camille@exemple.fr");
  f = demander(f, { source: "fenetre", texte: "J’accepte de recevoir la lettre." }, T0);
  const avant = etatLettre({ fiche: f });
  assert.equal(avant.statut, "non-abonnee");
  assert.ok(avant.attente);
  assert.equal(peutRecevoirMarketingSelon(avant), false, "jamais d'e-mail marketing avant la confirmation");
  assert.equal(libelleLettre(avant), "Non abonnée · à confirmer");
  const r = confirmer(f, avant, T1)!;
  assert.equal(r.nouvelle, true);
  const apres = etatLettre({ fiche: r.fiche });
  assert.equal(apres.statut, "abonnee");
  assert.equal(apres.confirmee, true);
  assert.deepEqual(apres.preuve, { texte: "J’accepte de recevoir la lettre.", le: T0.toISOString(), source: "fenetre", confirmeLe: T1.toISOString() });
  assert.equal(r.fiche.attente, undefined);
  // le même lien rouvert : rien ne change
  const encore = confirmer(r.fiche, apres, T2)!;
  assert.equal(encore.deja, true);
  assert.equal(encore.fiche, r.fiche);
});

test("désinscription : vaut partout, annule une inscription en attente, un ancien lien ne réabonne pas", () => {
  let f = demander(nouvelleFiche("a@b.fr", T0), { source: "footer", texte: "Oui" }, T0);
  f = confirmer(f, etatLettre({ fiche: f }), T0)!.fiche;
  f = demander(f, { source: "fenetre", texte: "Oui" }, T1);
  f = desinscrire(f, { source: "atelier", par: "Créatrice" }, T2);
  const e = etatLettre({ fiche: f });
  assert.equal(e.statut, "desinscrite");
  assert.equal(e.attente, null);
  assert.equal(confirmer(f, e, T2), null, "le lien reçu avant la désinscription ne réabonne pas");
  assert.equal(f.historique[0].type, "desinscription");
  assert.match(f.historique[0].detail!, /atelier \(Créatrice\)/);
  // une nouvelle inscription demande une nouvelle confirmation
  const g = demander(f, { source: "fenetre", texte: "Oui" }, T2);
  assert.equal(etatLettre({ fiche: g }).statut, "desinscrite");
  assert.equal(etatLettre({ fiche: confirmer(g, etatLettre({ fiche: g }), T2)!.fiche }).statut, "abonnee");
});

test("compte : case cochée = consentement confirmé ; décochée = désinscription", () => {
  const f = abonnerParCompte(nouvelleFiche("a@b.fr", T0), etatLettre({}), "Je souhaite recevoir la lettre.", T0);
  const e = etatLettre({ fiche: f });
  assert.equal(e.statut, "abonnee");
  assert.equal(e.source, "compte");
  assert.equal(e.confirmee, true);
});

test("l'Atelier corrige les coordonnées, sans jamais toucher au statut de la lettre", () => {
  const f = modifier(nouvelleFiche("a@b.fr", T0), { prenom: " Inès ", telephone: "" }, "Créatrice", T1);
  assert.equal(f.prenom, "Inès");
  assert.equal(f.telephone, undefined);
  assert.equal(f.lettre, undefined);
  assert.equal(f.historique[0].type, "modification");
  // rien de changé : la fiche reste la même
  assert.equal(modifier(f, { prenom: "Inès" }, "Créatrice", T2), f);
});

test("segments : clientes, prospects, abonnées, nouvelles inscrites, désinscrites", () => {
  const maintenant = new Date("2026-11-30T00:00:00Z");
  const abonnee = (depuis: string) => ({ statut: "abonnee" as const, depuis, attente: null });
  assert.deepEqual(segmentsDe({ ordersCount: 0, lettre: abonnee("2026-11-20T00:00:00Z") }, maintenant), ["prospects", "abonnees", "nouvelles-inscrites"]);
  assert.deepEqual(segmentsDe({ ordersCount: 2, lettre: abonnee("2026-01-01T00:00:00Z") }, maintenant), ["clientes", "abonnees"]);
  assert.deepEqual(segmentsDe({ ordersCount: 0, lettre: { statut: "desinscrite", depuis: null, attente: null } }, maintenant), ["desinscrites"]);
  assert.deepEqual(segmentsDe({ ordersCount: 0, lettre: { statut: "non-abonnee", depuis: null, attente: { le: "x", source: "fenetre" } } }, maintenant), ["prospects"]);
  assert.deepEqual(segmentsDe({ ordersCount: 0, lettre: { statut: "non-abonnee", depuis: null, attente: null } }, maintenant), []);
  const n = compterParSegment([{ segments: ["clientes", "abonnees"] }, { segments: ["prospects", "abonnees"] }]);
  assert.equal(n.abonnees, 2);
  assert.equal(n.desinscrites, 0);
});

test("clé canonique du privilège : « +… » partout, points et googlemail chez Gmail seulement", () => {
  assert.equal(cleCanonique(" Jeanne+2@Gmail.com "), "jeanne@gmail.com");
  assert.equal(cleCanonique("j.e.anne@gmail.com"), "jeanne@gmail.com");
  assert.equal(cleCanonique("j.eanne+promo@googlemail.com"), "jeanne@gmail.com");
  assert.equal(cleCanonique("jeanne+boutique@exemple.fr"), "jeanne@exemple.fr");
  assert.equal(cleCanonique("j.eanne@exemple.fr"), "j.eanne@exemple.fr", "ailleurs, un point change l'adresse");
  assert.equal(cleCanonique("+tout@exemple.fr"), "+tout@exemple.fr", "un « + » en tête n'est pas un alias");
});

test("personne ne réécrit la fiche d'une autre : coordonnées gardées dans la demande, appliquées au clic sans rien écraser", () => {
  const abonnee = confirmer(demander({ ...nouvelleFiche("ines@exemple.fr", T0), prenom: "Inès" }, { source: "footer", texte: "Oui", coordonnees: { prenom: "Inès", nom: "Martin" } }, T0), etatLettre({}), T0)!.fiche;
  assert.equal(abonnee.nom, "Martin");
  // un tiers remplit le formulaire avec son adresse : la fiche ne change pas avant le clic
  const demande = demander(abonnee, { source: "fenetre", texte: "Oui", coordonnees: { prenom: "Pirate", nom: "X", telephone: "0600000000" } }, T1);
  assert.equal(demande.prenom, "Inès");
  assert.equal(demande.nom, "Martin");
  assert.equal(demande.telephone, undefined);
  assert.deepEqual(demande.attente?.coordonnees, { prenom: "Pirate", nom: "X", telephone: "0600000000" });
  // une demande confirmée complète seulement ce qui manque, jamais une valeur de la fiche ou du compte
  const nouvelle = demander(nouvelleFiche("lea@exemple.fr", T0), { source: "fenetre", texte: "Oui", coordonnees: { prenom: "Léa", nom: "Bernard", telephone: "0611111111" } }, T0);
  const c = confirmer(nouvelle, etatLettre({ fiche: nouvelle }), T1, { prenom: "Léa-Marie", nom: null, telephone: null })!.fiche;
  assert.equal(c.prenom, undefined, "le prénom du compte prime");
  assert.equal(c.nom, "Bernard");
  assert.equal(c.telephone, "0611111111");
  assert.equal(c.attente, undefined);
  assert.equal(avecCoordonnees(c, { nom: "Autre" }), c, "rien n'est remplacé");
});

test("filet des désinscriptions : une désinscription plus récente que l'accord l'emporte, une nouvelle inscription confirmée aussi", () => {
  const f = confirmer(demander(nouvelleFiche("a@b.fr", T0), { source: "footer", texte: "Oui" }, T0), etatLettre({}), T1)!.fiche;
  // la fiche n'a pas pu être mise à jour, mais la liste des désinscriptions a noté le clic
  const e = etatLettre({ fiche: f, desinscriteLe: T2.toISOString() });
  assert.equal(e.statut, "desinscrite");
  assert.equal(peutRecevoirMarketingSelon(e), false);
  // désinscription plus ancienne que la confirmation : abonnée
  assert.equal(etatLettre({ fiche: f, desinscriteLe: T0.toISOString() }).statut, "abonnee");
  // ancienne liste sans date : la désinscription l'emporte
  assert.equal(etatLettre({ ancienne: { email: "a@b.fr" }, desinscriteLe: T0.toISOString() }).statut, "desinscrite");
  assert.deepEqual(dernieresDesinscriptions([{ email: "A@B.fr ", date: T0.toISOString() }, { email: "a@b.fr", date: T2.toISOString() }, { email: 3, date: "x" }]), { "a@b.fr": T2.toISOString() });
  const s = vide();
  s.fiches["a@b.fr"] = f;
  s.desinscriptions = { "a@b.fr": T2.toISOString() };
  const [k] = fusionnerContacts(s, idDe, T2);
  assert.equal(k.lettre.statut, "desinscrite");
  assert.ok(k.segments.includes("desinscrites"));
});

test("inscription jamais confirmée : effacée un jour après l'expiration de son lien", () => {
  const demande = demander(nouvelleFiche("a@b.fr", T0), { source: "fenetre", texte: "Oui", coordonnees: { prenom: "Ana" } }, T0);
  const jours = (n: number) => new Date(T0.getTime() + n * 86_400_000);
  assert.equal(purgerAttente(demande, jours(7), 8), null, "le lien vaut encore");
  assert.deepEqual(purgerAttente(demande, jours(8.1), 8), { fiche: null }, "rien d'autre : la fiche disparaît");
  // une désinscrite qui redemande sans confirmer : la demande s'efface, la désinscription reste
  const desinscrite = demander(desinscrire(nouvelleFiche("a@b.fr", T0), { source: "lien" }, T0), { source: "fenetre", texte: "Oui" }, T0);
  const p = purgerAttente(desinscrite, jours(9), 8)!;
  assert.equal(p.fiche?.attente, undefined);
  assert.equal(p.fiche?.lettre?.statut, "desinscrite");
});

test("historique : inscription, confirmation, commandes et rendez-vous, du plus récent au plus ancien", () => {
  let f: FicheCRM = demander(nouvelleFiche("a@b.fr", T0), { source: "fenetre", texte: "Oui" }, T0);
  f = confirmer(f, etatLettre({ fiche: f }), T1)!.fiche;
  const h = historique({ fiche: f, commandes: [{ number: "AW-9", email: "a@b.fr", createdAt: T2.toISOString(), total: 12345, status: "paid" }], rendezVous: [] });
  assert.deepEqual(
    h.map((m) => m.type),
    ["commande", "confirmation", "inscription"],
  );
  assert.equal(h[0].texte, "Commande AW-9, 123,45 €");
  assert.match(h[1].texte, /fenêtre de bienvenue/);
});
