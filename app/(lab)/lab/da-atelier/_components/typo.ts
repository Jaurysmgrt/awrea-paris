/**
 * Typographie française des textes affichés (règles de la créatrice, 14/10/2026) :
 * apostrophe typographique, espace insécable avant ; : ! ? et à l'intérieur des guillemets,
 * espace insécable entre un nombre et son unité.
 *
 * `phrase()` s'applique aux textes du catalogue : les deux-points et les tirets de ponctuation y
 * deviennent un point ou une virgule (deux-points au strict minimum, aucun tiret). C'est un filtre
 * d'affichage du laboratoire : la reprise des textes à la source revient à l'équipe Contenu.
 */
const NB = " ";

export function fr(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/\s+([;:!?»])/g, `${NB}$1`)
    // ecriture-ok : motif technique de la typographie, pas un texte lu
    .replace(/«\s*/g, `«${NB}`)
    .replace(/(\d)\s+(cm|m|h|%|€)(?![\p{L}])/gu, `$1${NB}$2`)
    .replace(/\bN°\s+/g, `N°${NB}`);
}

export function phrase(s: string): string {
  return fr(
    s
      .replace(/\s+[—–]\s+/g, ", ")
      .replace(/\s*:\s+(\p{Ll})/gu, (_m, c: string) => `. ${c.toUpperCase()}`),
  );
}

/** Nombres en toutes lettres jusqu'à trente-neuf, au-delà en chiffres. */
const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
function words(n: number, feminin: boolean): string {
  const un = feminin ? "une" : "un";
  if (n === 1) return un;
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 40) {
    const tens = n < 30 ? "vingt" : "trente";
    const u = n % 10;
    return u === 0 ? tens : u === 1 ? `${tens} et ${un}` : `${tens}-${UNITS[u]}`;
  }
  return String(n);
}
/** `feminin` : « une heure », « trente et une heures ». */
export function enLettres(n: number, capital = false, feminin = false): string {
  const w = Number.isInteger(n) && n >= 0 ? words(n, feminin) : String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

/** « N° 3 / 5 », avec les espaces insécables qui empêchent la coupure du numéro. */
export function numero(n: number, total: number): string {
  return `N°${NB}${n}${NB}/${NB}${total}`;
}

/** « Robe Odessa » devient « robe Odessa » dans une phrase : seul le premier mot perd sa capitale. */
export function nomCommun(title: string): string {
  return title.replace(/^\p{Lu}\p{Ll}*/u, (w) => w.toLowerCase());
}
