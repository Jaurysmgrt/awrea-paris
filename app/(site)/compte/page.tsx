import { account } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AccountApp } from "@/components/account/AccountApp";

export const metadata = pageMetadata({ ...account.seo, path: "/compte", noindex: true });

export default function ComptePage() {
  return (
    <>
      <PageHeader title={account.h1} crumbs={[{ name: "Mon compte", path: "/compte" }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container account-container">
          <AccountApp />
        </div>
      </Section>
    </>
  );
}
