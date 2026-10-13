import { POLICY } from "@/lib/agents/policy";
import { AGENTS } from "@/lib/agents/registry";
import { commerceMode } from "@/lib/commerce";
import { aiEnabled, MODEL } from "@/lib/ai/client";
import { adminEnabled } from "@/lib/shopify/admin";
import { storeMode } from "@/lib/store";
import { usingDemoPassword } from "@/lib/auth/admin";
import { recoveryCodesLeft } from "@/lib/auth/totp";
import { cspMode } from "@/lib/security/headers";
import { securityDigest, securityEvents, type SecurityEventType } from "@/lib/security/audit";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";

const EVENT_LABELS: Record<SecurityEventType, string> = {
  admin_password_ok: "Mot de passe accepté",
  admin_password_fail: "Mot de passe refusé",
  admin_code_fail: "Code de double authentification refusé",
  admin_login_ok: "Connexion réussie",
  admin_login_blocked: "Connexion bloquée (trop d’essais)",
  admin_login_unusual: "Connexion inhabituelle — alerte envoyée",
  admin_enrolled: "Double authentification configurée",
};

export default async function ReglagesPage() {
  const [events, digest, codesLeft] = await Promise.all([securityEvents(30), securityDigest(24), recoveryCodesLeft()]);
  const security = [
    { name: "Double authentification de l’Atelier", ok: true, hint: `Obligatoire · ${codesLeft} code(s) de secours restant(s)` },
    { name: "Protection anti-robots des formulaires (Turnstile)", ok: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY), hint: "NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY" },
    { name: `Politique de sécurité du contenu (${cspMode === "strict" ? "stricte, nonce par page" : "statique"})`, ok: process.env.NODE_ENV === "production", hint: "CSP_MODE" },
    { name: "Base clientes avec sécurité par ligne (Supabase)", ok: isSupabaseConfigured, hint: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Clé de signature des sessions", ok: Boolean(process.env.SESSION_SECRET), hint: "SESSION_SECRET (64 caractères aléatoires)" },
    { name: "Alertes de sécurité par e-mail", ok: Boolean(process.env.RESEND_API_KEY), hint: "RESEND_API_KEY, SECURITY_ALERT_EMAIL" },
  ];
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
      <section className="panel" aria-labelledby="sec-title">
        <h2 id="sec-title" className="t-h3">Sécurité</h2>
        <p className="t-body">
          Dernières 24 heures : {digest.adminLogins} connexion(s), {digest.adminFailures} échec(s), {digest.adminBlocked} blocage(s), {digest.unusualLogins} connexion(s)
          inhabituelle(s), {digest.csrfBlocked} requête(s) d’origine étrangère et {digest.rateLimited} excès de débit refusés.
        </p>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Protection</th><th scope="col">État</th><th scope="col">Réglage</th></tr></thead>
          <tbody>
            {security.map((s) => (
              <tr key={s.name}><th scope="row">{s.name}</th><td><span className={`status status--${s.ok ? "done" : "info"}`}>{s.ok ? "Active" : "À configurer"}</span></td><td className="t-note">{s.hint}</td></tr>
            ))}
          </tbody>
        </table></div>
        <h3 className="t-label">Journal des connexions</h3>
        {events.length ? (
          <div className="table-scroll"><table className="table">
            <thead><tr><th scope="col">Date</th><th scope="col">Évènement</th><th scope="col">Appareil</th><th scope="col">Réseau</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={`${e.at}-${i}`}><td><When iso={e.at} /></td><th scope="row">{EVENT_LABELS[e.type] ?? e.type}{e.detail ? ` (${e.detail})` : ""}</th><td>{e.device}</td><td className="t-note">{e.network}</td></tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="t-note">Aucune connexion enregistrée pour l’instant.</p>
        )}
        <div className="proposal__actions">
          <ActionButton endpoint="/api/gestion/securite/sessions" label="Déconnecter tous les appareils" confirm="Fermer toutes les sessions de l’Atelier, y compris celle-ci ?" />
          <ActionButton endpoint="/api/gestion/securite/totp" label="Réinitialiser la double authentification" variant="quiet" confirm="Réinitialiser la double authentification ? Vous devrez scanner un nouveau QR code à la prochaine connexion." />
        </div>
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
