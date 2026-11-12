import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { emailDuJeton, type PrivilegeTexts } from "@/lib/crm/lettre";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ConfirmationLettre } from "@/components/marketing/ConfirmationLettre";

/**
 * Confirmation de l'inscription à la lettre (lien de l'e-mail « Confirmez votre inscription ») : la
 * page confirme dans le navigateur, puis annonce le privilège de bienvenue. Jamais indexée.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<PrivilegeTexts>("privilege", { plain: true });
  return { ...(await pageMetadata({ title: t.confirmation.seo.title, description: t.confirmation.seo.description, path: "/lettres/confirmation" })), robots: { index: false, follow: false } };
}

export default async function ConfirmationLettrePage({ searchParams }: { searchParams: Promise<{ jeton?: string | string[] }> }) {
  const t = (await getDoc<PrivilegeTexts>("privilege")).confirmation;
  const { jeton } = await searchParams;
  const valable = typeof jeton === "string" && Boolean(emailDuJeton(jeton));
  return (
    <>
      <PageHeader title={valable ? t.entete : t.invalide.titre} lead={valable ? undefined : t.invalide.texte} crumbs={[{ name: valable ? t.entete : t.invalide.titre, path: "/lettres/confirmation" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">{valable && typeof jeton === "string" ? <ConfirmationLettre jeton={jeton} t={t} /> : null}</div>
      </Section>
    </>
  );
}
