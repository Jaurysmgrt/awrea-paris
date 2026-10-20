import { account } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AccountApp } from "@/components/account/AccountApp";
import { TextsRoot } from "@/components/content/TextsRoot";

export const metadata = pageMetadata({ ...account.seo, path: "/compte", noindex: true });

export default function ComptePage() {
  return (
    <>
      <PageHeader title={account.h1} crumbs={[{ name: "Mon compte", path: "/compte" }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container account-container">
          {/* frise de la confection et numéro de création : textes des documents d'Édition */}
          <TextsRoot ids={["suivi-commande", "certificat"]}>
            <AccountApp />
          </TextsRoot>
        </div>
      </Section>
    </>
  );
}
