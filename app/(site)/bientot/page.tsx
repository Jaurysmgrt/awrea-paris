import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { DropView } from "@/components/drops/DropView";
import { nextDrop } from "@/lib/drops";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Bientôt | Awrea Paris",
  description: "La prochaine série d’Awrea Paris : date d’ouverture, accès anticipé réservé aux inscrites, pièces numérotées faites main à Paris.",
  path: "/bientot",
});
export const dynamic = "force-dynamic";

/** « Bientôt » : la prochaine série annoncée, ou l'invitation à recevoir les lettres de l'atelier. */
export default async function BientotPage() {
  const drop = await nextDrop();
  if (drop && !drop.privateSale) return <DropView drop={drop} />;
  return (
    <>
      <PageHeader title="Bientôt" lead="Aucune nouvelle série n’est annoncée pour le moment. Les lettres de l’atelier vous préviennent en premier, avec l’accès anticipé aux prochaines pièces." crumbs={[{ name: "Bientôt", path: "/bientot" }]} />
      <Section theme="paper" className="section">
        <div className="container-text stack-m">
          <NewsletterForm source="bientot" />
          <p className="t-note">
            En attendant, <Link href="/boutique" className="text-link">découvrez les pièces disponibles</Link>.
          </p>
        </div>
      </Section>
    </>
  );
}
