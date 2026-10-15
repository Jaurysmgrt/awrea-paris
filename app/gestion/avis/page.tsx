import Link from "@/components/ui/Link";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { fitLabel, listReviews } from "@/lib/reviews";
import { formatDate } from "@/lib/format";

/** Avis clientes : relecture avant publication (avis vérifiés, après achat uniquement). */
export default async function AvisPage() {
  const reviews = await listReviews();
  const pending = reviews.filter((r) => r.status === "pending");
  const published = reviews.filter((r) => r.status === "approved");
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Avis</h1>
        <p className="t-lead">Les avis viennent tous de clientes qui ont acheté la pièce. Relisez-les, puis publiez-les ou refusez-les. Vous pouvez y répondre en quelques mots.</p>
      </header>
      <section className="panel" aria-labelledby="pending-title">
        <h2 id="pending-title" className="t-h3">À relire ({pending.length})</h2>
        {pending.length ? (
          <ul className="stack-l">
            {pending.map((r) => (
              <li key={r.id} className="admin-review stack-s">
                <p className="t-label">
                  <Link href={`/boutique/${r.productHandle}`} className="text-link">{r.productHandle}</Link> · {r.authorName} · commande {r.orderNumber || "non renseignée"} · {formatDate(r.createdAt)}
                  {r.size ? ` · taille ${r.size}` : ""}
                  {r.fit ? ` · ${fitLabel[r.fit].toLowerCase()}` : ""}
                </p>
                <p className="t-body">{r.body}</p>
                {r.photos.length ? (
                  <ul className="review__photos">
                    {r.photos.map((id) => (
                      // eslint-disable-next-line @next/next/no-img-element -- relecture de la photo envoyée
                      <li key={id}><img src={`/api/media/${id}`} alt="Photo de la cliente" /></li>
                    ))}
                  </ul>
                ) : null}
                <ReviewModeration id={r.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucun avis en attente.</p>
        )}
      </section>
      <section className="panel" aria-labelledby="published-title">
        <h2 id="published-title" className="t-h3">Publiés ({published.length})</h2>
        {published.length ? (
          <ul className="stack-m">
            {published.map((r) => (
              <li key={r.id} className="stack-s">
                <p className="t-label">{r.productHandle} · {r.authorName} · {formatDate(r.createdAt)}</p>
                <p className="t-body">{r.body}</p>
                <ReviewModeration id={r.id} reply={r.reply} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucun avis publié pour le moment.</p>
        )}
      </section>
    </div>
  );
}
