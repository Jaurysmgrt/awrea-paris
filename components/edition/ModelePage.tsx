/**
 * Page créée dans l'éditeur à partir d'un modèle (événement, article du Journal, collection) :
 * un en-tête (titre, chapeau, date et lieu ou rubrique) puis ses sections faites de blocs.
 */
import { PageHeader } from "@/components/ui/PageHeader";
import { Blocks } from "@/components/edition/Blocks";

export interface ModeleContent {
  titre: string;
  chapeau?: string;
  date?: string;
  lieu?: string;
  rubrique?: string;
  sections: unknown[];
  seo: { title: string; description: string };
}

export function ModelePage({ doc, content, editing, crumbs }: { doc: string; content: ModeleContent; editing: boolean; crumbs: { name: string; path: string }[] }) {
  const details = [content.date, content.lieu].filter((x): x is string => Boolean(x && x.trim()));
  return (
    <>
      <PageHeader title={content.titre} lead={content.chapeau} eyebrow={content.rubrique} crumbs={crumbs}>
        {details.map((d, i) => (
          <p key={i} className="t-label">
            {d}
          </p>
        ))}
      </PageHeader>
      <Blocks items={content.sections} doc={doc} path="sections" editing={editing} />
    </>
  );
}
