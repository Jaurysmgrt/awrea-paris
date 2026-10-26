/**
 * Rôles de la visibilité : Instagram, publicité, accessibilité et performance. Les deux derniers
 * relisent le contrôle de la nuit (agent de maintenance) ; la publicité ne fait que proposer.
 */
import { kv } from "@/lib/store";
import { maintenanceReports } from "@/lib/maintenance";
import { recentErrors } from "@/lib/errors/report";
import type { Finding, RoleOutcome } from "./types";

export async function runInstagram(): Promise<RoleOutcome> {
  const drafts = (await kv.list<{ id: string; kind: string; status: string; title: string }>("content:drafts", 50)).filter((d) => d.kind === "instagram" && d.status === "draft");
  const findings: Finding[] = [];
  if (!drafts.length) findings.push({ gravite: "info", titre: "Aucune publication prête pour la semaine", detail: "L’agent Contenu en prépare chaque mercredi, ou à la demande.", lien: "/contenus", cible: "semaine" });
  return { resume: drafts.length ? `${drafts.length} publication${drafts.length > 1 ? "s" : ""} prête${drafts.length > 1 ? "s" : ""} à poster.` : "Rien de prêt pour Instagram cette semaine.", findings };
}

export async function runPublicite(): Promise<RoleOutcome> {
  // pixels publicitaires branchés (ACTIVATION.md, étape 11)
  const tracked = [process.env.NEXT_PUBLIC_META_PIXEL_ID, process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID].filter(Boolean);
  return {
    resume: tracked.length ? "Mesure branchée : les propositions viendront avec les premiers résultats. Aucune dépense sans votre accord." : "Aucune campagne ni mesure branchée : rien à proposer pour l’instant.",
    findings: [],
  };
}

async function fromMaintenance(re: RegExp, label: string): Promise<RoleOutcome> {
  const [last] = await maintenanceReports(1);
  if (!last) return { resume: `Pas encore de contrôle de nuit : ${label} sera relue dès le premier passage.`, findings: [] };
  const lines = last.details.filter((d) => re.test(d));
  const findings: Finding[] = lines.slice(0, 6).map((d) => ({ gravite: last.status === "alerte" ? "attention" : "info", titre: d.slice(0, 140), lien: "/", cible: d.slice(0, 60) }));
  return { resume: lines.length ? `${lines.length} remarque${lines.length > 1 ? "s" : ""} au dernier contrôle.` : `Rien à signaler sur ${label} au dernier contrôle.`, findings };
}

export const runAccessibilite = () => fromMaintenance(/accessib|axe|contraste|clavier|lecteur/i, "l’accessibilité");
/** Vitesse (contrôle de la nuit) et erreurs relevées sur le site pendant la semaine. */
export async function runPerformance(now = new Date()): Promise<RoleOutcome> {
  const base = await fromMaintenance(/perform|lighthouse|lcp|cls|inp|poids|vitesse/i, "la vitesse");
  const week = (await recentErrors(300)).filter((e) => now.getTime() - new Date(e.date).getTime() < 7 * 86_400_000);
  if (!week.length) return base;
  const byMessage = new Map<string, number>();
  for (const e of week) byMessage.set(e.message, (byMessage.get(e.message) ?? 0) + 1);
  const top = [...byMessage].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const findings: Finding[] = top.map(([message, n]) => ({ gravite: n >= 10 ? "urgent" : "attention", titre: `Erreur vue ${n} fois cette semaine`, detail: message.slice(0, 160), lien: "/", cible: message.slice(0, 60) }));
  return { resume: `${base.resume} ${week.length} erreur${week.length > 1 ? "s" : ""} relevée${week.length > 1 ? "s" : ""} sur le site cette semaine.`, findings: [...base.findings, ...findings] };
}
