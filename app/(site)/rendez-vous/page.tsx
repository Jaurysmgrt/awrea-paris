import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { BookingForm } from "@/components/appointments/BookingForm";

type RendezVous = typeof import("@/content/site/fr/rendez-vous.json");
const TYPES = ["visio", "sur-mesure"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<RendezVous>("rendez-vous", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/rendez-vous" });
}

export default async function RendezVousPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const t = await getDoc<RendezVous>("rendez-vous");
  const { type } = await searchParams;
  const initial = TYPES.find((x) => x === type);
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/rendez-vous" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose">
          <BookingForm t={t} initialType={initial} />
        </div>
      </Section>
    </>
  );
}
