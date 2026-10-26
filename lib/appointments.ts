/**
 * Rendez-vous, tous en appel vidéo (décision de la créatrice du 25/10/2026, aucune adresse publiée) :
 * appel vidéo avec la créatrice, premier rendez-vous sur mesure.
 *
 * - Créneaux calculés à l'heure de Paris à partir des disponibilités réglées dans l'Atelier
 *   (jours, heures, fermetures), du préavis minimal et des rendez-vous déjà pris.
 * - Synchronisation d'agenda (interrupteur CALENDAR_PROVIDER) :
 *   · la créatrice s'abonne, dans Google Agenda, Apple Calendrier ou Outlook, à l'adresse privée
 *     des rendez-vous (flux iCal signé, toujours disponible) ;
 *   · `ics` : le site lit l'adresse secrète iCal de son agenda (CALENDAR_ICS_URL) et ne propose
 *     jamais un créneau où elle est déjà prise.
 * - Appel vidéo : salle Jitsi Meet privée (gratuite, sans compte), lien envoyé aux deux.
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { kv } from "@/lib/store";
import { sessionSecret } from "@/lib/auth/session";
import { providerOf } from "@/lib/config/providers";

export type AppointmentType = "visio" | "sur-mesure";

export const APPOINTMENT_TYPES: Record<AppointmentType, { label: string; minutes: number; note: string; video: boolean }> = {
  visio: { label: "Appel vidéo avec la créatrice", minutes: 30, note: "Pour parler d’une pièce, d’une taille ou d’un projet, où que vous soyez.", video: true },
  "sur-mesure": { label: "Premier rendez-vous sur mesure", minutes: 90, note: "En appel vidéo : vos envies, les matières et les premières idées de votre pièce. La créatrice vous guide pour prendre vos mesures.", video: true },
};

export interface Availability {
  /** jours ouverts aux rendez-vous (0 = dimanche … 6 = samedi) */
  weekdays: number[];
  start: string; // « 11:00 »
  end: string; // « 18:00 »
  stepMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  /** jours fermés (AAAA-MM-JJ) */
  closed: string[];
}

/** Réglages par défaut, à ajuster dans l'Atelier › Rendez-vous (aucune information publiée sur la Maison). */
export const DEFAULT_AVAILABILITY: Availability = { weekdays: [2, 3, 4, 5, 6], start: "11:00", end: "18:00", stepMinutes: 30, minNoticeHours: 24, maxDaysAhead: 45, closed: [] };

export interface Appointment {
  id: string;
  type: AppointmentType;
  start: string; // ISO UTC
  end: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: "confirme" | "annule";
  videoUrl?: string;
  createdAt: string;
}

const KEY = "appointments";
const AVAIL = "appointments:availability";
const TZ = "Europe/Paris";

export async function getAvailability(): Promise<Availability> {
  return { ...DEFAULT_AVAILABILITY, ...((await kv.get<Partial<Availability>>(AVAIL)) ?? {}) };
}

export async function setAvailability(a: Availability) {
  await kv.set(AVAIL, a);
}

export async function listAppointments(): Promise<Appointment[]> {
  return ((await kv.get<Appointment[]>(KEY)) ?? []).sort((a, b) => a.start.localeCompare(b.start));
}

async function saveAll(list: Appointment[]) {
  await kv.set(KEY, list);
}

// ------------------------------------------------------------------ heure de Paris
/** Décalage de Paris par rapport à UTC (minutes) à un instant donné : +60 l'hiver, +120 l'été. */
function parisOffset(at: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at).map((p) => [p.type, p.value]));
  const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return Math.round((local - at.getTime()) / 60_000);
}

/** « 2026-10-20 » + « 14:30 » à Paris → instant UTC. */
export function parisTime(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  return new Date(guess.getTime() - parisOffset(guess) * 60_000);
}

