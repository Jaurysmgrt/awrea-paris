import { getLog } from "@/lib/agents/log";
import { AGENTS } from "@/lib/agents/registry";
import { ROLES } from "@/lib/agents/roles";
import { LogFilter } from "@/components/admin/LogFilter";
import { withRegistryNames } from "@/components/admin/agent-names";

export default async function JournalActionsPage() {
  const items = await getLog(1000);
  const names = withRegistryNames([...AGENTS, ...ROLES]);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Journal des actions</h1>
        <p className="t-lead">Toutes les actions des agents, autonomes ou proposées, et vos décisions. Rien n’est fait sans laisser de trace.</p>
      </header>
      <LogFilter items={items} names={names} />
    </div>
  );
}
