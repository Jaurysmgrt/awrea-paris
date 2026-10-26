"use client";
import type { AgentAction } from "@/lib/agents/log";
import Link from "@/components/ui/Link";
import { AgentName, Status, When } from "./Status";
import { useAtelier } from "./AtelierContext";

/** Lien d'une action : « atelier:/messages » (et l'ancien « /gestion/messages ») mène à l'Atelier. */
function targetHref(href: string, atelier: (p: string) => string): string {
  if (href.startsWith("atelier:")) return atelier(href.slice(8) || "/");
  if (href === "/gestion" || href.startsWith("/gestion/") || href.startsWith("/gestion#")) return atelier(href.slice(8) || "/");
  return href;
}

export function LogList({ items, names }: { items: AgentAction[]; names?: Record<string, string> }) {
  const atelier = useAtelier();
  if (!items.length) return <p className="t-note">Aucune action pour le moment.</p>;
  return (
    <ol className="log">
      {items.map((a) => (
        <li key={a.id} className="log__item">
          <Status value={a.status} />
          <div className="log__body">
            <p className="log__summary">
              {a.target?.href ? (
                <Link href={targetHref(a.target.href, atelier.href)} className="text-link">
                  {a.summary}
                </Link>
              ) : (
                a.summary
              )}
            </p>
            {a.detail ? <p className="t-note log__detail">{a.detail}</p> : null}
          </div>
          <span className="t-label t-soft log__meta">
            <AgentName id={a.agent} names={names} /> · <When iso={a.date} />
          </span>
        </li>
      ))}
    </ol>
  );
}
