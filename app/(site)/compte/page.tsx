import { account } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AccountView } from "@/components/commerce/AccountView";

export const metadata = pageMetadata({ ...account.seo, path: "/compte", noindex: true });

export default function ComptePage() {
  return (
    <>
      <PageHeader title={account.h1} crumbs={[{ name: "Mon compte", path: "/compte" }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container-prose">
          <AccountView shopifyAccountUrl={process.env.NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL} />
        </div>
      </Section>
    </>
  );
}
