import type { Metadata } from "next";
import { timingSafeEqual } from "node:crypto";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { pageMetadata } from "@/lib/seo/metadata";
import { identity } from "@/content/brand/identity";
import { APPOINTMENT_TYPES, cancelToken, listAppointments } from "@/lib/appointments";
import { whenOf } from "@/lib/appointments-notify";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CancelButton } from "@/components/appointments/CancelButton";

type RendezVous = typeof import("@/content/site/fr/rendez-vous.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<RendezVous>("rendez-vous", "fr", { plain: true });
  return { ...pageMetadata({ title: t.annulation.seo.title, description: t.annulation.seo.description, path: "/rendez-vous/annuler" }), robots: { index: false, follow: false } };
}

export default async function AnnulerPage({ searchParams }: { searchParams: Promise<{ id?: string; jeton?: string }> }) {
  const t = (await getDoc<RendezVous>("rendez-vous")).annulation;
  const { id = "", jeton = "" } = await searchParams;
  const expected = /^RDV-[A-F0-9]{8}$/.test(id) ? cancelToken(id) : "";
  const valid = Boolean(expected) && jeton.length === expected.length && timingSafeEqual(Buffer.from(jeton), Buffer.from(expected));
  const a = valid ? (await listAppointments()).find((x) => x.id === id && x.status === "confirme") : undefined;
  return (
    <>
      <PageHeader
        title={a ? t.titre : t.invalide.titre}
        lead={a ? fill(t.texte, { rendezvous: APPOINTMENT_TYPES[a.type].label, quand: whenOf(a.start) }) : fill(t.invalide.texte, { email: identity.email })}
        crumbs={[{ name: t.titre, path: "/rendez-vous/annuler" }]}
      />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">{a ? <CancelButton id={a.id} jeton={jeton} t={t} /> : null}</div>
      </Section>
    </>
  );
}
