/**
 * Parcours de vente (cahier de l'Atelier du 10/11, § 4 et 5) : entrée, délais, condition, sortie à
 * la désinscription et à l'achat, plafond de fréquence, exclusion, jamais deux fois le même e-mail,
 * passage rejoué sans doublon, simulation sans envoi, envois réels bloqués sans la variable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { avancer, modeDesEnvois, passage, prevoir, statistiques, type EmailEtat, type Entree, type Envoi, type Ports } from "@/lib/marketing/parcours/moteur";
import { MODELES } from "@/lib/marketing/parcours/modeles";
import { DefinitionSchema, EnvoisReelsSchema, manqueAccord } from "@/lib/marketing/parcours/schema";
import { etatVide, type Contact, type Etat, type LigneJournal, type Mode, type Parcours } from "@/lib/marketing/parcours/types";
import { EmailDocSchema } from "@/lib/email/schema";
import type { EmailDoc } from "@/lib/email/blocks";

const JOUR = 86_400_000;
const T0 = new Date("2026-11-12T08:30:00.000Z");
const jour = (n: number, minutes = 0) => new Date(T0.getTime() + n * JOUR + minutes * 60_000);

const contact = (email: string, extra: Partial<Contact> = {}): Contact => ({
  email,
  prenom: "Camille",
  marketing: true,
  inscriteLe: jour(-1).toISOString(),
  compte: false,
  cercle: false,
  segment: "nouvelle",
  commandes: [],
  interetLe: null,
  panierLe: null,
  dernierMarketing: null,
  ...extra,
});

const parcours = (extra: Partial<Parcours> = {}): Parcours => ({
  id: "p-bienvenue",
  nom: "Nouvelle inscrite",
  statut: "actif",
  declencheur: "inscription",
  fenetreJours: 14,
  entree: ["sans-commande"],
  etapes: [
    { id: "a-1", type: "attente", duree: 3, unite: "jours" },
    { id: "e-1", type: "email", email: "email-parcours-maison" },
    { id: "a-2", type: "attente", duree: 7, unite: "jours" },
    { id: "e-2", type: "email", email: "email-parcours-savoir-faire" },
  ],
  objectif: "achat",
  sortieSiConditions: true,
  exclusions: ["autre-parcours"],
  creeLe: T0.toISOString(),
  creePar: "atelier@exemple.fr",
  modifieLe: T0.toISOString(),
  modifiePar: "atelier@exemple.fr",
  ...extra,
});

const EMAILS: Record<string, EmailEtat> = {
  "email-parcours-maison": { pret: true, sujet: "Awrea Paris, en quelques mots" },
  "email-parcours-savoir-faire": { pret: true, sujet: "Comment naît une pièce Awrea" },
  "email-parcours-conseil": { pret: true, sujet: "Un conseil pour votre taille" },
  "email-parcours-nouvelles": { pret: false, sujet: "[Écrire l’objet]" },
};

const entree = (p: Parcours[], contacts: Contact[], etat: Etat, maintenant: Date, extra: Partial<Entree> = {}): Entree => ({
  parcours: p,
  contacts,
  etat,
  reglages: { plafondJours: 3 },
  emails: EMAILS,
  maintenant,
  mode: "simulation",
  ...extra,
});

/** Fait passer la tâche chaque matin, de `de` à `a` jours, et rend tous les e-mails partis. */
function jours(p: Parcours[], contacts: Contact[] | ((d: number) => Contact[]), de: number, a: number, etat0 = etatVide(), extra: Partial<Entree> = {}) {
  let etat = etat0;
  const envois: (Envoi & { jour: number })[] = [];
  const journal: LigneJournal[] = [];
  for (let d = de; d <= a; d++) {
    const r = avancer(entree(p, typeof contacts === "function" ? contacts(d) : contacts, etat, jour(d, d % 2 ? 1 : -1), extra));
    etat = r.etat;
    envois.push(...r.envois.map((v) => ({ ...v, jour: d })));
    journal.push(...r.journal);
  }
  return { etat, envois, journal };
}

