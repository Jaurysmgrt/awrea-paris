import { Breadcrumbs } from "./Breadcrumbs";
import { Section } from "./Section";
import { SplitTitle } from "./SplitTitle";

/**
 * En-tête de page commun : fil d'Ariane, surtitre, H1 unique écrit au chargement, chapeau.
 * Langage des maquettes (« Contact », « Mentions légales », « Collection Hypnotic Lace ») : un
 * très grand titre en Fraunces italique, centré par défaut ; le chapeau garde son alignement à gauche
 * et sa mesure, sa colonne est centrée sous le titre.
 * « giant » : pages éditoriales, où le titre devient une affiche (encore plus grand).
 * « align="left" » : titre au fer à gauche, quand une photo ou un formulaire l'accompagne.
 */
export function PageHeader({
  title,
  lead,
  eyebrow,
  crumbs,
  theme = "ivory",
  giant = false,
  align = "center",
  lang,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  eyebrow?: string;
  crumbs: { name: string; path: string }[];
  theme?: "ink" | "ivory" | "paper" | "pearl";
  giant?: boolean;
  align?: "center" | "left";
  /** langue du titre et du chapeau quand elle diffère de celle de la page (texte resté en français sous /en) */
  lang?: string;
  children?: React.ReactNode;
}) {
  return (
    <Section theme={theme} as="header" className="page-header">
      <div className={`container page-head page-head--${align}`}>
        <Breadcrumbs items={crumbs} />
        {eyebrow ? (
          <p className="eyebrow" lang={lang}>
            {eyebrow}
          </p>
        ) : null}
        <SplitTitle text={title} className={`page-head__title ${giant ? "t-giant" : "t-display"}`} lang={lang} />
        {lead ? (
          <p className="t-lead page-head__lead" lang={lang}>
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </Section>
  );
}
