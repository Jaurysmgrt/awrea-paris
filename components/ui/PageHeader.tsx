import { Breadcrumbs } from "./Breadcrumbs";
import { Section } from "./Section";

/** En-tête de page commun : fil d'Ariane, surtitre, H1 unique, chapeau. */
export function PageHeader({
  title,
  lead,
  eyebrow,
  crumbs,
  theme = "ivory",
  script = false,
  children,
}: {
  title: string;
  lead?: string;
  eyebrow?: string;
  crumbs: { name: string; path: string }[];
  theme?: "ink" | "ivory" | "paper" | "pearl";
  script?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Section theme={theme} as="header" className="page-header">
      <div className="container page-head">
        <Breadcrumbs items={crumbs} />
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className={script ? "t-script t-script--xl" : "t-display"}>{title}</h1>
        {lead ? <p className="t-lead page-head__lead">{lead}</p> : null}
        {children}
      </div>
    </Section>
  );
}
