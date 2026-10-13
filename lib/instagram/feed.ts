/**
 * Flux Instagram. Avec INSTAGRAM_ACCESS_TOKEN (API Instagram avec connexion Instagram,
 * compte professionnel), les 8 dernières publications sont récupérées et mises en cache 1 h.
 * Sans jeton (ou avec INSTAGRAM_PROVIDER=mock), des visuels de la maison hébergés localement sont
 * affichés.
 *
 * Le jeton dure 60 jours : la tâche quotidienne le renouvelle chaque semaine et garde la version
 * renouvelée, chiffrée, dans le stockage technique ; la variable d'environnement ne sert qu'au
 * premier branchement.
 */
import "server-only";
import { identity } from "@/content/brand/identity";
import { providerOf } from "@/lib/config/providers";
import { kv } from "@/lib/store";
import { seal, unseal } from "@/lib/security/seal";

const TOKEN_KEY = "instagram:token";
type StoredToken = { sealed: string; refreshedAt: string; expiresAt: string };

async function currentToken(): Promise<string | undefined> {
  if (providerOf("instagram") !== "instagram") return undefined;
  const stored = await kv.get<StoredToken>(TOKEN_KEY).catch(() => null);
  const renewed = stored && new Date(stored.expiresAt) > new Date() ? unseal("instagram", stored.sealed) : null;
  return renewed ?? process.env.INSTAGRAM_ACCESS_TOKEN;
}

/** Renouvelle le jeton longue durée s'il a plus de 7 jours (appelé par la tâche quotidienne). */
export async function refreshInstagramToken(): Promise<"renouvelé" | "récent" | "simulation" | "échec"> {
  const token = await currentToken();
  if (!token) return "simulation";
  const stored = await kv.get<StoredToken>(TOKEN_KEY).catch(() => null);
  if (stored && Date.now() - new Date(stored.refreshedAt).getTime() < 7 * 86_400_000) return "récent";
  try {
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) return "échec";
    const now = Date.now();
    await kv.set<StoredToken>(TOKEN_KEY, {
      sealed: seal("instagram", json.access_token),
      refreshedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + (json.expires_in ?? 60 * 86_400) * 1000).toISOString(),
    });
    return "renouvelé";
  } catch {
    return "échec";
  }
}

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
  const token = await currentToken();
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

