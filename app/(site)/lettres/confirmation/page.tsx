import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { lienDeLaPage, type PrivilegeTexts } from "@/lib/crm/lettre";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ConfirmationLettre } from "@/components/marketing/ConfirmationLettre";

/**
 * Page des liens envoyés par la Maison : « Confirmez votre inscription » (lettre et privilège de
 * bienvenue) et « Votre privilège sur cet appareil ». Le jeton est chiffré : l'adresse n'apparaît
 * jamais dans l'adresse de la page. Rien ne se fait sans le bouton. Jamais indexée.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<PrivilegeTexts>("privilege", { plain: true });
  return { ...(await pageMetadata({ title: t.confirmation.seo.title, description: t.confirmation.seo.description, path: "/lettres/confirmation" })), robots: { index: false, follow: false } };
}

export default async function ConfirmationLettrePage({ searchParams }: { searchParams: Promise<{ jeton?: string | string[] }> }) {
  const t = (await getDoc<PrivilegeTexts>("privilege")).confirmation;
  const { jeton } = await searchParams;
  const lien = typeof jeton === "string" ? lienDeLaPage(jeton) : null;
  const type = lien?.k === "privilege-appareil" ? "appareil" : "lettre";
  const titre = !lien ? t.invalide.titre : type === "appareil" ? t.appareil.entete : t.entete;
  return (
    <>
      <PageHeader title={titre} lead={lien ? undefined : t.invalide.texte} crumbs={[{ name: titre, path: "/lettres/confirmation" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">{lien && typeof jeton === "string" ? <ConfirmationLettre jeton={jeton} type={type} t={t} /> : null}</div>
      </Section>
    </>
  );
}
