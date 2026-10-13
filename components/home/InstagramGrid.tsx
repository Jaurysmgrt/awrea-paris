import type { InstagramPost } from "@/lib/instagram/feed";

/**
 * Grille Instagram. Les visuels distants passent par l'optimiseur d'images du site
 * (servis depuis notre domaine, en AVIF ou WebP) : aucune requête vers Instagram depuis
 * le navigateur, donc aucun traceur et aucun consentement nécessaire pour les afficher.
 */
export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  return (
    <ul className="insta">
      {posts.map((p) => (
        <li key={p.id}>
          <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="insta__item media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.remote ? `/_next/image?url=${encodeURIComponent(p.image)}&w=480&q=70` : p.image}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              width={480}
              height={600}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