test("entrée : consentement, évènement récent, conditions remplies, une seule fois par parcours", () => {
  const p = [parcours()];
  const r = avancer(
    entree(p, [contact("a@exemple.fr"), contact("sans-accord@exemple.fr", { marketing: false }), contact("ancienne@exemple.fr", { inscriteLe: jour(-30).toISOString() }), contact("cliente@exemple.fr", { commandes: [jour(-10).toISOString()] })], etatVide(), T0),
  );
  assert.deepEqual(Object.keys(r.etat.suivis["p-bienvenue"]), ["a@exemple.fr"]);
  assert.equal(r.resume.entrees, 1);
  assert.equal(r.journal[0].evenement, "entree");
  // le lendemain, elle n'entre pas une seconde fois
  const r2 = avancer(entree(p, [contact("a@exemple.fr")], r.etat, jour(1)));
  assert.equal(r2.resume.entrees, 0);
  // un brouillon ou un parcours en pause ne fait entrer personne
  for (const statut of ["brouillon", "pause"] as const) assert.equal(avancer(entree([parcours({ statut })], [contact("a@exemple.fr")], etatVide(), T0)).resume.entrees, 0);
});

test("délais : rien avant trois jours, le premier e-mail au troisième matin, le second sept jours plus tard", () => {
  const { envois } = jours([parcours()], [contact("a@exemple.fr")], 0, 12);
  assert.deepEqual(
    envois.map((v) => [v.jour, v.emailId]),
    [
      [3, "email-parcours-maison"],
      [10, "email-parcours-savoir-faire"],
    ],
  );
  assert.equal(envois[0].sujet, "Awrea Paris, en quelques mots");
  assert.equal(envois[0].prenom, "Camille");
});

test("délai en heures : part au passage suivant", () => {
  const p = parcours({ etapes: [{ id: "a-1", type: "attente", duree: 20, unite: "heures" }, { id: "e-1", type: "email", email: "email-parcours-maison" }] });
  const { envois } = jours([p], [contact("a@exemple.fr")], 0, 2);
  assert.deepEqual(envois.map((v) => v.jour), [1]);
});

test("condition d'étape : non remplie, la personne sort du parcours", () => {
  const p = parcours({ objectif: "aucun", sortieSiConditions: false, entree: [], etapes: [{ id: "a-1", type: "attente", duree: 2, unite: "jours" }, { id: "c-1", type: "condition", critere: "compte" }, { id: "e-1", type: "email", email: "email-parcours-maison" }] });
  const { envois, etat, journal } = jours([p], [contact("a@exemple.fr")], 0, 5);
  assert.equal(envois.length, 0);
  assert.equal(etat.suivis[p.id]["a@exemple.fr"].fin?.raison, "condition");
  assert.ok(journal.some((l) => l.evenement === "sortie" && l.raison === "condition"));
  // remplie : elle continue
  const ok = jours([p], [contact("b@exemple.fr", { compte: true })], 0, 5);
  assert.equal(ok.envois.length, 1);
});

test("sortie immédiate à la désinscription : aucun e-mail ensuite", () => {
  const desinscrite = (d: number) => [contact("a@exemple.fr", { marketing: d < 2 })];
  const { envois, etat } = jours([parcours()], desinscrite, 0, 12);
  assert.equal(envois.length, 0);
  assert.equal(etat.suivis["p-bienvenue"]["a@exemple.fr"].fin?.raison, "desinscription");
  // une personne disparue des contacts (compte supprimé) sort aussi
  const disparue = jours([parcours()], (d: number) => (d < 2 ? [contact("b@exemple.fr")] : []), 0, 5);
  assert.equal(disparue.etat.suivis["p-bienvenue"]["b@exemple.fr"].fin?.raison, "desinscription");
});

test("sortie à l'achat (objectif atteint), et achat compté dans les conversions", () => {
  const achete = (d: number) => [contact("a@exemple.fr", { commandes: d >= 5 ? [jour(4).toISOString()] : [] })];
  const { envois, etat } = jours([parcours({ entree: [], sortieSiConditions: false })], achete, 0, 12);
  assert.deepEqual(envois.map((v) => v.jour), [3]);
  assert.equal(etat.suivis["p-bienvenue"]["a@exemple.fr"].fin?.raison, "objectif");
  const s = statistiques({ id: "p-bienvenue" }, etat, achete(12));
  assert.deepEqual(s, { entrees: 1, enCours: 0, messages: 1, conversions: 1 });
});

