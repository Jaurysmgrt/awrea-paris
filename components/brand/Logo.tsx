import { brandAssets } from "@/content/brand/assets";

type Props = { variant?: "full" | "monogram"; className?: string; title?: string };

/**
 * Logo Awrea Paris. Affiche le fichier officiel (public/brand) s'il est renseigné dans
 * content/brand/assets.ts, sinon un logo typographique provisoire : « AW » en Bodoni très fin
 * à fort contraste, « PARIS » en capitales très espacées.
 */
export function Logo({ variant = "full", className, title = "Awrea Paris" }: Props) {
  const asset = variant === "full" ? brandAssets.logo : brandAssets.monogram;
  if (asset.src) {
    return (
      <span
        role="img"
        aria-label={title}
        className={`logo-mask ${className ?? ""}`}
        style={{ maskImage: `url(${asset.src})`, WebkitMaskImage: `url(${asset.src})`, aspectRatio: `${asset.width} / ${asset.height}` }}
      />
    );
  }
  if (variant === "monogram") {
    return (
      <svg viewBox="0 0 100 64" className={className} role="img" aria-label={title}>
        <text x="50" y="52" textAnchor="middle" className="logo-aw">AW</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 92" className={className} role="img" aria-label={title}>
      <text x="60" y="56" textAnchor="middle" className="logo-aw">AW</text>
      <text x="61.6" y="84" textAnchor="middle" className="logo-paris">PARIS</text>
    </svg>
  );
}
