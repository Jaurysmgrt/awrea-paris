import type { AgentAction } from "@/lib/agents/log";
import Link from "next/link";
import { AgentName, Status, When } from "./Status";

export function LogList({ items }: { items: AgentAction[] }) {
  if (!items.length) return <p className="t-note">Aucune action pour le moment.</p>;
  return (
    <ol className="log">
      {items.map((a) => (
        <li key={a.id} className="log__item">
          <Status value={a.status} />
          <div className="log__body">
            <p className="log__summary">
              {a.target?.href ? (
                <Link href={a.target.href} className="text-link">
                  {a.summary}
                </Link>
              ) : (
                a.summary
              )}
            </p>
            {a.detail ? <p className="t-note log__detail">{a.detail}</p> : null}
          </div>
          <span className="t-label t-soft log__meta">
            <AgentName id={a.agent} /> · <When iso={a.date} />
          </span>
        </li>
      ))}
    </ol>
  );
}
