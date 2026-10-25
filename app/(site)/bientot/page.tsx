import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsletterBlock } from "@/components/ui/NewsletterForm";
import { DropView } from "@/components/drops/DropView";
import type { AvantPremieresTexts } from "@/components/drops/regles";
import { nextDrop } from "@/lib/drops";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<AvantPremieresTexts>("avant-premieres", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/bientot" });
}
export const dynamic = "force-dynamic";

/**
 * « Bientôt » : la prochaine collection annoncée par la Maison (avant-première), ou, sans
 * annonce, l'invitation à la lettre de la Maison, dont les inscrites voient les collections en
 * premier. Une présentation privée n'apparaît jamais ici : son adresse est transmise par la Maison.
 */
export default async function BientotPage() {
  const drop = await nextDrop();
  if (drop) return <DropView drop={drop} onBientot />;
  const t = await getDoc<AvantPremieresTexts>("avant-premieres");
  const b = t.attente.boutique;
  return (
    <>
      <PageHeader title={t.attente.titre} lead={t.attente.chapeau} crumbs={[{ name: t.fil, path: "/bientot" }]} />
      <Section theme="paper" className="section" labelledBy="bientot-lettre">
        <div className="container-prose">
          <NewsletterBlock source="bientot" titleId="bientot-lettre" />
        </div>
      </Section>
      <Section theme="ivory" className="section" labelledBy="bientot-boutique">
        <div className="container-text stack-l">
          <h2 id="bientot-boutique" className="t-h3">
            {b.titre}
          </h2>
          <p className="t-body">{b.texte}</p>
          <p>
            <Link href={b.href} className="btn btn--outline">
              {b.label}
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
