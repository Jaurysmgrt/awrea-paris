import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AccountApp } from "@/components/account/AccountApp";
import { TextsRoot } from "@/components/content/TextsRoot";
import { getLocale } from "@/lib/i18n/server";

type Compte = typeof import("@/content/site/fr/compte.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Compte>("compte", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/compte", noindex: true });
}

export default async function ComptePage() {
  const [t, locale] = await Promise.all([getDoc<Compte>("compte"), getLocale()]);
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/compte" }]} />
      <Section theme="ivory" className="section section--flush-top">
        {/* espace cliente écrit en français (content/fr/account.ts) : signalé comme tel sous /en */}
        <div className="container account-container" lang={locale !== "fr" ? "fr" : undefined}>
          {/* frise de la confection et numéro de création : textes des documents d'Édition */}
          <TextsRoot ids={["suivi-commande", "certificat"]}>
            <AccountApp />
          </TextsRoot>
        </div>
      </Section>
    </>
  );
}