/** Jour (AAAA-MM-JJ) et jour de semaine à Paris pour un instant. */
export function parisDay(at: Date): { day: string; weekday: number; time: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(at).map((x) => [x.type, x.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { day: `${p.year}-${p.month}-${p.day}`, weekday, time: `${p.hour}:${p.minute}` };
}

// ------------------------------------------------------------------ agenda de la créatrice (iCal)
/** Plages occupées lues dans l'adresse secrète iCal de l'agenda de la créatrice (mise en cache 10 min). */
async function busyFromCalendar(): Promise<{ start: number; end: number }[]> {
  if (providerOf("calendar") !== "ics") return [];
  try {
    const res = await fetch(process.env.CALENDAR_ICS_URL!, { next: { revalidate: 600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const text = (await res.text()).replace(/\r?\n[ \t]/g, "");
    const out: { start: number; end: number }[] = [];
    for (const ev of text.split("BEGIN:VEVENT").slice(1)) {
      const prop = (name: string) => ev.match(new RegExp(`^${name}(;[^:\\n]*)?:([^\\n\\r]+)`, "m"));
      const s = prop("DTSTART");
      const e = prop("DTEND");
      if (!s || /TRANSP:TRANSPARENT/.test(ev) || /STATUS:CANCELLED/.test(ev)) continue;
      const parse = (m: RegExpMatchArray) => {
        const v = m[2].trim();
        if (/^\d{8}$/.test(v)) return parisTime(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, "00:00").getTime(); // journée entière
        const iso = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
        const time = `${v.slice(9, 11)}:${v.slice(11, 13)}`;
        return v.endsWith("Z") ? Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(9, 11), +v.slice(11, 13)) : parisTime(iso, time).getTime();
      };
      const start = parse(s);
      const end = e ? parse(e) : start + (/^\d{8}$/.test(s[2].trim()) ? 86_400_000 : 3_600_000);
      out.push({ start, end });
    }
    return out;
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ créneaux
export async function availableDays(type: AppointmentType, now = new Date()): Promise<string[]> {
  const a = await getAvailability();
  const days: string[] = [];
  for (let i = 0; i <= a.maxDaysAhead && days.length < 21; i++) {
    const { day } = parisDay(new Date(now.getTime() + i * 86_400_000));
    if ((await slotsFor(type, day, now)).length) days.push(day);
  }
  return days;
}

export async function slotsFor(type: AppointmentType, day: string, now = new Date()): Promise<string[]> {
  const a = await getAvailability();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || a.closed.includes(day)) return [];
  const noon = parisTime(day, "12:00");
  if (!a.weekdays.includes(parisDay(noon).weekday)) return [];
  const minutes = APPOINTMENT_TYPES[type].minutes;
  const [taken, busy] = await Promise.all([listAppointments(), busyFromCalendar()]);
  const blocked = [...taken.filter((x) => x.status === "confirme").map((x) => ({ start: new Date(x.start).getTime(), end: new Date(x.end).getTime() })), ...busy];
  const earliest = now.getTime() + a.minNoticeHours * 3_600_000;
  const latest = now.getTime() + a.maxDaysAhead * 86_400_000;
  const out: string[] = [];
  const close = parisTime(day, a.end).getTime();
  for (let t = parisTime(day, a.start).getTime(); t + minutes * 60_000 <= close; t += a.stepMinutes * 60_000) {
    const end = t + minutes * 60_000;
    if (t < earliest || t > latest) continue;
    if (blocked.some((b) => t < b.end && end > b.start)) continue;
    out.push(parisDay(new Date(t)).time);
  }
  return out;
}

// ------------------------------------------------------------------ réservation
export async function book(input: { type: AppointmentType; day: string; time: string; name: string; email: string; phone?: string; message?: string }): Promise<Appointment> {
  const lock = "appointments:lock";
  for (let i = 0; (await kv.incr(lock, 10)) > 1; i++) {
    if (i > 50) throw new Error("Réservation occupée, merci de réessayer.");
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    if (!(await slotsFor(input.type, input.day)).includes(input.time)) throw new Error("Ce créneau vient d’être pris. Merci d’en choisir un autre.");
    const start = parisTime(input.day, input.time);
    const appt: Appointment = {
      id: `RDV-${randomBytes(4).toString("hex").toUpperCase()}`,
      type: input.type,
      start: start.toISOString(),
      end: new Date(start.getTime() + APPOINTMENT_TYPES[input.type].minutes * 60_000).toISOString(),
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      message: input.message?.trim() || undefined,
      status: "confirme",
      videoUrl: APPOINTMENT_TYPES[input.type].video ? `https://meet.jit.si/AwreaParis-${randomBytes(9).toString("base64url")}` : undefined,
      createdAt: new Date().toISOString(),
    };
    await saveAll([...(await listAppointments()), appt]);
    return appt;
  } finally {
    await kv.del(lock);
  }
}

export async function cancelAppointment(id: string): Promise<Appointment | null> {
  const list = await listAppointments();
  const a = list.find((x) => x.id === id);
  if (!a || a.status === "annule") return null;
  a.status = "annule";
  await saveAll(list);
  return a;
}

// ------------------------------------------------------------------ iCal
/** Jeton stable de l'adresse d'abonnement de la créatrice (change si SESSION_SECRET change). */
export const agendaToken = () => createHmac("sha256", sessionSecret()).update("agenda:abonnement").digest("base64url").slice(0, 32);

/** Lien d'annulation signé pour la cliente. */
export const cancelToken = (id: string) => createHmac("sha256", sessionSecret()).update(`agenda:annulation:${id}`).digest("base64url").slice(0, 24);

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Un ou plusieurs rendez-vous au format iCal (invitation de la cliente, abonnement de la créatrice). */
export function toIcs(list: Appointment[], opts: { forClient?: boolean; location: string; organizer: string }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Awrea Paris//Rendez-vous//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Rendez-vous Awrea Paris"];
  for (const a of list) {
    const t = APPOINTMENT_TYPES[a.type];
    const summary = opts.forClient ? `${t.label} chez Awrea Paris` : `${t.label} avec ${a.name}`;
    const description = [opts.forClient ? t.note : `${a.email}${a.phone ? ` · ${a.phone}` : ""}${a.message ? `\n${a.message}` : ""}`, a.videoUrl ? `Appel vidéo : ${a.videoUrl}` : ""].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@awreaparis.com`,
      `DTSTAMP:${icsDate(a.createdAt)}`,
      `DTSTART:${icsDate(a.start)}`,
      `DTEND:${icsDate(a.end)}`,
      `SUMMARY:${icsText(summary)}`,
      `DESCRIPTION:${icsText(description)}`,
      `LOCATION:${icsText(a.videoUrl ?? opts.location)}`,
      `ORGANIZER;CN=Awrea Paris:mailto:${opts.organizer}`,
      `STATUS:${a.status === "annule" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
