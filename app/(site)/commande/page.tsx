import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { readCart } from "@/lib/commerce/cart";
import { shopifyEnabled } from "@/lib/shopify/storefront";

export const metadata = pageMetadata({ title: "Commande | Awrea Paris", description: "Finaliser votre commande Awrea Paris.", path: "/commande", noindex: true });
export const dynamic = "force-dynamic";

export default async function CommandePage() {
  if (shopifyEnabled) {
    const cart = await readCart();
    if (cart.lines.length && cart.checkoutUrl.startsWith("http")) redirect(cart.checkoutUrl);
  }
  return (
    <>
      <PageHeader title="Commande" crumbs={[{ name: "Commande", path: "/commande" }]} lead="Trois étapes, sans création de compte." />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container">
          <CheckoutForm />
        </div>
      </Section>
    </>
  );
}
