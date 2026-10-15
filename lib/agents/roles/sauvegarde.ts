/**
 * Sauvegarde : chaque nuit, la sauvegarde chiffrée (GitHub Actions, .github/workflows/backup.yml)
 * dépose son compte rendu (/api/cron/sauvegarde). Le rôle vérifie qu'elle a eu lieu, qu'elle est
 * récente et que le test de restauration a réussi.
 */
import { kv } from "@/lib/store";
import type { Finding, RoleOutcome } from "./types";

export const BACKUP_KEY = "sauvegarde:derniere";

export interface BackupReport {
  date: string;
  ok: boolean;
  /** la sauvegarde chiffrée a été déchiffrée et restaurée dans une base de test */
  restauration: boolean;
  horsSite: boolean;
  details?: string;
  lien?: string;
}

export async function runSauvegarde(now = new Date()): Promise<RoleOutcome> {
  const last = await kv.get<BackupReport>(BACKUP_KEY);
  const findings: Finding[] = [];
  if (!last) {
    findings.push({ gravite: "attention", titre: "Aucune sauvegarde reçue pour l’instant", detail: "La sauvegarde de la nuit se branche dans GitHub (ACTIVATION.md, étape 13).", lien: "/reglages", cible: "aucune" });
    return { resume: "Pas encore de sauvegarde automatique.", findings };
  }
  const hours = Math.round((now.getTime() - new Date(last.date).getTime()) / 3_600_000);
  if (!last.ok) findings.push({ gravite: "urgent", titre: "La dernière sauvegarde a échoué", detail: last.details, lien: "/reglages", cible: last.date });
  else if (!last.restauration) findings.push({ gravite: "urgent", titre: "La dernière sauvegarde ne s’est pas relue", detail: "Le test de restauration a échoué : la sauvegarde ne servirait à rien en cas de besoin.", lien: "/reglages", cible: `${last.date}:restauration` });
  if (hours > 26) findings.push({ gravite: "urgent", titre: `Dernière sauvegarde il y a ${hours} heures`, detail: "Elle devrait avoir lieu chaque nuit.", lien: "/reglages", cible: `${last.date}:age` });
  if (last.ok && !last.horsSite) findings.push({ gravite: "info", titre: "Sauvegarde gardée seulement dans GitHub", detail: "Une copie hors site se branche avec BACKUP_S3_BUCKET (ACTIVATION.md, étape 13)." , cible: "hors-site" });
  return { resume: last.ok && last.restauration && hours <= 26 ? `Sauvegarde de la nuit faite et relue (il y a ${hours} heure${hours > 1 ? "s" : ""}).` : "La sauvegarde demande votre attention.", findings };
}
