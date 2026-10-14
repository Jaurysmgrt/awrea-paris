import { listInbox, type InboxMessage } from "@/lib/inbox";
import { MessageEditor } from "@/components/admin/MessageEditor";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { atelierApi } from "@/lib/admin/path";

const CHANNEL: Record<InboxMessage["channel"], string> = { contact: "Formulaire", "rendez-vous": "Rendez-vous", assistant: "Assistante", email: "E-mail", instagram: "Instagram" };
const STATUS: Record<InboxMessage["status"], string> = { new: "Nouveau", drafted: "Brouillon prêt", escalated: "Pour vous", answered: "Répondu" };

export default async function MessagesPage() {
  const inbox = await listInbox(500);
  const mine = inbox.filter((m) => m.status === "escalated" || m.status === "drafted");
  const fresh = inbox.filter((m) => m.status === "new");
  const answered = inbox.filter((m) => m.status === "answered").slice(0, 20);
  const Item = ({ m, editable }: { m: InboxMessage; editable: boolean }) => (
    <article className="message">
      <header className="proposal__head">
        <span className={`status status--${m.status === "answered" ? "done" : m.status === "new" ? "info" : "proposed"}`}>{STATUS[m.status]}</span>
        <span className="t-label t-soft">
          {CHANNEL[m.channel]} · <When iso={m.date} />
        </span>
      </header>
      <h3 className="t-h4">
        {m.name || m.email} — {m.subject}
      </h3>
      <p className="t-label t-soft">{m.email}{m.orderNumber ? ` · ${m.orderNumber}` : ""}{m.appointment ? ` · ${m.appointment.type}${m.appointment.preferredDate ? `, ${m.appointment.preferredDate}` : ""}${m.appointment.slot ? ` (${m.appointment.slot})` : ""}` : ""}</p>
      <blockquote className="message__body t-body">{m.message}</blockquote>
      {m.draft?.agentNote ? <p className="notice t-note">Note de l’agent : {m.draft.agentNote}</p> : null}
      {editable ? <MessageEditor id={m.id} subject={m.subject.startsWith("Re") ? m.subject : `Re : ${m.subject}`} draft={m.draft?.body ?? ""} /> : null}
      {m.answer ? (
        <details className="disclosure">
          <summary>Réponse envoyée ({m.answer.by === "agent" ? "par l’agent" : "par vous"})</summary>
          <div className="disclosure__body t-body message__answer">{m.answer.body}</div>
        </details>
      ) : null}
    </article>
  );
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Messages</h1>
        <p className="t-lead">L’agent Service client répond seul aux questions courantes. Les cas délicats vous attendent ici, avec un brouillon prêt.</p>
        <ActionButton endpoint={atelierApi("/agents/service-client")} label="Traiter les nouveaux messages" busyLabel="L’agent lit les messages…" />
      </header>
      <section className="panel" aria-labelledby="mine-title">
        <h2 id="mine-title" className="t-h3">Pour vous ({mine.length})</h2>
        {mine.length ? <div className="stack-l">{mine.map((m) => <Item key={m.id} m={m} editable />)}</div> : <p className="t-note">Aucun message n’attend votre réponse.</p>}
      </section>
      {fresh.length ? (
        <section className="panel" aria-labelledby="new-title">
          <h2 id="new-title" className="t-h3">Nouveaux, pas encore lus par l’agent ({fresh.length})</h2>
          <div className="stack-l">{fresh.map((m) => <Item key={m.id} m={m} editable={false} />)}</div>
        </section>
      ) : null}
      <section className="panel" aria-labelledby="done-title">
        <h2 id="done-title" className="t-h3">Répondus récemment</h2>
        {answered.length ? <div className="stack-l">{answered.map((m) => <Item key={m.id} m={m} editable={false} />)}</div> : <p className="t-note">Aucun pour le moment.</p>}
      </section>
    </div>
  );
}
