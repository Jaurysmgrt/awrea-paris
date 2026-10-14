/**
 * Nombres en toutes lettres (orthographe traditionnelle), pour les titres : « Quatre pièces,
 * vingt-neuf exemplaires numérotés ». Au-delà de 99, les chiffres reprennent leur place.
 */
const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

function lettres(n: number): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return DIZAINES[d] + (u === 0 ? "" : u === 1 ? " et un" : `-${UNITES[u]}`);
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${lettres(n - 60)}`;
  if (n < 100) return n === 80 ? "quatre-vingts" : `quatre-vingt-${lettres(n - 80)}`;
  return String(n);
}

export function enLettres(n: number, majuscule = false): string {
  const t = Number.isInteger(n) && n >= 0 ? lettres(n) : String(n);
  return majuscule ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
