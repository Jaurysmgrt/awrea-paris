import { wishlist } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { WishlistView } from "@/components/commerce/WishlistView";

export const metadata = pageMetadata({ ...wishlist.seo, path: "/liste-envies", noindex: true });

export default function ListeEnviesPage() {
  return (
    <>
      <PageHeader title={wishlist.h1} crumbs={[{ name: wishlist.h1, path: "/liste-envies" }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          <WishlistView />
        </div>
      </Section>
    </>
  );
}
