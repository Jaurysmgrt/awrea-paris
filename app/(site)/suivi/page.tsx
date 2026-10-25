import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TrackForm } from "@/components/orders/TrackForm";
import Link from "@/components/ui/Link";
import type { SuiviTexts } from "@/components/commerce/OrderStages";

/**
 * Suivre une commande sans compte : le numéro et l'adresse e-mail de la commande ouvrent son suivi
 * (étapes de la confection, facture, retours). Textes : document « suivi-commande ».
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<SuiviTexts>("suivi-commande", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/suivi" });
}

export default async function SuiviPage() {
  const t = (await getDoc<SuiviTexts>("suivi-commande")).recherche;
  const [avant, apres = ""] = t.aide.split("{lien}");
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/suivi" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">
          <TrackForm />
          <p className="t-note">
            {avant}
            <Link href="/compte">{t.lienCompte}</Link>
            {apres}
          </p>
        </div>
      </Section>
    </>
  );
}
