import { POLICY } from "@/lib/agents/policy";
import { AGENTS } from "@/lib/agents/registry";
import { commerceMode } from "@/lib/commerce";
import { aiEnabled, MODEL } from "@/lib/ai/client";
import { adminEnabled } from "@/lib/shopify/admin";
import { storeMode } from "@/lib/store";
import { usingDemoPassword } from "@/lib/auth/admin";
import { ActionButton } from "@/components/admin/ActionButton";

export default function ReglagesPage() {
  const services = [
    { name: "Boutique Shopify (Storefront)", ok: commerceMode === "shopify", hint: "SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN" },
    { name: "Shopify Admin (agents)", ok: adminEnabled, hint: "SHOPIFY_ADMIN_ACCESS_TOKEN" },
    { name: `IA Claude (${MODEL})`, ok: aiEnabled, hint: "ANTHROPIC_API_KEY" },
    { name: "E-mails (Resend)", ok: Boolean(process.env.RESEND_API_KEY), hint: "RESEND_API_KEY, EMAIL_FROM" },
    { name: "Base de données (Upstash Redis)", ok: storeMode === "upstash", hint: "KV_REST_API_URL, KV_REST_API_TOKEN" },
    { name: "Flux Instagram", ok: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN), hint: "INSTAGRAM_ACCESS_TOKEN" },
    { name: "Tâches planifiées sécurisées", ok: Boolean(process.env.CRON_SECRET), hint: "CRON_SECRET" },
    { name: "Mot de passe du tableau de bord", ok: !usingDemoPassword(), hint: "ATELIER_PASSWORD" },
  ];
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Réglages</h1>
        <p className="t-lead">Connexions, règles d’autonomie des agents et calendrier.</p>
      </header>
      <section className="panel" aria-labelledby="svc-title">
        <h2 id="svc-title" className="t-h3">Connexions</h2>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Service</th><th scope="col">État</th><th scope="col">Variables</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.name}><th scope="row">{s.name}</th><td><span className={`status status--${s.ok ? "done" : "info"}`}>{s.ok ? "Connecté" : "Démonstration"}</span></td><td className="t-note">{s.hint}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <section className="panel" aria-labelledby="policy-title">
        <h2 id="policy-title" className="t-h3">Règles d’autonomie</h2>
        <p className="t-body">Les agents agissent seuls sur le quotidien. Seules les actions qui touchent à l’argent ou qui sont irréversibles vous sont soumises.</p>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Action</th><th scope="col">Décision</th></tr></thead>
          <tbody>
            {Object.entries(POLICY).map(([k, p]) => (
              <tr key={k}><th scope="row">{p.label}</th><td>{p.approval ? <span className="status status--proposed">Votre validation — {p.why}</span> : <span className="status status--done">Autonome</span>}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <section className="panel" aria-labelledby="cal-title">
        <h2 id="cal-title" className="t-h3">Calendrier des agents</h2>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Agent</th><th scope="col">Cadence</th></tr></thead>
          <tbody>{AGENTS.map((a) => <tr key={a.id}><th scope="row">{a.name}</th><td>{a.schedule}</td></tr>)}</tbody>
        </table></div>
      </section>
      {commerceMode === "demo" ? (
        <section className="panel" aria-labelledby="reset-title">
          <h2 id="reset-title" className="t-h3">Données de démonstration</h2>
          <p className="t-body">Efface les commandes de test, messages, propositions, journaux et contenus générés, et rétablit les stocks d’origine.</p>
          <ActionButton endpoint="/api/gestion/reset" label="Réinitialiser la démonstration" confirm="Effacer toutes les données de démonstration ?" />
        </section>
      ) : null}
    </div>
  );
}
