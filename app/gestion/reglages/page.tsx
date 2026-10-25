import Link from "@/components/ui/Link";
import { POLICY } from "@/lib/agents/policy";
import { AGENTS } from "@/lib/agents/registry";
import { commerceMode, getAllProducts } from "@/lib/commerce";
import { DEFAULT_LEAD_TIME } from "@/lib/commerce/availability";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import type { Category } from "@/lib/commerce/types";
import { getDoc } from "@/lib/edition/read";
import { MODEL } from "@/lib/ai/client";
import { adminEnabled } from "@/lib/shopify/admin";
import { services as providers } from "@/lib/config/providers";
import { turnstileEnabled } from "@/lib/security/turnstile";
import { currentAdmin, usingDemoPassword } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey, hasTotp, listAccounts, recoveryLeft } from "@/lib/auth/accounts";
import { loginGuard } from "@/lib/security/rate-limit";
import { atelierApi, atelierHref, atelierPathIsSecret } from "@/lib/admin/path";
import { cspMode } from "@/lib/security/headers";
import { securityDigest, securityEvents, type SecurityEventType } from "@/lib/security/audit";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { agentName, withRegistryNames } from "@/components/admin/agent-names";

const EVENT_LABELS: Record<SecurityEventType, string> = {
  admin_password_ok: "Mot de passe accepté",
  admin_password_fail: "Mot de passe refusé",
  admin_code_fail: "Code de double authentification refusé",
  admin_login_ok: "Connexion réussie",
  admin_login_blocked: "Connexion bloquée après trop d’essais",
  admin_login_unusual: "Connexion inhabituelle, alerte envoyée",
  admin_enrolled: "Double authentification configurée",
  admin_password_set: "Mot de passe personnel choisi",
  admin_account_locked: "Compte bloqué une demi-heure, alerte envoyée",
  admin_revoked: "Sessions fermées par le lien « ce n’était pas moi »",
};

/**
 * Actions d'agents retirées du modèle de la Maison (pièces créées sur demande, sans stock ni liste
 * d'attente) : encore déclarées dans lib/agents/policy.ts le temps de la transition, jamais affichées.
 */
const RETIRED_ACTIONS = new Set<string>(["update_stock", "notify_waitlist"]);

/** Ordre des catégories dans le tableau des délais par défaut. */
const CATEGORIES: Category[] = ["body", "top", "robe", "jupe", "accessoire"];

