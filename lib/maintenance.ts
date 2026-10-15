/**
 * Rapports de l'agent de maintenance quotidienne (GitHub Actions) : ce qui a été vérifié,
 * corrigé, déployé ou annulé. Affichés dans l'Atelier ; l'historique complet est dans JOURNAL.md.
 */
import "server-only";
import { kv } from "@/lib/store";

export type MaintenanceStatus = "ok" | "corrige" | "alerte" | "annule";

export interface MaintenanceReport {
  date: string;
  status: MaintenanceStatus;
  summary: string;
  details: string[];
  link?: string;
}

const KEY = "maintenance:reports";

export async function saveMaintenanceReport(r: MaintenanceReport) {
  await kv.push(KEY, r, 120);
}

export async function maintenanceReports(limit = 14): Promise<MaintenanceReport[]> {
  return kv.list<MaintenanceReport>(KEY, limit);
}

export const maintenanceLabels: Record<MaintenanceStatus, string> = {
  ok: "Tout est en ordre",
  corrige: "Corrigé et déployé",
  alerte: "Votre attention est requise",
  annule: "Déploiement annulé (retour à la version précédente)",
};
