/**
 * Contrôle d'écriture d'Awrea Paris : les règles de la créatrice, en un seul endroit.
 *
 * Utilisé par le script de vérification (scripts/controle-ecriture.ts, CI et maintenance de nuit),
 * par l'éditeur visuel (signalements avec suggestion, sans jamais bloquer la créatrice) et par les
 * agents de gestion (fiches, articles, e-mails, réponses de l'assistante).
 *
 * Bloquant : tiret de ponctuation, formulation interdite, point d'exclamation, emoji, apostrophe
 * droite, et la typographie française que l'on corrige mécaniquement (espaces insécables,
 * guillemets, points de suspension). Simple conseil : ce qui demande un œil humain (trois
 * adjectifs à la suite, question d'ouverture, phrases qui commencent toutes pareil).
 *
 * Module pur, sans dépendance : importable par Node seul (--experimental-strip-types).
 */

export type Lang = "fr" | "en";
export type Severity = "erreur" | "conseil";

export type RuleId =
  | "tiret"
  | "liste-tirets"
  | "formule"
  | "superlatif"
  | "exclamation"
  | "emoji"
  | "apostrophe"
  | "guillemets"
  | "espace-insecable"
  | "suspension"
  | "majuscule"
  | "titre-deux-points"
  | "bouton-decouvrir"
  | "adjectifs"
  | "question-ouverture"
  | "anaphore";

export interface WritingIssue {
  rule: RuleId;
  severity: Severity;
  /** explication pour la créatrice, en une phrase */
  message: string;
  /** passage concerné */
  excerpt: string;
  index: number;
  /** proposition de correction, quand il y en a une */
  suggestion?: string;
  /** correction mécanique sûre (appliquée par `fixTypography`) */
  autofix?: boolean;
}

/** Ce que l'on sait du texte : sa langue, son rôle (titre, bouton…), s'il s'agit bien de prose. */
export interface TextContext {
  lang?: Lang;
  /** titre, bouton, etc. : active les règles propres à ces rôles */
  role?: "titre" | "bouton" | "texte" | "juridique";
  /** faux : chaîne technique probable, seules les règles sans ambiguïté s'appliquent */
  prose?: boolean;
}

export const NBSP = "\u00a0";
const L = "\\p{L}";
/** début et fin de mot, lettres accentuées comprises */
const B = `(?<![${L}\\d])`;
const E = `(?![${L}\\d])`;

interface Phrase {
  re: RegExp;
  hint: string;
  rule?: RuleId;
  severity?: Severity;
}

const p = (src: string, hint: string, extra: Partial<Phrase> = {}): Phrase => ({ re: new RegExp(src, "giu"), hint, ...extra });
const APOS = "['’]";

