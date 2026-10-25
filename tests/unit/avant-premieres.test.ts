/**
 * Avant-premières des collections : temps d'une collection annoncée, accès (lien personnel ou mot
 * de passe d'une présentation privée), dates écrites en toutes lettres, et textes sans aucune
 * notion de quantité, de rareté ni d'urgence (chaque pièce est créée sur demande).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessAllows, capitalized, imagesOf, paragraphsOf, parisDate, phaseOf } from "@/components/drops/regles";

const NB = " ";
const H = 3_600_000;
const NOW = Date.parse("2026-11-01T12:00:00Z");
const drop = (early: number, pub: number, privateSale = false) => ({ earlyAccessAt: new Date(NOW + early * H).toISOString(), publicAt: new Date(NOW + pub * H).toISOString(), privateSale });

test("trois temps : annoncée, avant-première, dévoilée", () => {
  assert.equal(phaseOf(drop(2, 10), NOW), "bientot");
  assert.equal(phaseOf(drop(-1, 10), NOW), "anticipe");
  assert.equal(phaseOf(drop(-10, -1), NOW), "ouvert");
  // à l'heure exacte, le temps suivant commence
  assert.equal(phaseOf(drop(0, 10), NOW), "anticipe");
  assert.equal(phaseOf(drop(-5, 0), NOW), "ouvert");
});

test("accès : le lien personnel ouvre l'avant-première, le mot de passe la présentation privée", () => {
  // annoncée : personne ne commande encore, même avec un accès
  assert.equal(accessAllows(drop(2, 10), "anticipe", NOW), false);
  assert.equal(accessAllows(drop(2, 10, true), "prive", NOW), false);
  // avant-première : seulement avec un accès
  assert.equal(accessAllows(drop(-1, 10), null, NOW), false);
  assert.equal(accessAllows(drop(-1, 10), undefined, NOW), false);
  assert.equal(accessAllows(drop(-1, 10), "anticipe", NOW), true);
  // présentation privée : le lien ne suffit pas, le mot de passe oui
  assert.equal(accessAllows(drop(-1, 10, true), "anticipe", NOW), false);
  assert.equal(accessAllows(drop(-1, 10, true), "prive", NOW), true);
  // dévoilée : ouverte à toutes
  assert.equal(accessAllows(drop(-10, -1), null, NOW), true);
  assert.equal(accessAllows(drop(-10, -1, true), null, NOW), true);
});

test("dates écrites en toutes lettres, heure de Paris, espaces insécables", () => {
  // 18 h à Paris en novembre (UTC+1)
  assert.deepEqual(parisDate("2026-11-05T17:00:00Z", NOW), { jour: `jeudi 5${NB}novembre`, heure: `18${NB}h` });
  // minutes écrites seulement si elles comptent ; « 1er » pour le premier du mois
  assert.deepEqual(parisDate("2026-12-01T08:30:00Z", NOW), { jour: `mardi 1er${NB}décembre`, heure: `9${NB}h${NB}30` });
  // été (UTC+2) et autre année : l'année est écrite
  const ete = parisDate("2027-06-03T16:00:00Z", NOW);
  assert.equal(ete.heure, `18${NB}h`);
  assert.match(ete.jour, /^jeudi 3 juin.2027$/);
  assert.equal(capitalized(`jeudi 5${NB}novembre`), `Jeudi 5${NB}novembre`);
  assert.equal(capitalized(""), "");
});

test("texte et images d'une collection", () => {
  assert.deepEqual(paragraphsOf("Première ligne\nsuite.\n\n  Second paragraphe.  \n\n\n"), ["Première ligne suite.", "Second paragraphe."]);
  assert.deepEqual(paragraphsOf(""), []);
  assert.deepEqual(imagesOf({ images: ["/media/img/aria-1"], image: "/media/img/odessa-1" }), ["/media/img/aria-1"]);
  // avant-première enregistrée avant les images multiples
  assert.deepEqual(imagesOf({ image: "/media/img/odessa-1" }), ["/media/img/odessa-1"]);
  assert.deepEqual(imagesOf({}), []);
});

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const strings = (v: Json): string[] => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const doc = JSON.parse(readFileSync(new URL("../../content/site/fr/avant-premieres.json", import.meta.url), "utf8")) as Json;
const flows = readFileSync(new URL("../../lib/marketing/flows.ts", import.meta.url), "utf8");

test("textes des avant-premières : aucune quantité, aucune rareté, aucune urgence", () => {
  const RARETE = /\bséries?\b|numérot|stock|rupture|épuisé|dernières pièces|liste d’attente|édition limitée|compte à rebours|vente privée|plus que \d|\bvite\b|dépêchez|remise|-\d+\s?%/i;
  for (const s of strings(doc)) assert.doesNotMatch(s, RARETE, s);
  // les flux de la lettre : plus de retour en stock, plus de séries courtes
  assert.doesNotMatch(flows, /retour-stock|notify_waitlist|liste d’attente|séries? courtes?|numérotée/i);
});

test("repères des textes : seulement ceux que le code remplit", () => {
  const KNOWN = new Set(["collection", "avantPremiere", "devoilement", "desinscription", "n", "jour", "heure"]);
  for (const s of strings(doc)) for (const [, name] of s.matchAll(/\{([a-zA-Z]\w*)\}/g)) assert.ok(KNOWN.has(name), `repère inconnu {${name}} dans « ${s} »`);
});
