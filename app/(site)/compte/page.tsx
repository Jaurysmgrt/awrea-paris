import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AccountApp } from "@/components/account/AccountApp";
import { TextsRoot } from "@/components/content/TextsRoot";

type Compte = typeof import("@/content/site/fr/compte.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Compte>("compte", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/compte", noindex: true });
}

export default async function ComptePage() {
  const t = await getDoc<Compte>("compte");
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/compte" }]} />
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
