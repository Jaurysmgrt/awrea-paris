import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { pageMetadata } from "@/lib/seo/metadata";
import { getDoc } from "@/lib/edition/read";
import type { CommerceTexts } from "@/lib/commerce/texts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { commandesOuvertes, paiementEnLigne, stripeEnTest } from "@/lib/config/boutique";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDoc<CommerceTexts>("commerce", { plain: true })).commande.page;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/commande", noindex: true });
}
export const dynamic = "force-dynamic";

/**
 * Commande : coordonnées, livraison, puis paiement sur la page sécurisée de Stripe (lib/paiement).
 * Sur la boutique réelle sans paiement branché, la page le dit et ne propose aucun formulaire
 * (lib/config/boutique.ts) ; en démonstration sans Stripe, le paiement d'essai. Au retour d'un
 * paiement abandonné ou refusé (?paiement=annule), elle le dit : le panier est intact.
 */
export default async function CommandePage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const t = (await getDoc<CommerceTexts>("commerce")).commande.page;
  const ouvertes = commandesOuvertes();
  const annule = (await searchParams).paiement === "annule";
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/commande" }]} lead={ouvertes ? t.chapeau : undefined} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          {annule && ouvertes ? (
            <p className="notice t-body" role="status">
              {t.annule}
            </p>
          ) : null}
          {ouvertes ? (
            <CheckoutForm paiement={paiementEnLigne() ? "stripe" : "essai"} stripeTest={paiementEnLigne() && stripeEnTest()} />
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
