import type { MetadataRoute } from "next";
import { identity } from "@/content/brand/identity";
import { palette } from "@/styles/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: identity.name,
    short_name: identity.shortName,
    description: identity.shortDescription,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: palette.ivory,
    theme_color: palette.ink,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