test("sortie quand les conditions d'entrée ne sont plus remplies", () => {
  const p = parcours({ objectif: "aucun", entree: ["sans-commande"] });
  const achete = (d: number) => [contact("a@exemple.fr", { commandes: d >= 2 ? [jour(1).toISOString()] : [] })];
  const { envois, etat } = jours([p], achete, 0, 12);
  assert.equal(envois.length, 0);
  assert.equal(etat.suivis[p.id]["a@exemple.fr"].fin?.raison, "conditions");
});

test("plafond de fréquence : un e-mail marketing au plus tous les trois jours, lettre comprise", () => {
  // la lettre de bienvenue est partie le jour de l'inscription : le parcours sans délai attend trois jours
  const p = parcours({ etapes: [{ id: "e-1", type: "email", email: "email-parcours-maison" }, { id: "e-2", type: "email", email: "email-parcours-savoir-faire" }] });
  const c = [contact("a@exemple.fr", { inscriteLe: T0.toISOString(), dernierMarketing: T0.toISOString() })];
  const { envois } = jours([p], c, 0, 8);
  assert.deepEqual(envois.map((v) => v.jour), [3, 6]);
  // réglable : un tous les cinq jours
  const cinq = jours([p], c, 0, 12, etatVide(), { reglages: { plafondJours: 5 } });
  assert.deepEqual(cinq.envois.map((v) => v.jour), [5, 10]);
  // le plafond vaut tous parcours confondus
  const p2 = parcours({ id: "p-autre", nom: "Autre", exclusions: [], etapes: [{ id: "e-9", type: "email", email: "email-parcours-conseil" }] });
  const deux = jours([parcours({ exclusions: [], etapes: [{ id: "e-1", type: "email", email: "email-parcours-maison" }] }), p2], [contact("b@exemple.fr")], 0, 4);
  assert.deepEqual(deux.envois.map((v) => [v.jour, v.emailId]), [
    [0, "email-parcours-maison"],
    [3, "email-parcours-conseil"],
  ]);
});

test("exclusion : déjà dans un autre parcours, elle n'entre pas dans le second", () => {
  const a = parcours();
  const b = parcours({ id: "p-prospect", nom: "Prospect", declencheur: "inscription" });
  const r = avancer(entree([a, b], [contact("a@exemple.fr")], etatVide(), T0));
  assert.ok(r.etat.suivis[a.id]["a@exemple.fr"]);
  assert.equal(r.etat.suivis[b.id]["a@exemple.fr"], undefined);
  // sans la règle d'exclusion, elle entre dans les deux
  const sans = avancer(entree([a, { ...b, exclusions: [] }], [contact("a@exemple.fr")], etatVide(), T0));
  assert.ok(sans.etat.suivis[b.id]["a@exemple.fr"]);
  // commande récente : exclue
  const recente = avancer(entree([parcours({ entree: [], exclusions: ["commande-recente"] })], [contact("c@exemple.fr", { commandes: [jour(-3).toISOString()] })], etatVide(), T0));
  assert.equal(recente.resume.entrees, 0);
});

test("jamais deux fois le même e-mail, même d'un autre parcours ; un e-mail pas prêt fait attendre l'étape", () => {
  const p = parcours({ etapes: [{ id: "e-1", type: "email", email: "email-parcours-maison" }, { id: "e-2", type: "email", email: "email-parcours-conseil" }] });
  const etat: Etat = { suivis: {}, personnes: { "a@exemple.fr": { recus: ["email-parcours-maison"], dernier: jour(-10).toISOString() } } };
  const r = avancer(entree([p], [contact("a@exemple.fr")], etat, T0));
  assert.deepEqual(r.envois.map((v) => v.emailId), ["email-parcours-conseil"]);
  // e-mail encore entre crochets : rien ne part, l'étape attend qu'il soit prêt
  const q = parcours({ etapes: [{ id: "e-1", type: "email", email: "email-parcours-nouvelles" }] });
  const r2 = avancer(entree([q], [contact("b@exemple.fr")], etatVide(), T0));
  assert.equal(r2.envois.length, 0);
  assert.equal(r2.resume.enAttente, 1);
  assert.equal(r2.etat.suivis[q.id]["b@exemple.fr"].etape, 0);
  const pret = avancer(entree([q], [contact("b@exemple.fr")], r2.etat, jour(1), { emails: { ...EMAILS, "email-parcours-nouvelles": { pret: true, sujet: "Nouvelles" } } }));
  assert.equal(pret.envois.length, 1);
});

