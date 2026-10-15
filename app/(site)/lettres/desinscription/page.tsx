import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { pageMetadata } from "@/lib/seo/metadata";
import { identity } from "@/content/brand/identity";
import { emailOfToken } from "@/lib/marketing/unsubscribe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { UnsubscribeButton } from "@/components/marketing/UnsubscribeButton";

type Lettres = typeof import("@/content/site/fr/lettres.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Lettres>("lettres");
  return { ...pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/lettres/desinscription" }), robots: { index: false, follow: false } };
}

export default async function DesinscriptionPage({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const t = await getDoc<Lettres>("lettres");
  const { jeton } = await searchParams;
  const valid = Boolean(emailOfToken(jeton));
  return (
    <>
      <PageHeader title={valid ? t.titre : t.invalide.titre} lead={valid ? t.texte : fill(t.invalide.texte, { email: identity.email })} crumbs={[{ name: t.titre, path: "/lettres/desinscription" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">{valid && jeton ? <UnsubscribeButton token={jeton} t={t} /> : null}</div>
      </Section>
    </>
  );
}
