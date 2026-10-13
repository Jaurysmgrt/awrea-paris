/**
 * Flux Instagram. Avec INSTAGRAM_ACCESS_TOKEN (API Instagram avec connexion Instagram,
 * compte professionnel), les 8 dernières publications sont récupérées et mises en cache 1 h.
 * Sans jeton, des visuels de la maison hébergés localement sont affichés.
 */
import { identity } from "@/content/brand/identity";

export interface InstagramPost {
  id: string;
  image: string;
  alt: string;
  permalink: string;
  remote: boolean;
}

const fallback: InstagramPost[] = ["odessa-2", "atelier-2", "gaia-1", "kira-1", "atelier-5", "aura-2", "look-1", "atelier-3"].map((n, i) => ({
  id: `local-${i}`,
  image: `/media/img/${n}-480.webp`,
  alt: "Publication Instagram d’Awrea Paris",
  permalink: identity.social.instagram,
  remote: false,
}));

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return fallback;
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=12&access_token=${token}`,
      { next: { revalidate: 3600, tags: ["instagram"] } },
    );
    if (!res.ok) return fallback;
    const json = (await res.json()) as { data: { id: string; caption?: string; media_type: string; media_url: string; thumbnail_url?: string; permalink: string }[] };
    return json.data.slice(0, 8).map((m) => ({
      id: m.id,
      image: m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url) : m.media_url,
      alt: m.caption ? m.caption.split("\n")[0].slice(0, 120) : "Publication Instagram d’Awrea Paris",
      permalink: m.permalink,
      remote: true,
    }));
  } catch {
    return fallback;
  }
}

