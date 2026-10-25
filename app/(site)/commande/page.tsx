import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { getDoc } from "@/lib/edition/read";
import type { CommerceTexts } from "@/lib/commerce/texts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { readCart } from "@/lib/commerce/cart";
import { shopifyEnabled } from "@/lib/shopify/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDoc<CommerceTexts>("commerce", "fr", { plain: true })).commande.page;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/commande", noindex: true });
}
export const dynamic = "force-dynamic";

export default async function CommandePage() {
  if (shopifyEnabled) {
    const cart = await readCart();
    if (cart.lines.length && cart.checkoutUrl.startsWith("http")) redirect(cart.checkoutUrl);
  }
  const t = (await getDoc<CommerceTexts>("commerce")).commande.page;
  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/commande" }]} lead={t.chapeau} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          <CheckoutForm />
        </div>
      </Section>
    </>
  );
}
