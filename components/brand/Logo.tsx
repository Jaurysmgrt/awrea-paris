import { brandAssets } from "@/content/brand/assets";
import { logoPaths, monogramPaths } from "@/content/brand/logo-paths";

type Props = {
  variant?: "full" | "monogram";
  className?: string;
  title?: string;
  /** dans un lien déjà nommé (« Awrea Paris — accueil ») : le dessin est masqué aux lecteurs d'écran */
  decorative?: boolean;
};

/**
 * Logo Awrea Paris. Affiche le fichier officiel (public/brand) s'il est renseigné dans
 * content/brand/assets.ts, sinon le logo provisoire vectorisé (scripts/build-logo.py) : « AW » en
 * Instrument Serif, fin et contrasté, « PARIS » en capitales très espacées. Il prend la couleur du
 * texte qui l'entoure.
 */
export function Logo({ variant = "full", className, title = "Awrea Paris", decorative = false }: Props) {
  const asset = variant === "full" ? brandAssets.logo : brandAssets.monogram;
  const a11y = decorative ? ({ "aria-hidden": true } as const) : ({ role: "img", "aria-label": title } as const);
  if (asset.src) {
    return (
      <span
        {...a11y}
        className={`logo-mask ${className ?? ""}`}
        style={{ maskImage: `url(${asset.src})`, WebkitMaskImage: `url(${asset.src})`, aspectRatio: `${asset.width} / ${asset.height}` }}
      />
    );
  }
  if (variant === "monogram") {
    return (
      <svg viewBox={monogramPaths.viewBox} className={className} fill="currentColor" {...a11y}>
        <path d={monogramPaths.aw} />
      </svg>
    );
  }
  return (
    <svg viewBox={logoPaths.viewBox} className={className} fill="currentColor" {...a11y}>
      <path d={logoPaths.aw} />
      <path d={logoPaths.paris} />
    </svg>
  );
}