/** Ports en mémoire : le stockage, le verrou, l'envoi et le journal d'un passage. */
function memoire(mode: Mode, p: Parcours[], contacts: Contact[], envoyer: (v: Envoi) => Promise<void> = async () => {}) {
  const etats: Record<Mode, Etat> = { simulation: etatVide(), reel: etatVide() };
  const journal: LigneJournal[] = [];
  const envoyes: Envoi[] = [];
  let verrou = false;
  const ports: Ports = {
    async verrou() {
      if (verrou) return null;
      verrou = true;
      return async () => {
        verrou = false;
      };
    },
    mode: async () => mode,
    parcours: async () => p,
    reglages: async () => ({ plafondJours: 3 }),
    contacts: async () => contacts,
    emails: async () => EMAILS,
    lireEtat: async (m) => structuredClone(etats[m]),
    ecrireEtat: async (m, e) => {
      etats[m] = structuredClone(e);
    },
    envoyer: async (v) => {
      envoyes.push(v);
      await envoyer(v);
    },
    journal: async (l) => {
      journal.push(...l);
    },
  };
  return { ports, etats, journal, envoyes, prendre: () => (verrou = true) };
}

test("tâche planifiée rejouée : rien en double, même après un envoi en échec", async () => {
  const sansDelai = parcours({ etapes: [{ id: "e-1", type: "email", email: "email-parcours-maison" }] });
  const m = memoire("reel", [sansDelai], [contact("a@exemple.fr")]);
  const b1 = await passage(m.ports, T0);
  const b2 = await passage(m.ports, T0);
  const b3 = await passage(m.ports, jour(0, 5));
  assert.equal(b1.envois, 1);
  assert.equal(b2.envois + b3.envois, 0);
  assert.equal(m.envoyes.length, 1);
  // un envoi qui échoue n'est jamais retenté : l'état avance avant l'envoi
  const ko = memoire("reel", [sansDelai], [contact("b@exemple.fr")], async () => {
    throw new Error("Resend : 500");
  });
  const k1 = await passage(ko.ports, T0);
  const k2 = await passage(ko.ports, jour(1));
  assert.equal(k1.erreurs, 1);
  assert.equal(k2.envois, 0);
  assert.equal(ko.envoyes.length, 1);
  assert.ok(ko.journal.some((l) => l.evenement === "erreur"));
  // deux passages en même temps : le second ne fait rien
  const occupe = memoire("reel", [sansDelai], [contact("c@exemple.fr")]);
  occupe.prendre();
  const o = await passage(occupe.ports, T0);
  assert.equal(o.occupe, true);
  assert.equal(occupe.envoyes.length, 0);
});

test("simulation : rien ne part, le journal dit ce qui serait parti, à qui et quel jour", async () => {
  const sansDelai = parcours({ etapes: [{ id: "e-1", type: "email", email: "email-parcours-maison" }] });
  const m = memoire("simulation", [sansDelai], [contact("a@exemple.fr")]);
  const b = await passage(m.ports, T0);
  assert.equal(b.mode, "simulation");
  assert.equal(b.envois, 1);
  assert.equal(m.envoyes.length, 0, "aucun envoi réel en simulation");
  const l = m.journal.find((x) => x.evenement === "email");
  assert.deepEqual({ mode: l?.mode, email: l?.email, sujet: l?.sujet, at: l?.at }, { mode: "simulation", email: "a@exemple.fr", sujet: "Awrea Paris, en quelques mots", at: T0.toISOString() });
  // les deux modes sont séparés : la simulation ne compte pas comme un envoi réel
  assert.deepEqual(m.etats.reel, etatVide());
});

