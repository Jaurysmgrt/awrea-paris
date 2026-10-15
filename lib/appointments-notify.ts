/**
 * Messages d'un rendez-vous : confirmation à la cliente (avec l'invitation pour son agenda), avis à
 * l'atelier. Textes dans les e-mails « Confirmation de rendez-vous » et « Nouveau rendez-vous »,
 * modifiables dans l'Atelier › E-mails.
 */
import "server-only";
import { identity } from "@/content/brand/identity";
import { siteUrl } from "@/lib/seo/metadata";
import { sendDocEmail } from "@/lib/email/documents";
import { APPOINTMENT_TYPES, cancelToken, listAppointments, toIcs, type Appointment } from "@/lib/appointments";

const fmt = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d);
  const hour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d).replace(":", " h ");
  return `${day} à ${hour}`;
};

export const whenOf = fmt;
export const cancelLink = (a: Pick<Appointment, "id">) => `${siteUrl}/rendez-vous/annuler?id=${encodeURIComponent(a.id)}&jeton=${cancelToken(a.id)}`;
const atelierEmail = () => process.env.ATELIER_EMAIL ?? identity.email;
const location = () => [identity.address.streetAddress, identity.address.postalCode, identity.address.addressLocality].filter(Boolean).join(", ");

export async function notifyBooked(a: Appointment) {
  const t = APPOINTMENT_TYPES[a.type];
  const quand = fmt(a.start);
  const ics = toIcs([a], { forClient: true, location: location(), organizer: atelierEmail() });
  await sendDocEmail("email-confirmation-rendez-vous", a.email, {
    vars: { prenom: a.name.split(" ")[0] ?? "", quand, rendezvous: t.label, visio: a.videoUrl ?? "", annulation: cancelLink(a) },
    tag: "rendez-vous",
    replyTo: atelierEmail(),
    attachments: [{ filename: "rendez-vous-awrea-paris.ics", content: ics }],
  });
  await sendDocEmail("email-nouveau-rendez-vous", atelierEmail(), {
    vars: { nom: a.name, quand, rendezvous: t.label, coordonnees: [a.email, a.phone].filter(Boolean).join(" · "), message: a.message ?? "" },
    tag: "rendez-vous-atelier",
    replyTo: a.email,
  });
}

/** Rendez-vous confirmés qui ne sont pas encore passés, du plus proche au plus lointain. */
export async function upcomingAppointments(now = new Date()): Promise<Appointment[]> {
  return (await listAppointments()).filter((a) => a.status === "confirme" && new Date(a.end).getTime() > now.getTime());
}