/** Formulations bannies : elles sonnent comme une publicité ou une machine, pas comme la créatrice. */
export const BANNED_FR: Phrase[] = [
  p(`${B}plong(?:ez|er|ons|e)\\s+(?:dans|au\\s+cœur)${E}`, "Dire simplement ce que l’on voit : « Dans l’atelier, la dentelle sèche sur la table. »"),
  p(`${B}d[ée]couvr(?:ez|ir)\\s+(?:notre|l${APOS})\\s*univers${E}`, "Nommer la chose : « Voir la collection », « Entrer dans l’atelier »."),
  p(`${B}(?:bien\\s+)?plus\\s+qu${APOS}(?:un|une)\\s+(?:simple\\s+)?(?:v[êe]tement|robe|pi[èe]ce|marque|tenue)${E}`, "Dire ce que c’est, concrètement : la matière, la coupe, le délai de fabrication."),
  p(`${B}il\\s+ne\\s+s${APOS}agit\\s+pas\\s+(?:seulement|simplement|uniquement|juste)${E}`, "Une phrase, une idée. Garder seulement l’idée qui compte."),
  p(`${B}non\\s+seulement${E}[^.!?]{0,160}${B}mais\\s+(?:aussi|également)${E}`, "Couper en deux phrases simples."),
  p(`${B}que\\s+vous\\s+soyez${E}[^.!?]{0,120}${B}ou${E}`, "S’adresser à une seule personne, sans énumérer les profils."),
  p(`${B}[ée]l[ée]gance\\s+intemporelle${E}|${B}intemporelle\\s+[ée]l[ée]gance${E}`, "Dire comment la pièce vieillit, combien de saisons elle traverse."),
  p(`${B}savoir[-\\s]faire\\s+d${APOS}exception${E}`, "Montrer le geste : « coupée et assemblée dans votre taille par des artisans français »."),
  p(`${B}sublim(?:e|es|er|ez|ent|era|eront|ant|é|ée|és|ées|ait|aient)${E}`, "Dire l’effet réel : « tombe droit », « se pose sur la peau »."),
  p(`${B}incarn(?:e|es|er|ez|ent|era|ant|é|ée|és|ées|ait|aient|ation)${E}`, "Dire ce que la pièce est, sans métaphore."),
  p(`${B}[ée]crins?${E}`, "Dire l’objet réel : la boîte, le papier de soie, le coton."),
  p(`${B}alli(?:er|e|es|ent|ant|ez|ons|é|ée|és|ées|ait|aient)${E}`, "Dire « avec » : « de la dentelle avec du satin »."),
  p(`${B}v[ée]ritable(?:s|ment)?${E}`, "Supprimer le mot : la phrase est plus forte sans lui."),
  p(`${B}(?:un|ce|notre|votre)\\s+voyage${E}`, "Rester concret : un lieu, un moment, un geste."),
  p(`${B}r[ée]v[èée]l(?:er|ez|e|ent|ant|era)\\s+(?:votre|ta|sa|la|leur)\\s+f[ée]minit[ée]${E}`, "Parler de la pièce et de la sensation qu’elle donne."),
  p(`${B}(?:chaque|chacune\\s+de\\s+nos)\\s+(?:pi[èe]ces?|cr[ée]ations?|v[êe]tements?|robes?)${E}[^.!?]{0,30}${B}racont(?:e|ent)\\s+(?:une|son|leur|sa)\\s+histoire${E}`, "Raconter l’histoire elle-même, en une phrase précise."),
  p(`${B}l${APOS}art\\s+(?:de|du|des|d${APOS})`, "Dire le métier : « coudre », « draper », « assembler »."),
  p(`${B}(?:une|cette|véritable)\\s+ode\\s+(?:à|au|aux)${E}`, "Dire simplement ce qui inspire la pièce."),
  p(`${B}femmes?\\s+modernes?${E}`, "Ne pas définir la cliente ; parler de la pièce et de son usage."),
  p(`${B}pens[ée]e?s?\\s+pour\\s+(?:la|les|toutes\\s+les)\\s+femmes?${E}`, "Ne pas définir la cliente ; parler de la pièce et de son usage."),
  p(`${B}unique\\s+en\\s+son\\s+genre${E}`, "Donner un fait précis : la matière visible, le délai de fabrication.", { rule: "superlatif" }),
  p(`${B}incontournables?${E}`, "Supprimer, ou dire pourquoi on la porte souvent.", { rule: "superlatif" }),
  p(`${B}(?<!circonstances\\s)(?<!titre\\s)(?<!fermeture\\s)(?<!mani[èe]re\\s)(?<!fa[çc]on\\s)exceptionnel(?:le|s|les)?${E}`, "Remplacer par un fait précis (matière, coupe, délai).", { rule: "superlatif" }),
  p(`${B}d${APOS}exception${E}`, "Remplacer par un fait précis (matière, coupe, délai).", { rule: "superlatif" }),
  p(`${B}[àa]\\s+couper\\s+le\\s+souffle${E}|${B}in[ée]gal[ée]e?s?${E}|${B}hors\\s+du\\s+commun${E}|${B}sans\\s+pareil(?:le)?s?${E}`, "Remplacer par un fait précis.", { rule: "superlatif" }),
  p(`${B}must[-\\s]have${E}|${B}iconiques?${E}|${B}ultimes?${E}`, "Mot de catalogue : le remplacer par un fait.", { rule: "superlatif" }),
  p(`${B}intemporel(?:le|s|les)?${E}`, "Cliché à éviter : dire combien de temps la pièce se porte.", { rule: "superlatif", severity: "conseil" }),
];

