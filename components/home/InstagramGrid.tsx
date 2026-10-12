"use client";
import { useConsent } from "@/components/layout/CookieBanner";
import { instagramFallback, type InstagramPost } from "@/lib/instagram/feed";

/** Grille Instagram : les images distantes ne sont chargées qu'avec le consentement « contenus Instagram ». */
export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  const consent = useConsent();
  const list = posts.some((p) => p.remote) && !consent?.social ? instagramFallback : posts;
  return (
    <ul className="insta">
      {list.map((p) => (
        <li key={p.id}>
          <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="insta__item media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.alt} loading="lazy" decoding="async" width={480} height={600} />
          </a>
        </li>
      ))}
    </ul>
  );
}
