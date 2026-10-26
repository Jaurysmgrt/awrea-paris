/**
 * « Trouver ma taille » : à partir des mesures du corps (tour de poitrine, de taille, de hanches),
 * la taille conseillée pour une pièce donnée, selon le guide des tailles de la maison et la coupe
 * de la pièce (entre deux tailles : la plus petite pour une pièce lacée, qui s'ajuste ; la plus
 * grande pour le satin, qui ne cède pas). Les phrases du conseil viennent du document « catalogue »
 * (mesures.conseils), passées par l'appelant.
 */
import { shop } from "@/content/settings";
import { fill } from "@/lib/edition/fill";
import type { Product, Size } from "@/lib/commerce/types";

/** Modèles des phrases du conseil (document « catalogue », clé mesures.conseils). */
export interface FitTexts {
  taille: string;
  entreLacee: string;
  entreSatin: string;
  entreSouple: string;
  nonProposee: string;
  auDela: string;
}

export interface Measures {
  poitrine?: number;
  taille?: number;
  hanches?: number;
}

export interface FitAdvice {
  size: Size;
  /** les mesures tombent entre deux tailles */
  between: [Size, Size] | null;
  /** la taille conseillée existe pour cette pièce */
  offered: boolean;
  message: string;
}

const chart = shop.sizeGuide.rows.map((r) => ({
  size: r[0] as Size,
  poitrine: parseFloat(r[2]),
  taille: parseFloat(r[3]),
  hanches: parseFloat(r[4]),
}));

export type FitKind = "lacee" | "satin" | "souple";

export function fitKind(p: Pick<Product, "materials" | "details" | "tags" | "category">): FitKind {
  const text = `${p.details.join(" ")} ${p.tags.join(" ")}`.toLowerCase();
  if (/lac[ée]|laçage|corset/.test(text)) return "lacee";
  const main = [...p.materials].sort((a, b) => b.percent - a.percent)[0]?.name.toLowerCase() ?? "";
  return main.includes("satin") ? "satin" : "souple";
}

/** Rang de taille pour une mesure : position exacte (entier) ou entre deux rangs (décimal). */
function rank(value: number, key: keyof Measures): number {
  const col = chart.map((c) => c[key]);
  if (value <= col[0]) return 0;
  for (let i = 1; i < col.length; i++) {
    if (value <= col[i]) return value === col[i] ? i : i - 1 + (value - col[i - 1]) / (col[i] - col[i - 1]);
  }
  return col.length - 1 + 0.5; // au-delà du guide
}

export function recommendSize(p: Product, m: Measures, t: FitTexts): FitAdvice | null {
  const keys = (["poitrine", "taille", "hanches"] as const).filter((k) => typeof m[k] === "number" && (m[k] as number) > 30 && (m[k] as number) < 200);
  if (!keys.length) return null;
  const r = Math.max(...keys.map((k) => rank(m[k] as number, k)));
  const kind = fitKind(p);
  const lower = Math.min(Math.floor(r), chart.length - 1);
  const upper = Math.min(Math.ceil(r), chart.length - 1);
  const between: [Size, Size] | null = lower !== upper ? [chart[lower].size, chart[upper].size] : null;
  const index = between ? (kind === "lacee" ? lower : upper) : lower;
  const size = chart[index].size;
  const beyond = r > chart.length - 1;
  const offered = p.variants.some((v) => v.size === size);
  const why = between
    ? fill(kind === "lacee" ? t.entreLacee : kind === "satin" ? t.entreSatin : t.entreSouple, { petite: between[0], grande: between[1], taille: size })
    : fill(t.taille, { taille: size });
  const message = beyond ? t.auDela : offered ? why : `${why} ${t.nonProposee}`;
  return { size, between, offered: offered && !beyond, message };
}
