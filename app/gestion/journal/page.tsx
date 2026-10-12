import { getLog } from "@/lib/agents/log";
import { LogFilter } from "@/components/admin/LogFilter";

export default async function JournalActionsPage() {
  const items = await getLog(1000);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Journal des actions</h1>
        <p className="t-lead">Toutes les actions des agents, autonomes ou proposées, et vos décisions. Rien n’est fait sans laisser de trace.</p>
      </header>
      <LogFilter items={items} />
    </div>
  );
}