export const BANNED_EN: Phrase[] = [
  p(`${B}(?:immerse\\s+yourself|dive\\s+into|step\\s+into\\s+(?:our|the)\\s+world)${E}`, "Say plainly what is there."),
  p(`${B}discover\\s+(?:our|the)\\s+(?:world|universe)${E}`, "Name the thing: “See the collection”."),
  p(`${B}more\\s+than\\s+(?:just\\s+)?(?:a|an)\\s+(?:simple\\s+)?(?:garment|dress|piece|brand|outfit)${E}`, "Say what it is, concretely."),
  p(`${B}it${APOS}s\\s+not\\s+(?:just|only|simply)\\s+about${E}`, "One sentence, one idea."),
  p(`${B}not\\s+only${E}[^.!?]{0,160}${B}but\\s+also${E}`, "Split into two plain sentences."),
  p(`${B}whether\\s+you${APOS}re${E}`, "Speak to one person."),
  p(`${B}timeless\\s+elegance${E}|${B}exceptional\\s+craftsmanship${E}|${B}unparalleled${E}|${B}breathtaking${E}`, "Replace with a precise fact."),
  p(`${B}(?:elevate|elevates|elevated|elevating|embody|embodies|embodying|sublime)${E}`, "Say the real effect: “falls straight”, “sits close to the skin”."),
  p(`${B}a\\s+(?:true\\s+)?journey${E}|${B}an\\s+ode\\s+to${E}|${B}the\\s+art\\s+of${E}`, "Stay concrete: a place, a moment, a gesture."),
  p(`${B}every\\s+(?:piece|garment|creation)\\s+tells\\s+a\\s+story${E}|${B}modern\\s+wom(?:a|e)n${E}|${B}(?:unleash|reveal)\\s+your\\s+femininity${E}`, "Talk about the piece and how it feels."),
  p(`${B}one\\s+of\\s+a\\s+kind${E}|${B}must[-\\s]have${E}|${B}iconic${E}|${B}curated${E}`, "Catalogue word: replace it with a fact.", { rule: "superlatif" }),
];

