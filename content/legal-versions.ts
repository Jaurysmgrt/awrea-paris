/**
 * Versions des textes contractuels. À incrémenter (AAAA-MM) à chaque modification substantielle :
 * l'acceptation enregistrée (CGU à la création du compte, CGV à la commande) porte cette version.
 */
import { CONSENT_POLICY_VERSION } from "@/lib/consent";

export const legalVersions = {
  cgu: "2026-10",
  cgv: "2026-10",
  confidentialite: "2026-10",
  cookies: CONSENT_POLICY_VERSION,
} as const;
