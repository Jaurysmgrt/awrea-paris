import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { orderFromReviewToken, reviewablePieces } from "@/lib/reviews";

export const metadata: Metadata = { title: { absolute: "Votre avis | Awrea Paris" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Avis vérifié : la page vers laquelle mène la demande d'avis envoyée après la livraison. */
export default async function AvisPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const order = await orderFromReviewToken(decodeURIComponent(number), t);
  const pieces = order ? await reviewablePieces(order) : [];
  return (
    <>
      <PageHeader
        title="Votre avis"
        lead={order ? "Comment tombe votre pièce, ce que vous ressentez en la portant, si la taille vous a semblé juste : votre regard aide d’autres femmes à choisir, et il guide l’atelier." : "Ce lien n’est plus valable. Écrivez-nous, nous vous en enverrons un nouveau."}
        crumbs={[{ name: "Votre avis", path: `/avis/${number}` }]}
      />
      <Section theme="paper" className="section">
        <div className="container-text stack-l">
          {!order ? (
            <p className="t-body">
              <Link href="/contact" className="text-link">Écrire à l’atelier</Link>
            </p>
          ) : pieces.length ? (
            pieces.map((l) => <ReviewForm key={l.handle} number={order.number} token={t ?? ""} handle={l.handle} title={l.title} size={l.size} />)
          ) : (
            <p className="t-body">Vous avez déjà donné votre avis sur chaque pièce de cette commande. Merci de tout cœur.</p>
          )}
        </div>
      </Section>
    </>
  );
}
