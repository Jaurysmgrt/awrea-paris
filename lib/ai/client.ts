/**
 * Client Claude partagé par l'assistante et les agents.
 * - Modèle : Claude Opus 5.5 par défaut (ANTHROPIC_MODEL pour le changer).
 * - Repli côté serveur activé (`fallbacks: "default"`) : si les garde-fous du modèle déclinent
 *   une requête, l'API la rejoue sur le modèle de repli recommandé, dans le même appel.
 * - Sans identifiants Anthropic (ou avec AI_PROVIDER=mock), `aiEnabled` est faux : l'assistante
 *   et les agents passent en mode démonstration déterministe.
 */
import Anthropic from "@anthropic-ai/sdk";
import { providerOf } from "@/lib/config/providers";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

export const aiEnabled = providerOf("ai") === "anthropic";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 5 * 60 * 1000 });
  return client;
}

/** Paramètres communs : repli serveur par catégorie de refus. */
export const FALLBACK_PARAMS = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
