import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DropView } from "@/components/drops/DropView";
import { paragraphsOf, type AvantPremieresTexts } from "@/components/drops/regles";
import { getDrop } from "@/lib/drops";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ acces?: string }> };

/** Une phrase de présentation pour les moteurs et les aperçus de lien (160 caractères au plus). */
const description = (teaser: string) => {
  const first = paragraphsOf(teaser)[0] ?? "";
  return first.length > 160 ? `${first.slice(0, 159).replace(/\s+\S*$/, "")}…` : first;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const drop = await getDrop((await params).slug);
  if (!drop) return {};
  const t = await getDoc<AvantPremieresTexts>("avant-premieres", "fr", { plain: true });
  // une présentation privée n'est jamais indexée, et son texte ne paraît pas dans les aperçus
  return pageMetadata({
    title: `${drop.title} | Awrea Paris`,
    description: drop.privateSale ? t.seo.privee : description(drop.teaser) || t.seo.description,
    path: `/bientot/${drop.slug}`,
    noindex: drop.privateSale,
  });
}
export const dynamic = "force-dynamic";

/** Page d'une avant-première : adresse des liens personnels et des présentations privées. */
export default async function AvantPremierePage({ params, searchParams }: Params) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const drop = await getDrop(slug);
  if (!drop) notFound();
  return <DropView drop={drop} notice={sp.acces === "invalide" ? "lienInvalide" : null} />;
}
