import { brandAssets } from "@/content/brand/assets";

type Props = {
  /** « full » : logo entier (« AWREA » et « PARIS » dessous) ; « monogram » : « AW » et « PARIS » dessous */
  variant?: "full" | "monogram";
  className?: string;
  /** nom lu par les lecteurs d'écran */
  title?: string;
  /** dans un lien déjà nommé (« Awrea Paris, page d’accueil ») : le dessin est masqué aux lecteurs d'écran */
  decorative?: boolean;
};

/**
 * Logo officiel d'Awrea Paris (ressources-awrea/LOGO, fichiers déclarés dans content/brand/assets.ts).
 * Le fichier sert de masque CSS : le dessin prend la couleur du texte qui l'entoure (noir sur fond
 * clair, blanc cassé en mode Nuit et sur les sections noires), sans aucune police chargée (la police
 * du logo, sous licence personnelle, ne l'est jamais). Les proportions viennent du fichier
 * (`--logo-ratio`) : la classe qui l'accompagne fixe soit la hauteur, soit la largeur, l'autre suit.
 */
export function Logo({ variant = "full", className, title = "Awrea Paris", decorative = false }: Props) {
  const asset = variant === "full" ? brandAssets.logo : brandAssets.monogram;
  const a11y = decorative ? ({ "aria-hidden": true } as const) : ({ role: "img", "aria-label": title } as const);
  if (!asset.src) {
    // fichier absent : le nom de la Maison en toutes lettres, sans imiter le dessin du logo
    return (
      <span aria-hidden={decorative || undefined} className={`logo-mask--nom ${className ?? ""}`}>
        {title}
      </span>
    );
  }
  return (
    <span
      {...a11y}
      className={`logo-mask logo-mask--${variant} ${className ?? ""}`}
      style={{ "--logo-src": `url(${asset.src})`, "--logo-ratio": `${asset.width} / ${asset.height}` } as React.CSSProperties}
    />
  );
}