/** Mots qui commencent une phrase et réclament leur majuscule accentuée. */
const ACCENTED_CAPS: [RegExp, string][] = [
  [/(^|[.!?…]\s+|\n)A(\s+(?:la|le|les|l['’]|partir|bientôt|tout|votre|vos|nous|vous|chaque|Paris|propos|noter|savoir|l’atelier))/gu, "$1À$2"],
  [/(^|[.!?…]\s+|\n)Etre(?=\s)/gu, "$1Être"],
  [/(^|[.!?…]\s+|\n)Ecri(?=\p{L})/gu, "$1Écri"],
  [/(^|[.!?…]\s+|\n)Ecout(?=\p{L})/gu, "$1Écout"],
  [/(^|[.!?…]\s+|\n)Etat(?=\s|s)/gu, "$1État"],
  [/(^|[.!?…]\s+|\n)Ete(?=\s)/gu, "$1Été"],
  [/(^|[.!?…]\s+|\n)Edition(?=\s|s)/gu, "$1Édition"],
  [/(^|[.!?…]\s+|\n)Egalement(?=\s)/gu, "$1Également"],
  [/(^|[.!?…]\s+|\n)Epaule(?=\s|s)/gu, "$1Épaule"],
  [/(^|[.!?…]\s+|\n)Elegan(?=\p{L})/gu, "$1Élégan"],
];

/** Symboles typographiques autorisés bien qu'ils figurent parmi les pictogrammes Unicode. */
const ALLOWED_SYMBOLS = new Set(["©", "®", "™", "↗", "↘", "→", "←", "↑", "↓", "↔", "↕", "↖", "↙"]);
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f/gu;

/** Chaîne technique (classe CSS, chemin, expression) plutôt que texte lisible. */
export function looksLikeCode(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/calc\(|var\(--|url\(|rgba?\(|=>|===|&&|\|\||\$\{|^\.?\/|^https?:\/\/|^mailto:|^#[\w-]+$|^[\w-]+:\/\//.test(t)) return true;
  // requêtes GraphQL, en-têtes HTTP, attributs : accolades ou « nom=valeur »
  if ((/\{/.test(t) && /\}/.test(t)) || /\w=["'\w]/.test(t) || /^(?:query|mutation|fragment)\b/.test(t)) return true;
  if (/^[a-z0-9_.:/[\]()%#@-]+(?:\s+[a-z0-9_.:/[\]()%#@!-]+)*$/.test(t) && !/[A-ZÀ-ÖØ-Þ]|\p{Ll}{2,}\s\p{Ll}{2,}\s\p{Ll}{2,}\s/u.test(t)) return true;
  if (/^[A-Z0-9_]+$/.test(t)) return true;
  return false;
}

/** Vrai si la chaîne ressemble à du texte lisible (au moins deux mots, ou une lettre accentuée). */
export function looksLikeProse(s: string): boolean {
  if (looksLikeCode(s)) return false;
  const words = s.match(/\p{L}{2,}/gu) ?? [];
  return words.length >= 2 || /[À-ÖØ-öø-ÿŒœ’«»]/.test(s) || /^\p{Lu}\p{Ll}+(?:\s|[.!?…:;]|$)/u.test(s.trim()) && /[\s.!?…:;]/.test(s.trim());
}

const excerptAt = (s: string, i: number, len: number) => {
  const a = Math.max(0, i - 24);
  const b = Math.min(s.length, i + len + 24);
  return `${a > 0 ? "…" : ""}${s.slice(a, b).replace(/\s+/g, " ")}${b < s.length ? "…" : ""}`;
};

/** Proposition de réécriture locale pour un tiret de ponctuation. */
function dashSuggestion(s: string, i: number): string {
  const before = s.slice(0, i).trimEnd();
  const after = s.slice(i + 1).trimStart();
  if (/\d$/.test(before) && /^\d/.test(after)) return "Écrire l’intervalle en toutes lettres : « de 10 à 12 ».";
  const rest = after.split(/[—–]/);
  if (rest.length > 1) return "Remplacer la paire de tirets par deux virgules, ou faire deux phrases.";
  return "Remplacer par une virgule, un point, ou faire deux phrases.";
}

/** Ponctuation haute (; : ! ? ») sans espace insécable devant : espace ordinaire, ou rien du tout. */
const SPACE_BEFORE = /(?:[ \t]+|(?<=[\p{L}\d)”…%€›]))([;:!?»])(?=[\s\u00a0]|$|[»”)\]"'’,.;:!?‹])/gu;

/** Vérifie un texte. Ne modifie rien : renvoie les problèmes trouvés, avec une suggestion. */
export function checkText(text: string, ctx: TextContext = {}): WritingIssue[] {
  const lang = ctx.lang ?? "fr";
  const prose = ctx.prose ?? looksLikeProse(text);
  const issues: WritingIssue[] = [];
  const add = (rule: RuleId, severity: Severity, message: string, index: number, len: number, suggestion?: string, autofix = false) =>
    issues.push({ rule, severity, message, excerpt: excerptAt(text, index, len), index, suggestion, autofix });

  // 1. tirets de ponctuation (— et –) : partout ; « - » isolé : dans la prose
  for (const m of text.matchAll(/[—–]/g)) add("tiret", "erreur", "Tiret de ponctuation : la créatrice n’en utilise jamais.", m.index!, 1, dashSuggestion(text, m.index!));
  if (prose) {
    for (const m of text.matchAll(/(?<=\S)[ \u00a0]-[ \u00a0](?=\S)/g)) add("tiret", "erreur", "Tiret isolé entre deux parties de phrase.", m.index!, 3, dashSuggestion(text, m.index! + 1));
    for (const m of text.matchAll(/(?:^|\n)[ \t]*([-*•])[ \t]+\S/g)) add("liste-tirets", "erreur", "Liste à tirets ou à puces : écrire des phrases complètes.", m.index!, 3, "Transformer chaque ligne en phrase, ou aérer la mise en page sans puces.");
  }

  // 2. formulations interdites
  for (const ph of lang === "en" ? BANNED_EN : BANNED_FR) {
    for (const m of text.matchAll(ph.re)) {
      const rule = ph.rule ?? "formule";
      add(rule, ph.severity ?? "erreur", rule === "superlatif" ? `Superlatif creux : « ${m[0].trim()} ».` : `Formulation interdite : « ${m[0].trim()} ».`, m.index!, m[0].length, ph.hint);
    }
  }

  // 3. point d'exclamation (prose), emoji (partout)
  if (prose) for (const m of text.matchAll(/(?<=[\p{L}\d\s\u00a0»)”.…])!(?![=\p{L}\d])/gu)) add("exclamation", "erreur", "Point d’exclamation : la Maison n’élève jamais la voix.", m.index!, 1, "Finir par un point.");
  for (const m of text.matchAll(EMOJI)) {
    if (ALLOWED_SYMBOLS.has(m[0]) || m[0] === "\ufe0f" || m[0] === "\u200d") continue;
    add("emoji", "erreur", "Emoji : à retirer.", m.index!, m[0].length, "Supprimer l’emoji.");
  }

  // 4. typographie
  for (const m of text.matchAll(/(?<=\p{L})'(?=\p{L})/gu)) add("apostrophe", "erreur", "Apostrophe droite : utiliser l’apostrophe typographique ’.", m.index!, 1, "’", true);
  if (prose) {
    const quotes = [...text.matchAll(/"/g)];
    if (quotes.length >= 2 && quotes.length % 2 === 0) add("guillemets", "erreur", lang === "fr" ? "Guillemets droits : utiliser « » avec espaces insécables." : "Straight quotes: use “ ”.", quotes[0].index!, 1, lang === "fr" ? "« … »" : "“…”", true);
    for (const m of text.matchAll(/\.\.\.(?!\.)/g)) add("suspension", "erreur", "Trois points : utiliser le caractère « … ».", m.index!, 3, "…", true);
    if (lang === "fr") {
      for (const m of text.matchAll(SPACE_BEFORE)) add("espace-insecable", "erreur", `Espace insécable attendue avant « ${m[1]} ».`, m.index!, m[0].length, `${NBSP}${m[1]}`, true);
      for (const m of text.matchAll(/«(?!\u00a0)/g)) add("espace-insecable", "erreur", "Espace insécable attendue après « .", m.index!, 1, `«${NBSP}`, true);
      for (const [re] of ACCENTED_CAPS) {
        for (const m of text.matchAll(re)) add("majuscule", "erreur", "Majuscule sans accent.", m.index! + (m[1]?.length ?? 0), 4, "Mettre l’accent sur la majuscule (À, É, Ê).", true);
      }
    }
  }

  // 5. règles propres aux rôles
  if (ctx.role === "titre" && /[^\s\u00a0]\s*:\s/.test(text)) add("titre-deux-points", "erreur", "Titre à deux-points.", text.indexOf(":"), 1, "Garder une seule idée dans le titre.");
  if (ctx.role === "bouton" && /^\s*d[ée]couvr/iu.test(text)) add("bouton-decouvrir", "erreur", "Bouton « Découvrir » : choisir un verbe concret.", 0, text.length, "« Voir la robe », « Entrer dans l’atelier », « Lire la lettre ».");

  // 6. conseils (relecture humaine)
  if (prose && lang === "fr") {
    const adj = "\\p{L}+(?:eux|euse|euses|ible|ibles|able|ables|ique|iques|if|ive|ifs|ives|ant|ante|ants|antes|ent|ente|é|ée|és|ées|al|ale|aux|ales|elle|elles|eau|el|ile|iles|ine|ines|ure|ures|ère|ères|ier)";
    const tri = new RegExp(`${B}${adj},\\s+${adj},?\\s+et\\s+${adj}${E}`, "gu");
    for (const m of text.matchAll(tri)) add("adjectifs", "conseil", "Trois adjectifs à la suite : en garder un, le plus précis.", m.index!, m[0].length);
    const first = text.trim().split(/(?<=[.!?…])\s/)[0] ?? "";
    if (first.endsWith("?") && text.trim().length > first.length) add("question-ouverture", "conseil", "Question rhétorique en ouverture : commencer par un fait.", 0, first.length);
    const starts = text.split(/(?<=[.!?…])\s+/).map((x) => (x.match(/^\p{L}+/u)?.[0] ?? "").toLowerCase()).filter(Boolean);
    for (let i = 2; i < starts.length; i++) {
      if (starts[i] === starts[i - 1] && starts[i] === starts[i - 2]) {
        add("anaphore", "conseil", `Trois phrases de suite commencent par « ${starts[i]} ».`, 0, 0, "Varier les débuts de phrase.");
        break;
      }
    }
  }
  return issues.sort((a, b) => a.index - b.index);
}

/** Corrections mécaniques sûres : apostrophes, guillemets, espaces insécables, points de suspension, majuscules accentuées. */
export function fixTypography(text: string, lang: Lang = "fr"): string {
  let s = text.replace(/(?<=\p{L})'(?=\p{L})/gu, "’").replace(/\.\.\.(?!\.)/g, "…");
  const quotes = s.match(/"/g)?.length ?? 0;
  if (quotes >= 2 && quotes % 2 === 0) {
    let open = true;
    s = s.replace(/"/g, () => {
      const q = lang === "fr" ? (open ? `«${NBSP}` : `${NBSP}»`) : open ? "“" : "”";
      open = !open;
      return q;
    });
    if (lang === "fr") s = s.replace(/«\u00a0\s+/g, `«${NBSP}`).replace(/\s+\u00a0»/g, `${NBSP}»`);
  }
  if (lang === "fr") {
    s = s.replace(/[ \t]+([;:!?»])(?=[\s\u00a0]|$|[»”)\]"'’,.;:!?])/gu, `${NBSP}$1`);
    s = s.replace(/(?<=[\p{L}\d)”…%€])([;:!?»])(?=[\s\u00a0]|$|[»”)\]"'’,.;:!?])/gu, `${NBSP}$1`);
    s = s.replace(/«(?!\u00a0)[ \t]*/g, `«${NBSP}`);
    for (const [re, to] of ACCENTED_CAPS) s = s.replace(re, to);
  }
  return s;
}

/**
 * Pour les textes produits par les agents et l'assistante : en plus de la typographie, les tirets
 * deviennent des virgules ou des points, les listes à tirets des phrases. La formulation reste à
 * relire (les formulations interdites sont signalées, jamais réécrites à l'aveugle).
 */
export function softenDashes(text: string, opts: { continuation?: boolean } = {}): string {
  // un morceau qui continue un texte déjà commencé ne commence pas une ligne
  const listStart = opts.continuation ? /\n[ \t]*[-*•–—][ \t]+/g : /(?:^|\n)[ \t]*[-*•–—][ \t]+/g;
  return text
    .replace(/(\d)\s*[–—-]\s*(\d)/g, "$1 à $2")
    .replace(listStart, (m) => (m.startsWith("\n") ? "\n" : ""))
    .replace(/\s+[—–]\s+([^—–\n.]+?)\s+[—–]\s+/g, ", $1, ")
    .replace(/\s*[—–]\s*$/gm, ".")
    .replace(/\s+[—–]\s+/g, ", ")
    .replace(/(?<=\S)\s-\s(?=\S)/g, ", ")
    .replace(/[—–]/g, ", ");
}

/** Typographie + tirets, pour un texte généré qui part en ligne sans relecture humaine immédiate. */
export function cleanGenerated(text: string, lang: Lang = "fr", opts: { continuation?: boolean } = {}): string {
  const calm = softenDashes(text, opts)
    .replace(/[?]\s*!+/g, "?")
    .replace(/[ \t\u00a0]*!+(?=[\s\u00a0»”)]|$)/g, ".")
    .replace(EMOJI, (c) => (ALLOWED_SYMBOLS.has(c) ? c : ""))
    .replace(/\.{2}(?!\.)(?=\s|$)/g, ".")
    .replace(/(\S)[ \t]{2,}(?=\S)/g, "$1 ")
    .replace(/[ \t\u00a0]+$/gm, "");
  return fixTypography(calm, lang);
}

export const errorsOf = (issues: WritingIssue[]) => issues.filter((i) => i.severity === "erreur");
