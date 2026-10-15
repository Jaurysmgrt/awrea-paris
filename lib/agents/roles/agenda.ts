/**
 * Rendez-vous : la veille, un rappel part à chaque cliente (e-mail « Rappel de rendez-vous »,
 * modifiable dans l'Atelier › E-mails) ; le matin, la créatrice reçoit le programme du jour.
 */
import { kv } from "@/lib/store";
import { siteUrl } from "@/lib/seo/metadata";
import { APPOINTMENT_TYPES, cancelToken, listAppointments } from "@/lib/appointments";
import { sendDocEmail } from "@/lib/email/documents";
import { logAction } from "@/lib/agents/log";
import type { Finding, RoleOutcome } from "./types";

const paris = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...opts }).format(new Date(iso));
const dayKey = (d: Date) => paris(d.toISOString(), { year: "numeric", month: "2-digit", day: "2-digit" });

export async function runRendezVous(now = new Date()): Promise<RoleOutcome> {
  const list = (await listAppointments()).filter((a) => a.status === "confirme");
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000));
  const findings: Finding[] = [];
  let sent = 0;
  for (const a of list) {
    const day = dayKey(new Date(a.start));
    const hour = paris(a.start, { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
    if (day === today) findings.push({ gravite: "info", titre: `${hour} · ${APPOINTMENT_TYPES[a.type].label}`, detail: a.name, cible: a.id });
    if (day !== tomorrow) continue;
    const flag = `rendez-vous:rappel:${a.id}`;
    if (await kv.get(flag)) continue;
    const quand = `${paris(a.start, { weekday: "long", day: "numeric", month: "long" })} à ${hour}`;
    try {
      await sendDocEmail("email-rappel-rendez-vous", a.email, {
        vars: { prenom: a.name.split(" ")[0] ?? "", quand, rendezvous: APPOINTMENT_TYPES[a.type].label, visio: a.videoUrl ?? "", annulation: `${siteUrl}/rendez-vous/annuler?id=${encodeURIComponent(a.id)}&jeton=${cancelToken(a.id)}` },
        tag: "rappel-rendez-vous",
      });
      await kv.set(flag, now.toISOString());
      await logAction({ agent: "rendez-vous", kind: "send_reminder", status: "done", summary: `Rappel envoyé à ${a.name} pour ${quand}` });
      sent++;
    } catch (e) {
      findings.push({ gravite: "attention", titre: `Le rappel de ${a.name} n’est pas parti`, detail: e instanceof Error ? e.message : String(e), lien: "/journal", cible: `${a.id}:rappel` });
    }
  }
  const todayCount = findings.filter((f) => f.gravite === "info").length;
  return { resume: `${todayCount ? `${todayCount} rendez-vous aujourd’hui` : "Aucun rendez-vous aujourd’hui"}, ${sent ? `${sent} rappel${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""} pour demain` : "aucun rappel à envoyer"}.`, findings };
}
