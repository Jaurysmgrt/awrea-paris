/**
 * Regard de directrice artistique sur une page du site, à partir de son HTML (rôle « Design »,
 * lib/agents/roles/design.ts). Demande de la créatrice du 01/11 : un agent qui regarde chaque jour
 * s'il n'y a pas de problème de design, qui repère ce qui revient, fait l'analyse lui-même et a un
 * esprit critique. Fonctions pures, sans réseau : testées dans tests/unit/design-controle.test.ts.
 *
 * Ce qui est relevé, et pourquoi (MARQUE.md, DESIGN.md) :
 *  - un seul titre principal (h1) par page ;
 *  - chaque photo a sa description (texte alternatif) ;
 *  - une section, un appel à l'action : deux boutons noirs qui se disputent une même section ;
 *  - sur la fiche d'une pièce, peu de texte avant le bouton et aucune phrase répétée (retour du 01/11 :
 *    « trop de texte, brouillon, ça ne donne pas envie »).
 */

export type Gravite = "info" | "attention" | "urgent";

export interface Remarque {
  gravite: Gravite;
  titre: string;
  detail?: string;
  /** page concernée (« / », « /boutique/robe-sienna ») */
  page: string;
  /** clé stable d'un jour à l'autre : sert à repérer ce qui revient */
  cible: string;
}

/** Au-delà, la fiche d'une pièce en dit trop avant le bouton « Ajouter au panier ». */
export const MOTS_AVANT_BOUTON = 70;

const ENTITES: Record<string, string> = { "&nbsp;": " ", "&#x27;": "’", "&#39;": "’", "&quot;": "\"", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&rsquo;": "’" };

/** Texte lisible d'un morceau de HTML : sans scripts, styles, dessins ni balises. */
export function texteVisible(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<span[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITES[e.toLowerCase()] ?? " ")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const mots = (texte: string) => texte.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Mots vides : une suite qui n'est faite que de ceux-là n'est pas une répétition parlante. */
const VIDES = new Set("le la les de des du un une et en à au aux pour par sur dans ce cette ces son sa ses vos votre vous il elle qui que ne pas est".split(" "));

/** La suite de quatre mots la plus répétée d'un texte, si elle revient au moins deux fois. */
export function repetition(texte: string, taille = 4): { suite: string; fois: number } | null {
  const m = mots(texte);
  const compte = new Map<string, number>();
  for (let i = 0; i + taille <= m.length; i++) {
    const suite = m.slice(i, i + taille);
    if (suite.every((w) => VIDES.has(w))) continue;
    const cle = suite.join(" ");
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  let mieux: { suite: string; fois: number } | null = null;
  for (const [suite, fois] of compte) if (fois >= 2 && (!mieux || fois > mieux.fois)) mieux = { suite, fois };
  return mieux;
}

const contenu = (html: string) => html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i)?.[1] ?? html;
const classes = (tag: string) => (tag.match(/\bclass(?:Name)?="([^"]*)"/i)?.[1] ?? "").split(/\s+/);

/** Analyse une page déjà chargée. `fiche` : la page d'une pièce, où le texte avant le bouton compte. */
export function analyserPage(page: string, html: string, opts: { fiche?: boolean } = {}): Remarque[] {
  const out: Remarque[] = [];
  const main = contenu(html);

  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) out.push({ gravite: "attention", titre: h1 ? `${h1} titres principaux sur la même page` : "Aucun titre principal", detail: "Une page a un seul grand titre : c’est lui que lisent Google et les lecteurs d’écran.", page, cible: `${page}#h1` });

  const sansAlt = (main.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) ?? []).length;
  if (sansAlt) out.push({ gravite: "attention", titre: `${sansAlt} photo${sansAlt > 1 ? "s" : ""} sans description`, detail: "Chaque photo a besoin d’une phrase qui la décrit, pour les personnes qui ne la voient pas.", page, cible: `${page}#alt` });

  // une section, un appel à l'action : les liens en bouton noir (jamais les boutons de formulaire)
  if (!opts.fiche) {
    let n = 0;
    for (const section of main.split(/<section\b/i).slice(1)) {
      const corps = section.split(/<\/section>/i)[0];
      const boutons = (corps.match(/<a\b[^>]*>/gi) ?? []).filter((tag) => {
        const c = classes(tag);
        return c.includes("btn") && !c.some((x) => x === "btn--outline" || x === "btn--link");
      });
      if (boutons.length > 1) n++;
    }
    if (n) out.push({ gravite: "attention", titre: n > 1 ? `${n} sections avec deux boutons qui se disputent l’attention` : "Une section avec deux boutons qui se disputent l’attention", detail: "Un message et un appel à l’action par section : le second bouton passe en lien discret.", page, cible: `${page}#cta` });
  }

  // fiche d'une pièce : ce qui se lit entre le nom et le bouton
  if (opts.fiche) {
    const debut = main.search(/<\/h1>/i);
    const fin = main.search(/product-form__actions/i);
    if (debut >= 0 && fin > debut) {
      const avant = texteVisible(main.slice(debut, fin));
      const nombre = mots(avant).length;
      if (nombre > MOTS_AVANT_BOUTON) out.push({ gravite: "attention", titre: `Trop de texte avant le bouton (${nombre} mots)`, detail: `Au-delà de ${MOTS_AVANT_BOUTON} mots, la fiche paraît brouillonne : le reste a sa place dans les rubriques.`, page, cible: `${page}#texte` });
      const r = repetition(avant);
      if (r) out.push({ gravite: "attention", titre: `« ${r.suite} » revient ${r.fois} fois avant le bouton`, detail: "Une information se dit une fois : la répéter alourdit la fiche.", page, cible: `${page}#repetition` });
    }
  }
  return out;
}

