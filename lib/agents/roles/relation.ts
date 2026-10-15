/**
 * Rôles de la relation avec les clientes : données personnelles, Cercle, sur mesure, presse et
 * influence. Ils lisent la boîte des messages et la base clientes, signalent ce qui attend et
 * préparent ; ils n'effacent rien et n'envoient rien à toute une liste.
 */
import { listInbox, type InboxMessage } from "@/lib/inbox";
import { listCustomerStats } from "@/lib/customers";
import type { Finding, RoleOutcome } from "./types";

const DAY = 86_400_000;
const age = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
const open = (m: InboxMessage) => m.status === "new" || m.status === "drafted" || m.status === "escalated";
const about = (re: RegExp) => (m: InboxMessage) => re.test(`${m.subject} ${m.message}`);

const DATA = /\b(rgpd|mes données|données personnelles|supprimer mon compte|effacer mes|droit d.accès|désinscri)/i;
const BESPOKE = /sur[ -]mesure|sur mesure/i;
const PRESS = /\b(presse|journaliste|magazine|rédaction|partenariat|collaboration|influence|influenceuse|shooting|prêt de pièce)/i;

export async function runRgpd(now = new Date()): Promise<RoleOutcome> {
  const [inbox, customers] = await Promise.all([listInbox(500), listCustomerStats().catch(() => [])]);
  const findings: Finding[] = [];
  for (const m of inbox.filter(open).filter(about(DATA))) {
    const d = age(m.date, now);
    // un mois pour répondre à une demande d'accès ou d'effacement (RGPD, article 12)
    findings.push({ gravite: d >= 20 ? "urgent" : "attention", titre: `Demande sur les données de ${m.name}, reçue il y a ${d} jour${d > 1 ? "s" : ""}`, detail: d >= 20 ? "La réponse est due dans le mois qui suit la demande." : m.subject, lien: "/messages", cible: m.id });
  }
  // prospects sans commande ni activité depuis trois ans : à effacer, ou à relancer une dernière fois (recommandation de la CNIL)
  const sleeping = customers.filter((c) => c.ordersCount === 0 && age(c.createdAt, now) > 3 * 365);
  if (sleeping.length) findings.push({ gravite: "attention", titre: `${sleeping.length} inscrite${sleeping.length > 1 ? "s" : ""} sans commande depuis plus de trois ans`, detail: "Leurs données sont à effacer, ou à garder seulement si elles le confirment.", lien: "/clientes", cible: "inactives" });
  return { resume: findings.length ? `${findings.length} point${findings.length > 1 ? "s" : ""} sur les données personnelles.` : "Aucune demande en attente, aucune donnée à échéance.", findings };
}

export async function runCercle(): Promise<RoleOutcome> {
  const customers = await listCustomerStats().catch(() => []);
  const candidates = customers.filter((c) => c.segment === "vip" && !c.cercleMember);
  const findings: Finding[] = candidates.slice(0, 10).map((c) => ({ gravite: "info", titre: `${c.firstName ?? c.email} peut entrer dans le Cercle`, detail: `${c.ordersCount} commandes.`, lien: "/clientes", cible: c.id }));
  return { resume: candidates.length ? `${candidates.length} cliente${candidates.length > 1 ? "s" : ""} pourrai${candidates.length > 1 ? "ent" : "t"} entrer dans le Cercle.` : "Aucune nouvelle entrée possible dans le Cercle.", findings };
}

export async function runSurMesure(now = new Date()): Promise<RoleOutcome> {
  const inbox = await listInbox(500);
  const asks = inbox.filter((m) => m.appointment?.type === "sur-mesure" || about(BESPOKE)(m));
  const waiting = asks.filter(open);
  const findings: Finding[] = waiting.map((m) => ({ gravite: age(m.date, now) >= 2 ? "attention" : "info", titre: `Demande de sur mesure de ${m.name}`, detail: `Reçue il y a ${age(m.date, now)} jour${age(m.date, now) > 1 ? "s" : ""}.`, lien: "/messages", cible: m.id }));
  return { resume: waiting.length ? `${waiting.length} demande${waiting.length > 1 ? "s" : ""} de sur mesure en attente.` : "Aucune demande de sur mesure en attente.", findings };
}

export async function runPresse(now = new Date()): Promise<RoleOutcome> {
  const inbox = await listInbox(500);
  const waiting = inbox.filter(open).filter(about(PRESS));
  const findings: Finding[] = waiting.map((m) => ({ gravite: age(m.date, now) >= 3 ? "attention" : "info", titre: `${m.subject || "Demande"} · ${m.name}`, detail: `Reçue il y a ${age(m.date, now)} jour${age(m.date, now) > 1 ? "s" : ""}. Un prêt de pièce passe toujours par vous.`, lien: "/messages", cible: m.id }));
  return { resume: waiting.length ? `${waiting.length} demande${waiting.length > 1 ? "s" : ""} de presse ou de partenariat.` : "Aucune demande de presse en attente.", findings };
}
