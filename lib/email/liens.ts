/**
 * Liens d'un texte d'e-mail, sans code visible pour la créatrice (parcours UX du 23/11) : le texte
 * garde en coulisse la forme « [mots](adresse) » (lib/email/blocks.ts, LIEN_TEXTE), mais le champ
 * n'en montre que les mots ; les liens suivent les mots quand le texte change, et se listent à part
 * (« la boutique » vers /boutique). Fonctions pures, testées (tests/unit/email-liens.test.ts).
 */
import { LIEN_TEXTE } from "@/lib/email/blocks";

export interface LienPlace {
  /** position des mots du lien dans le texte simple */
  from: number;
  to: number;
  adresse: string;
}

const nouvelleExpression = () => new RegExp(LIEN_TEXTE.source, "g");

/** Le texte tel que la créatrice le lit, et la place de chaque lien dans ce texte. */
export function decouper(valeur: string): { texte: string; liens: LienPlace[] } {
  let texte = "";
  const liens: LienPlace[] = [];
  let dernier = 0;
  for (const m of valeur.matchAll(nouvelleExpression())) {
    texte += valeur.slice(dernier, m.index);
    liens.push({ from: texte.length, to: texte.length + m[1].length, adresse: m[2] });
    texte += m[1];
    dernier = (m.index ?? 0) + m[0].length;
  }
  texte += valeur.slice(dernier);
  return { texte, liens };
}

/** Le texte enregistré : chaque lien remis autour de ses mots. */
export function assembler(texte: string, liens: LienPlace[]): string {
  let out = "";
  let pos = 0;
  for (const l of [...liens].sort((a, b) => a.from - b.from)) {
    if (l.from < pos || l.to <= l.from || l.to > texte.length) continue;
    const mots = texte.slice(l.from, l.to);
    if (!mots.trim() || /[[\]\n]/.test(mots) || mots.length > 80) {
      out += texte.slice(pos, l.to);
    } else {
      out += texte.slice(pos, l.from) + `[${mots}](${l.adresse})`;
    }
    pos = l.to;
  }
  return out + texte.slice(pos);
}

/**
 * La créatrice a changé le texte simple : les liens suivent leurs mots. Un lien avant ou après la
 * partie changée se décale ; un lien qui contient la partie changée garde ses nouveaux mots ; un
 * lien dont les mots ont été effacés disparaît.
 */
export function modifierTexte(valeur: string, nouveau: string): string {
  const { texte, liens } = decouper(valeur);
  let debut = 0;
  while (debut < texte.length && debut < nouveau.length && texte[debut] === nouveau[debut]) debut++;
  let fin = 0;
  while (fin < texte.length - debut && fin < nouveau.length - debut && texte[texte.length - 1 - fin] === nouveau[nouveau.length - 1 - fin]) fin++;
  const finAncien = texte.length - fin;
  const ecart = nouveau.length - texte.length;
  const suivis: LienPlace[] = [];
  for (const l of liens) {
    if (l.to <= debut) suivis.push(l);
    else if (l.from >= finAncien) suivis.push({ ...l, from: l.from + ecart, to: l.to + ecart });
    else if (l.from <= debut && l.to >= finAncien && l.to + ecart > l.from) suivis.push({ ...l, to: l.to + ecart });
  }
  return assembler(nouveau, suivis);
}

/** Une adresse comprise comme la créatrice l'écrit : « boutique » devient « /boutique », « www.… » devient « https://www.… ». */
export function adresseComprise(saisie: string): string {
  const a = saisie.trim();
  if (/^(https:\/\/|\/(?!\/)|mailto:)/.test(a)) return a;
  if (/^http:\/\//i.test(a)) return `https://${a.slice(7)}`;
  if (/^www\.[^\s]+\.[a-z]{2,}/i.test(a)) return `https://${a}`;
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(a)) return `mailto:${a}`;
  if (/^[a-z0-9][a-z0-9-]*(\/[a-z0-9-]+)*\/?$/i.test(a)) return `/${a}`;
  return a;
}

export const adresseValable = (a: string) => /^(https:\/\/[^\s()<>"{}]+|\/(?!\/)[^\s()<>"{}]*|mailto:[^\s()<>"{}]+)$/.test(a);

/**
 * Ajoute un lien sur les mots choisis (positions dans le texte simple) ou, sans choix, insère les
 * mots du lien à l'endroit du curseur, séparés par une espace de ce qui les entoure.
 */
export function ajouterLien(valeur: string, from: number, to: number, mots: string, adresse: string): string {
  const { texte, liens } = decouper(valeur);
  const propres = mots.replace(/[[\]\n]/g, " ").trim().slice(0, 80);
  if (!propres || !adresseValable(adresse)) return valeur;
  // les liens touchés par le choix laissent la place au nouveau
  const gardes = liens.filter((l) => l.to <= from || l.from >= to);
  if (to > from && texte.slice(from, to).trim() === propres) {
    const debut = from + texte.slice(from, to).indexOf(propres);
    return assembler(texte, [...gardes, { from: debut, to: debut + propres.length, adresse }]);
  }
  const avant = texte.slice(0, from);
  const apres = texte.slice(to);
  const espaceAvant = avant && !/\s$/.test(avant) ? " " : "";
  const espaceApres = apres && /^[\p{L}\p{N}]/u.test(apres) ? " " : "";
  const nouveau = avant + espaceAvant + propres + espaceApres + apres;
  const ecart = nouveau.length - texte.length;
  const debut = avant.length + espaceAvant.length;
  const decales = gardes.map((l) => (l.from >= to ? { ...l, from: l.from + ecart, to: l.to + ecart } : l));
  return assembler(nouveau, [...decales, { from: debut, to: debut + propres.length, adresse }]);
}
