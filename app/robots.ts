import type { MetadataRoute } from "next";
import { absolute, siteUrl } from "@/lib/seo/metadata";
import { ATELIER_PREFIX } from "@/lib/admin/path";

// l'adresse secrète de l'Atelier commence par « /prive- » : seul ce préfixe figure ici, jamais la suite
const PRIVATE = ["/gestion", ATELIER_PREFIX, "/api/", "/commande", "/compte", "/liste-envies", "/boutique?", "/lab", "/suivi/"];

/** Moteurs de recherche ET moteurs de réponse IA sont explicitement bienvenus (objectif : être citée). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: PRIVATE,
      },
    ],
    sitemap: absolute("/sitemap.xml"),
    host: siteUrl,
  };
}
