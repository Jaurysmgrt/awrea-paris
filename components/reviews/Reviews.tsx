/**
 * Avis vérifiés d'une pièce, sous la fiche : sobres, sans étoiles. Un texte, la taille portée, le
 * tombé ressenti, parfois une photo, et la réponse de la créatrice quand elle en a écrit une.
 */
import { fitLabel, publishedReviews } from "@/lib/reviews";
import { formatDate } from "@/lib/format";

export async function Reviews({ handle }: { handle: string }) {
  const reviews = await publishedReviews(handle).catch(() => []);
  if (!reviews.length) return null;
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="t-h3">
        Elles la portent
      </h2>
      <ul className="reviews__list">
        {reviews.slice(0, 8).map((r) => (
          <li key={r.id} className="review">
            <blockquote className="review__body">
              <p className="t-body">{r.body}</p>
            </blockquote>
            <p className="t-label review__meta">
              {r.authorName}
              {r.size ? ` · taille ${r.size}` : ""}
              {r.fit ? ` · ${fitLabel[r.fit].toLowerCase()}` : ""} · achat vérifié · {formatDate(r.createdAt)}
            </p>
            {r.photos.length ? (
              <ul className="review__photos">
                {r.photos.map((id, i) => (
                  <li key={id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- photo de cliente servie par /api/media, déjà recompressée */}
                    <img src={`/api/media/${id}`} alt={`Photo de ${r.authorName} portant la pièce (${i + 1})`} loading="lazy" decoding="async" />
                  </li>
                ))}
              </ul>
            ) : null}
            {r.reply ? (
              <p className="t-note review__reply">
                <span className="t-label">La créatrice</span> {r.reply}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