/** Photos du site (adresses internes) d'une page, pour vérifier qu'elles s'affichent. */
export function photosInternes(html: string): string[] {
  const src = [...contenu(html).matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  return [...new Set(src.filter((s) => s.startsWith("/") && !s.startsWith("//")))];
}

export interface Suivi {
  /** premier jour où la remarque a été vue */
  depuis: string;
  /** dernier jour où elle a été vue */
  vu: string;
  /** nombre de jours où elle a été vue d'affilée */
  jours: number;
}

const PLUS_HAUT: Record<Gravite, Gravite> = { info: "attention", attention: "urgent", urgent: "urgent" };

/**
 * Ce qui revient : une remarque vue trois jours d'affilée monte d'un cran (à regarder → urgent) et
 * dit depuis quand elle revient. Ce qui a disparu sort du suivi. `jour` : AAAA-MM-JJ.
 */
export function recurrence(avant: Record<string, Suivi>, remarques: Remarque[], jour: string): { suivi: Record<string, Suivi>; remarques: Remarque[] } {
  const suivi: Record<string, Suivi> = {};
  const hier = new Date(new Date(`${jour}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const sorties = remarques.map((r) => {
    const prec = avant[r.cible];
    const jours = !prec ? 1 : prec.vu === jour ? prec.jours : prec.vu === hier ? prec.jours + 1 : 1;
    suivi[r.cible] = { depuis: prec && jours > 1 ? prec.depuis : jour, vu: jour, jours };
    if (jours < 3) return r;
    return { ...r, gravite: PLUS_HAUT[r.gravite], detail: `Revient depuis ${jours} jours. ${r.detail ?? ""}`.trim() };
  });
  return { suivi, remarques: sorties };
}

const POIDS: Record<Gravite, number> = { urgent: 3, attention: 2, info: 1 };

/** Les remarques dans l'ordre où les traiter : la plus grave, puis celle qui revient depuis le plus longtemps. */
export function prioriser(remarques: Remarque[], suivi: Record<string, Suivi>): Remarque[] {
  return [...remarques].sort((a, b) => POIDS[b.gravite] - POIDS[a.gravite] || (suivi[b.cible]?.jours ?? 0) - (suivi[a.cible]?.jours ?? 0));
}
