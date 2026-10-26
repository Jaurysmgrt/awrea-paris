import type { MetadataRoute } from "next";
import { identity } from "@/content/brand/identity";
import { siteDefaults } from "@/lib/seo/metadata";
import { palette } from "@/styles/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: identity.name,
    short_name: identity.shortName,
    description: siteDefaults.description,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: palette.ivory,
    theme_color: palette.ink,
    // icônes officielles : le monogramme « AW » de la Maison (ressources-awrea/LOGO, préparées par
    // npm run ressources dans app/ et public/icons/) ; 192 et 512 px pour l'installation, avec une
    // marge de 16 % qui les rend aussi utilisables en icône masquable
    icons: [
      { src: "/icon.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
