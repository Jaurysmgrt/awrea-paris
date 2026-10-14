import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DropView } from "@/components/drops/DropView";
import { getDrop } from "@/lib/drops";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ acces?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const drop = await getDrop((await params).slug);
  if (!drop) return {};
  // les ventes privées ne sont jamais indexées
  return { title: { absolute: `${drop.title} | Awrea Paris` }, description: drop.teaser, robots: drop.privateSale ? { index: false, follow: false } : undefined };
}
export const dynamic = "force-dynamic";

export default async function DropPage({ params, searchParams }: Params) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const drop = await getDrop(slug);
  if (!drop) notFound();
  const notice = sp.acces === "invalide" ? "Ce lien d’accès n’est plus valable. Inscrivez-vous de nouveau : un nouveau lien vous sera envoyé." : null;
  return <DropView drop={drop} notice={notice} />;
}
