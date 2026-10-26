import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { orderFromReviewToken, reviewablePieces } from "@/lib/reviews";

type Avis = typeof import("@/content/site/fr/avis.json");

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Avis>("avis", { plain: true });
  return { title: { absolute: t.seo.title }, description: t.seo.description, robots: { index: false, follow: false } };
}

/** Avis vérifié : la page vers laquelle mène la demande d'avis envoyée après la livraison. */
export default async function AvisPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t: token }, t] = await Promise.all([params, searchParams, getDoc<Avis>("avis")]);
  const order = await orderFromReviewToken(decodeURIComponent(number), token);
  const pieces = order ? await reviewablePieces(order) : [];
  return (
    <>
      <PageHeader title={t.titre} lead={order ? t.chapeau : t.invalide} crumbs={[{ name: t.titre, path: `/avis/${number}` }]} />
      <Section theme="paper" className="section">
        <div className="container-text stack-l">
          {!order ? (
            <p className="t-body">
              <Link href={t.ecrire.href} className="text-link">
                {t.ecrire.label}
              </Link>
            </p>
          ) : pieces.length ? (
            pieces.map((l) => <ReviewForm key={l.handle} number={order.number} token={token ?? ""} handle={l.handle} title={l.title} size={l.size} />)
          ) : (
            <p className="t-body">{t.dejaDonne}</p>
          )}
        </div>
      </Section>
    </>
  );
}
