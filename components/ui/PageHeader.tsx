import { Breadcrumbs } from "./Breadcrumbs";
import { Section } from "./Section";
import { SplitTitle } from "./SplitTitle";

/**
 * En-tête de page commun : fil d'Ariane, surtitre, H1 unique écrit au chargement, chapeau.
 * « giant » : pages éditoriales, où le titre devient une affiche (Bodoni géant face aux
 * petites capitales espacées du surtitre).
 */
export function PageHeader({
  title,
  lead,
  eyebrow,
  crumbs,
  theme = "ivory",
  script = false,
  giant = false,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  eyebrow?: string;
  crumbs: { name: string; path: string }[];
  theme?: "ink" | "ivory" | "paper" | "pearl";
  script?: boolean;
  giant?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Section theme={theme} as="header" className="page-header">
      <div className="container page-head">
        <Breadcrumbs items={crumbs} />
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <SplitTitle text={title} script={script} className={script ? "t-script t-script--xl" : giant ? "t-giant" : "t-display"} />
        {lead ? <p className="t-lead page-head__lead">{lead}</p> : null}
        {children}
      </div>
    </Section>
  );
}
