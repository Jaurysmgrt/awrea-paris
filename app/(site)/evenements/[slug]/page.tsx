import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findDoc, isEditing } from "@/lib/edition/read";
import { slugOf } from "@/lib/edition/documents";
import { pageMetadata } from "@/lib/seo/metadata";
import { ModelePage, type ModeleContent } from "@/components/edition/ModelePage";

/**
 * Page d'événement créée dans l'éditeur (pop-up, présentation, essayage collectif). Tant qu'elle
 * n'est pas publiée, elle n'existe que pour la créatrice, en mode Édition.
 */
const docOf = (slug: string) => `evenement-${slugOf(slug)}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await findDoc<ModeleContent>(docOf(slug), { plain: true });
  if (!c) return {};
  return pageMetadata({ title: c.seo.title, description: c.seo.description, path: `/evenements/${slugOf(slug)}` });
}

export default async function EvenementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docOf(slug);
  const [content, editing] = await Promise.all([findDoc<ModeleContent>(doc), isEditing()]);
  if (!content) notFound();
  return <ModelePage doc={doc} content={content} editing={editing} crumbs={[{ name: content.titre, path: `/evenements/${slugOf(slug)}` }]} />;
}
