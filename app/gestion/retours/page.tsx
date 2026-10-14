/**
 * Retours et échanges : réception du colis, remboursement (avoir émis), échange de taille, refus,
 * dépôt d'une étiquette prépayée. Le remboursement est votre geste : il demande une confirmation.
 */
import Link from "@/components/ui/Link";
import { listReturns, reasonLabel, statusLabel } from "@/lib/returns";
import { formatDate, formatPrice } from "@/lib/format";
import { ActionButton } from "@/components/admin/ActionButton";
import { LabelUpload } from "@/components/admin/LabelUpload";
import { atelierHref, atelierApi } from "@/lib/admin/path";

export const dynamic = "force-dynamic";

export default async function RetoursPage() {
  const all = await listReturns();
  const open = all.filter((r) => r.status === "demande" || r.status === "recu");
  const done = all.filter((r) => !open.includes(r));
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Retours</h1>
        <p className="t-lead">Les clientes demandent leur retour ou leur échange de taille en ligne et reçoivent leur étiquette. Vous réceptionnez le colis, puis remboursez ou envoyez la nouvelle taille.</p>
      </header>
      <section className="panel" aria-labelledby="open-title">
        <h2 id="open-title" className="t-h3">
          À traiter ({open.length})
        </h2>
        {open.length ? (
          <ul className="stack-l">
            {open.map((r) => {
              const refund = r.items.filter((i) => i.wish === "remboursement");
              const total = refund.reduce((s, i) => s + i.unitPrice, 0);
              return (
                <li key={r.id} className="stack-s">
                  <p className="t-h4">
                    {r.id} ·{" "}
                    <Link href={atelierHref(`/commandes/${encodeURIComponent(r.orderNumber)}`)} className="text-link">
                      {r.orderNumber}
                    </Link>{" "}
                    · {r.name}
                  </p>
                  <p className="t-note">
                    {statusLabel[r.status]} · demandé le {formatDate(r.createdAt)} · {r.label ? `${r.label.carrier}, suivi ${r.label.tracking}` : "étiquette à déposer"}
                  </p>
                  <ul className="stack-s">
                    {r.items.map((i, k) => (
                      <li key={k} className="t-body">
                        {i.title}, taille {i.size} — {reasonLabel[i.reason]} — {i.wish === "echange" ? `échange en ${i.exchangeSize}` : `remboursement ${formatPrice(i.unitPrice)}`}
                      </li>
                    ))}
                  </ul>
                  {r.comment ? <p className="t-note">« {r.comment} »</p> : null}
                  {r.labelPending ? <LabelUpload id={r.id} /> : null}
                  <div className="admin-actions">
                    {r.status === "demande" ? <ActionButton endpoint={atelierApi(`/retours/${r.id}`)} body={{ action: "recu" }} label="Colis reçu" variant="solid" /> : null}
                    {refund.length ? (
                      <ActionButton endpoint={atelierApi(`/retours/${r.id}`)} body={{ action: "rembourser" }} label={`Rembourser ${formatPrice(total)}`} confirm={`Rembourser ${formatPrice(total)} à ${r.name} et émettre l’avoir ?`} />
                    ) : null}
                    {r.items.some((i) => i.wish === "echange") ? <ActionButton endpoint={atelierApi(`/retours/${r.id}`)} body={{ action: "echanger" }} label="Expédier la nouvelle taille" /> : null}
                    <ActionButton endpoint={atelierApi(`/retours/${r.id}`)} body={{ action: "refuser", reason: "la pièce nous est revenue portée ou sans son certificat." }} label="Refuser" variant="quiet" confirm="Refuser ce retour ? La cliente sera prévenue par e-mail." />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="t-note">Aucun retour en attente.</p>
        )}
      </section>
      {done.length ? (
        <section className="panel" aria-labelledby="done-title">
          <h2 id="done-title" className="t-h3">
            Traités
          </h2>
          <ul className="stack-s">
            {done.map((r) => (
              <li key={r.id} className="t-body">
                {r.id} · {r.orderNumber} · {r.name} — {statusLabel[r.status]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
