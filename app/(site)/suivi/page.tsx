import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { TrackForm } from "@/components/orders/TrackForm";
import Link from "@/components/ui/Link";

export const metadata = pageMetadata({
  title: "Suivre une commande | Awrea Paris",
  description: "Suivez votre commande Awrea Paris sans compte : numéro de commande et adresse e-mail suffisent. Retours, échanges de taille et facture au même endroit.",
  path: "/suivi",
});

export default function SuiviPage() {
  return (
    <>
      <PageHeader
        title="Suivre une commande"
        lead="Le numéro de la commande et l’adresse e-mail utilisée suffisent : aucun compte n’est nécessaire. Vous y trouverez aussi la facture, et le retour ou l’échange de taille."
        crumbs={[{ name: "Suivre une commande", path: "/suivi" }]}
      />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">
          <TrackForm />
          <p className="t-note">
            Le numéro figure dans l’e-mail de confirmation (il commence par « AW- »). Vous avez un compte ? Vos commandes vous attendent dans <Link href="/compte">votre espace</Link>.
          </p>
        </div>
      </Section>
    </>
  );
}