export default async function ReglagesPage() {
  const [events, digest, accounts, me, products, catalogue, boutique] = await Promise.all([
    securityEvents(30),
    securityDigest(24),
    listAccounts(),
    currentAdmin(),
    getAllProducts().catch(() => []),
    getDoc<CatalogueTexts>("catalogue", "fr", { plain: true }),
    getDoc<{ categories: Partial<Record<Category, string>> }>("boutique", "fr", { plain: true }),
  ]);
  const toConfirm = [
    { label: "Délais de fabrication provisoires", pieces: products.filter((p) => p.leadTimeProvisional).map((p) => p.title) },
    { label: "Prix provisoires", pieces: products.filter((p) => p.priceProvisional).map((p) => p.title) },
    { label: "Visuels provisoires", pieces: products.filter((p) => p.images.some((i) => i.provisoire)).map((p) => p.title) },
  ].filter((x) => x.pieces.length);
  const agentNames = withRegistryNames(AGENTS);
  const locked = await Promise.all(accounts.map((a) => loginGuard.blocked("admin-compte", emailKey(a.email), ACCOUNT_GUARD)));
  const security = [
    { name: "Adresse secrète de l’Atelier", ok: atelierPathIsSecret(), hint: "ADMIN_PATH, de la forme /prive- suivie d’au moins douze lettres ou chiffres" },
    { name: "Double authentification de chaque compte", ok: accounts.every((a) => hasTotp(a)), hint: "Obligatoire. ATELIER_ACCOUNTS liste les adresses autorisées" },
    { name: "Protection anti-robots des formulaires (Turnstile)", ok: turnstileEnabled, hint: "NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY" },
    { name: `Politique de sécurité du contenu (${cspMode === "strict" ? "stricte, nonce par page" : "statique"})`, ok: process.env.NODE_ENV === "production", hint: "CSP_MODE" },
    { name: "Base clientes avec sécurité par ligne (Supabase)", ok: isSupabaseConfigured, hint: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Clé de signature des sessions", ok: Boolean(process.env.SESSION_SECRET), hint: "SESSION_SECRET (64 caractères aléatoires)" },
    { name: "Alertes de sécurité par e-mail", ok: providers.email.provider !== "mock", hint: "RESEND_API_KEY, SECURITY_ALERT_EMAIL" },
  ];
  // un interrupteur par service (lib/config/providers.ts, mode d'emploi : ACTIVATION.md)
  const services = [
    ...Object.values(providers).map((s) => ({
      name: s.label,
      ok: s.provider !== "mock",
      state: s.provider === "mock" ? `Simulation · ${s.providerLabel}` : s.id === "ai" ? `${s.providerLabel} (${MODEL})` : s.providerLabel,
      hint: s.missing.length
        ? `${s.env}=${s.requested} demandé : manque ${s.missing.join(", ")}`
        : `${s.env} · ${Object.values(s.keys).map((k) => k.join(", ")).join(" ou ")}`,
    })),
    { name: "Shopify Admin (agents)", ok: adminEnabled, state: adminEnabled ? "Shopify" : "Simulation", hint: "SHOPIFY_CLIENT_ID et SHOPIFY_CLIENT_SECRET (ou SHOPIFY_ADMIN_ACCESS_TOKEN)" },
    { name: "Tâches planifiées sécurisées", ok: Boolean(process.env.CRON_SECRET), state: process.env.CRON_SECRET ? "Active" : "À configurer", hint: "CRON_SECRET" },
    { name: "Mot de passe d’installation de l’Atelier", ok: !usingDemoPassword(), state: usingDemoPassword() ? "Démonstration" : "Personnel", hint: "ATELIER_PASSWORD, sert seulement à la première connexion d’un compte" },
  ];
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Réglages</h1>
        <p className="t-lead">Délais de fabrication, connexions, sécurité, règles d’autonomie des agents et calendrier.</p>
      </header>
      <section className="panel" aria-labelledby="delais-title">
        <h2 id="delais-title" className="t-h3">Délais de fabrication</h2>
        <p className="t-body">
          Chaque pièce est créée sur demande, sans stock, par des artisans français. Son délai de fabrication s’affiche sur sa fiche, dans le panier, au paiement et dans le suivi de la
          commande. Il se règle pièce par pièce dans le Catalogue.
        </p>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Catégorie</th><th scope="col">Délai par défaut</th><th scope="col">Pièces</th></tr></thead>
          <tbody>
            {CATEGORIES.map((c) => {
              const pieces = products.filter((p) => p.category === c);
              return (
                <tr key={c}>
                  <th scope="row">{boutique.categories?.[c] ?? c}</th>
                  <td>{delaiText(catalogue, DEFAULT_LEAD_TIME[c])}</td>
                  <td>{pieces.length ? pieces.map((p) => `${p.title} (${delaiText(catalogue, p.leadTime)})`).join(", ") : "Aucune pour l’instant"}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="t-note">
          Le délai par défaut d’une catégorie sert à une nouvelle pièce tant que le sien n’est pas réglé, et à une pièce de Shopify dont le délai n’est pas renseigné. Ces délais par
          défaut sont provisoires, en attendant leur confirmation par la Maison (ACTIVATION.md).
        </p>
        <h3 className="t-label">À confirmer</h3>
        {toConfirm.length ? (
          <ul className="stack-s">
            {toConfirm.map((x) => (
              <li key={x.label} className="t-body">
                {x.label} : {x.pieces.join(", ")}.
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body">Aucun prix, délai ni visuel provisoire : tout est confirmé.</p>
        )}
        <div>
          <Link href={atelierHref("/catalogue")} className="btn btn--outline">
            Confirmer dans le Catalogue
          </Link>
        </div>
      </section>
      <section className="panel" aria-labelledby="svc-title">
        <h2 id="svc-title" className="t-h3">Connexions</h2>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Service</th><th scope="col">État</th><th scope="col">Variables</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.name}><th scope="row">{s.name}</th><td><span className={`status status--${s.ok ? "done" : "info"}`}>{s.state}</span></td><td className="t-note">{s.hint}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <section className="panel" aria-labelledby="sec-title">
        <h2 id="sec-title" className="t-h3">Sécurité</h2>
        <p className="t-body">
          Dernières 24 heures : {digest.adminLogins} connexion(s), {digest.adminFailures} échec(s), {digest.adminBlocked} blocage(s), {digest.unusualLogins} connexion(s)
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
        <h3 className="t-label">Comptes autorisés</h3>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Adresse</th><th scope="col">État</th><th scope="col">Dernière connexion</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={a.email}>
                <th scope="row">{a.email}{a.email === me ? " (vous)" : ""}</th>
                <td>
                  <span className={`status status--${a.passwordHash && hasTotp(a) && !locked[i] ? "done" : "info"}`}>
                    {locked[i] ? "Bloqué une demi-heure" : !a.passwordHash ? "Première connexion à faire" : !hasTotp(a) ? "Double authentification à configurer" : `Prêt, ${recoveryLeft(a)} code(s) de secours`}
                  </span>
                </td>
                <td>{a.lastLoginAt ? <When iso={a.lastLoginAt} /> : "Jamais"}</td>
                <td className="proposal__actions">
                  {locked[i] ? <ActionButton endpoint={atelierApi("/comptes")} body={{ action: "debloquer", email: a.email }} label="Débloquer" variant="quiet" /> : null}
                  <ActionButton endpoint={atelierApi("/comptes")} body={{ action: "remettre-a-zero", email: a.email }} label="Remettre à zéro" variant="quiet" confirm={`Remettre à zéro le compte ${a.email} ? Son mot de passe et sa double authentification seront à refaire avec le mot de passe d’installation, et toutes les sessions seront fermées.`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="t-note">La liste des adresses autorisées se règle dans Vercel (ATELIER_ACCOUNTS). Chaque connexion envoie un e-mail à la titulaire du compte.</p>
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
          <ActionButton endpoint={atelierApi("/securite/sessions")} label="Déconnecter tous les appareils" confirm="Fermer toutes les sessions de l’Atelier, y compris celle-ci ?" />
          <ActionButton endpoint={atelierApi("/securite/totp")} label="Réinitialiser la double authentification" variant="quiet" confirm="Réinitialiser la double authentification ? Vous devrez scanner un nouveau QR code à la prochaine connexion." />
        </div>
      </section>
      <section className="panel" aria-labelledby="policy-title">
        <h2 id="policy-title" className="t-h3">Règles d’autonomie</h2>
        <p className="t-body">Les agents agissent seuls sur le quotidien. Seules les actions qui touchent à l’argent ou qui sont irréversibles vous sont soumises.</p>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Action</th><th scope="col">Décision</th></tr></thead>
          <tbody>
            {Object.entries(POLICY).filter(([k]) => !RETIRED_ACTIONS.has(k)).map(([k, p]) => (
              <tr key={k}><th scope="row">{p.label}</th><td>{p.approval ? <span className="status status--proposed">Votre validation · {p.why}</span> : <span className="status status--done">Autonome</span>}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <section className="panel" aria-labelledby="cal-title">
        <h2 id="cal-title" className="t-h3">Calendrier des agents</h2>
        <div className="table-scroll"><table className="table">
          <thead><tr><th scope="col">Agent</th><th scope="col">Cadence</th></tr></thead>
          <tbody>{AGENTS.map((a) => <tr key={a.id}><th scope="row">{agentName(a.id, agentNames)}</th><td>{a.schedule}</td></tr>)}</tbody>
        </table></div>
      </section>
      {commerceMode === "demo" ? (
        <section className="panel" aria-labelledby="reset-title">
          <h2 id="reset-title" className="t-h3">Données de démonstration</h2>
          <p className="t-body">Efface les commandes de test, messages, propositions, journaux, factures, certificats et contenus générés, et rétablit les pièces d’origine (prix, délais de fabrication, indicateurs provisoires). Les numéros de création déjà attribués ne reviennent jamais.</p>
          <ActionButton endpoint={atelierApi("/reset")} label="Réinitialiser la démonstration" confirm="Effacer toutes les données de démonstration ?" />
        </section>
      ) : null}
    </div>
  );
}
