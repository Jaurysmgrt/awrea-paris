import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { WishlistView } from "@/components/commerce/WishlistView";

type ListeEnvies = typeof import("@/content/site/fr/liste-envies.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<ListeEnvies>("liste-envies", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/liste-envies", noindex: true });
}

export default async function ListeEnviesPage() {
  const t = await getDoc<ListeEnvies>("liste-envies");
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/liste-envies" }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          <WishlistView />
        </div>
      </Section>
    </>
  );
}
