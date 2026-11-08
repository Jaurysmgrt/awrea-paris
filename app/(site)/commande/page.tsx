import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { pageMetadata } from "@/lib/seo/metadata";
import { getDoc } from "@/lib/edition/read";
import type { CommerceTexts } from "@/lib/commerce/texts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { commandesOuvertes } from "@/lib/config/boutique";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDoc<CommerceTexts>("commerce", { plain: true })).commande.page;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/commande", noindex: true });
}
export const dynamic = "force-dynamic";

/**
 * Commande : sur la boutique réelle, tant que le paiement en ligne n'est pas branché, la page le dit
 * et ne propose aucun formulaire de paiement (lib/config/boutique.ts) ; en démonstration, le
 * paiement d'essai.
 */
export default async function CommandePage() {
  const t = (await getDoc<CommerceTexts>("commerce")).commande.page;
  const ouvertes = commandesOuvertes();
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/commande" }]} lead={ouvertes ? t.chapeau : undefined} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          {ouvertes ? (
            <CheckoutForm />
          ) : (
            <div className="stack-m">
              <p className="t-body">{t.fermee}</p>
              <Link href="/contact" className="btn">
                {t.fermeeLien}
              </Link>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
