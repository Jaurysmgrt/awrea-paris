import { getProposals } from "@/lib/agents/perform";
import { ProposalCard } from "@/components/admin/ProposalCard";

export default async function ValidationsPage() {
  const all = await getProposals();
  const pending = all.filter((p) => p.status === "pending");
  const done = all.filter((p) => p.status !== "pending").slice(0, 30);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">À valider</h1>
        <p className="t-lead">Ce qui touche à l’argent ou ne se défait pas attend votre accord ici.</p>
      </header>
      <section className="panel" aria-labelledby="pending-title">
        <h2 id="pending-title" className="t-h3">
          En attente ({pending.length})
        </h2>
        {pending.length ? <div className="stack-m">{pending.map((p) => <ProposalCard key={p.id} p={p} />)}</div> : <p className="t-note">Aucune proposition en attente.</p>}
      </section>
      <section className="panel" aria-labelledby="history-title">
        <h2 id="history-title" className="t-h3">
          Historique
        </h2>
        {done.length ? <div className="stack-m">{done.map((p) => <ProposalCard key={p.id} p={p} />)}</div> : <p className="t-note">Aucune décision pour le moment.</p>}
      </section>
    </div>
  );
}