test("envois réels : il faut la variable PARCOURS_ENVOIS_REELS=1 et l'accord de l'Atelier", () => {
  assert.equal(modeDesEnvois(undefined, { actif: true }), "simulation");
  assert.equal(modeDesEnvois("", { actif: true }), "simulation");
  assert.equal(modeDesEnvois("true", { actif: true }), "simulation");
  assert.equal(modeDesEnvois("1", { actif: false }), "simulation");
  assert.equal(modeDesEnvois("1", null), "simulation");
  assert.equal(modeDesEnvois("1", { actif: true }), "reel");
});

test("accord aux envois réels : confirmation et code à six chiffres pour l'allumer, rien pour le couper", () => {
  const lu = (b: unknown) => EnvoisReelsSchema.safeParse(b);
  // allumer : la confirmation, puis le code
  assert.equal(manqueAccord({ actif: true }), "confirmation");
  assert.equal(manqueAccord({ actif: true, code: "123456" }), "confirmation");
  assert.equal(manqueAccord({ actif: true, confirme: true }), "code");
  assert.equal(manqueAccord({ actif: true, confirme: true, code: "" }), "code");
  assert.equal(manqueAccord({ actif: true, confirme: true, code: "123456" }), null);
  // couper : aucun code, aucune confirmation
  assert.equal(manqueAccord({ actif: false }), null);
  assert.ok(lu({ action: "envois-reels", actif: false }).success);
  // forme du code : six chiffres, ou un code de secours (« ABCD-EFGH ») ; rien d'autre
  assert.ok(lu({ action: "envois-reels", actif: true, confirme: true, code: " 123456 " }).success);
  assert.equal(lu({ action: "envois-reels", actif: true, confirme: true, code: " 123456 " }).data?.code, "123456");
  assert.ok(lu({ action: "envois-reels", actif: true, confirme: true, code: "ABCD-EFGH" }).success);
  assert.ok(!lu({ action: "envois-reels", actif: true, confirme: true, code: "123" }).success);
  assert.ok(!lu({ action: "envois-reels", actif: true, confirme: true, code: "1".repeat(13) }).success);
  assert.ok(!lu({ action: "envois-reels", actif: true, confirme: false, code: "123456" }).success);
  assert.ok(!lu({ action: "envois-reels", actif: true, confirme: true, code: "123456", par: "autre@exemple.fr" }).success);
});

test("prévision : les 30 prochains jours, sans rien enregistrer", () => {
  const e = entree([parcours()], [contact("a@exemple.fr")], etatVide(), T0);
  const v = prevoir(e, 30);
  assert.deepEqual(
    v.map((x) => [Math.round((Date.parse(x.le) - T0.getTime()) / JOUR), x.emailId]),
    [
      [3, "email-parcours-maison"],
      [10, "email-parcours-savoir-faire"],
    ],
  );
  assert.deepEqual(e.etat, etatVide());
});

const json = (rel: string) => JSON.parse(readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8"));

test("modèles : des brouillons valides, qui citent des e-mails de la lettre existants", () => {
  assert.deepEqual(
    MODELES.map((m) => m.id),
    ["nouvelle-inscrite", "prospect", "panier", "premiere-commande", "cliente"],
  );
  const registre = json("content/site/registre/parcours-vente.json") as Record<string, { kind: string }>;
  for (const m of MODELES) {
    const d = m.definition();
    assert.ok(DefinitionSchema.safeParse(d).success, `${m.id} : définition invalide`);
    assert.ok(!("statut" in d), `${m.id} : un modèle ne porte jamais de statut (brouillon à la création)`);
    for (const e of d.etapes) {
      if (e.type !== "email") continue;
      assert.equal(registre[e.email]?.kind, "email", `${e.email} : absent du registre`);
      const doc = json(`content/site/fr/${e.email}.json`) as EmailDoc;
      assert.ok(EmailDocSchema.safeParse(doc).success, `${e.email} : e-mail invalide`);
      assert.equal(doc.famille, "lettre", `${e.email} : seulement des e-mails de la lettre (lien de désinscription)`);
      assert.deepEqual(Object.keys(doc.variables), ["prenom"]);
    }
  }
  // deux modèles créés coup sur coup ne partagent aucun repère d'étape
  const a = MODELES[0].definition().etapes.map((e) => e.id);
  const b = MODELES[0].definition().etapes.map((e) => e.id);
  assert.equal(new Set([...a, ...b]).size, a.length + b.length);
});
