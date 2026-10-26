import { notFound } from "next/navigation";
import { documentInfo } from "@/lib/edition/documents";
import { draftOf, historyOf, isDocId, publishedDoc } from "@/lib/edition/store";
import { getProducts } from "@/lib/commerce";
import { atelierHref } from "@/lib/admin/path";
import { EmailEditor } from "@/components/admin/EmailEditor";
import Link from "@/components/ui/Link";
import type { EmailDoc } from "@/lib/email/blocks";

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDocId(id) || (await documentInfo(id))?.kind !== "email") notFound();
  const [draft, published, history, products] = await Promise.all([draftOf(id, "fr"), publishedDoc(id, "fr"), historyOf(id, "fr"), getProducts().catch(() => [])]);
  const doc = (draft?.content ?? published) as EmailDoc | null;
  if (!doc) notFound();
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="t-label">
          <Link href={atelierHref("/e-mails")} className="btn btn--link">E-mails</Link>
        </p>
        <h1 className="t-h1">{doc.nom}</h1>
        <p className="t-lead">{doc.quand}</p>
      </header>
      <EmailEditor id={id} initial={doc} draftAt={draft?.updatedAt ?? null} publishedAt={history[0]?.at || null} products={products.map((p) => ({ handle: p.handle, title: p.title }))} />
    </div>
  );
}
