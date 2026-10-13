import { listCustomerStats, segmentLabel, customersMode, type Segment } from "@/lib/customers";
import { consentStats } from "@/lib/consent/store";
import { flowCatalog } from "@/lib/marketing/flows";
import { marketingProvider } from "@/lib/marketing/provider";
import { salesBySource } from "@/lib/analytics/sales";
import { segments as rules } from "@/content/settings";
import { kv } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { When } from "@/components/admin/Status";
import { ActionButton } from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";

const SEGMENTS: Segment[] = ["nouvelle", "fidele", "vip"];

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const { segment } = await searchParams;
  const [customers, consent, sources, sent, rgpd] = await Promise.all([
    listCustomerStats(),
    consentStats(),
    salesBySource(90),
    kv.list<{ to: string; subject: string; flow: string; date: string; provider: string }>("marketing:sent", 12),
    kv.list<{ kind: string; at: string }>("rgpd:requests", 10),
  ]);
  const counts = Object.fromEntries(SEGMENTS.map((s) => [s, customers.filter((c) => c.segment === s).length])) as Record<Segment, number>;
  const shown = SEGMENTS.includes(segment as Segment) ? customers.filter((c) => c.segment === segment) : customers;
  const totalSources = sources.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Clientes</h1>
        <p className="t-lead">
          La base clientes ({customersMode === "supabase" ? "Supabase, synchronisée avec Shopify" : "mode démonstration"}) : segments, consentements, e-mails automatiques et
          ventes par source.
        </p>
      </header>

      <dl className="kpis">
        {SEGMENTS.map((s) => (
          <div key={s}>
            <dt className="t-label">{segmentLabel[s]}</dt>
            <dd className="kpis__value">{counts[s]}</dd>
            <dd className="t-note">
              <a href={`/gestion/clientes?segment=${s}`} className="text-link">
                Voir la liste
              </a>
            </dd>
          </div>
        ))}
        <div>
          <dt className="t-label">Consentements</dt>
          <dd className="kpis__value kpis__value--small">{consent.total} choix</dd>
          <dd className="t-note">
            Audience {consent.analytics} % · Personnalisation {consent.personalization} % · Publicité {consent.advertising} %
          </dd>
        </div>
      </dl>
      <p className="t-note">
        Règles : VIP à partir de {formatPrice(rules.vipMinSpent)} d’achats ou {rules.vipMinOrders} commandes ; fidèle à partir de {rules.loyalMinOrders} commandes ; nouvelle sinon. Les membres du
        Cercle qui deviennent VIP en reçoivent automatiquement les avantages.
      </p>

      <section className="panel" aria-labelledby="customers-title">
        <h2 id="customers-title" className="t-h3">
          {segment && SEGMENTS.includes(segment as Segment) ? `Clientes — ${segmentLabel[segment as Segment]}` : "Toutes les clientes"} ({shown.length})
        </h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Segment</th>
                <th scope="col">Commandes</th>
                <th scope="col">Montant</th>
                <th scope="col">Dernière commande</th>
                <th scope="col">Lettres</th>
                <th scope="col">Cercle</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((c) => (
                <tr key={c.id}>
                  <th scope="row">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                    <br />
                    <span className="t-note">{c.email}</span>
                  </th>
                  <td>
                    <span className={`status status--${c.segment === "vip" ? "done" : "info"}`}>{segmentLabel[c.segment]}</span>
                  </td>
                  <td>{c.ordersCount}</td>
                  <td>{formatPrice(c.totalSpent)}</td>
                  <td>{c.lastOrderAt ? <When iso={c.lastOrderAt} /> : "—"}</td>
                  <td>{c.marketingEmail ? "Oui" : "Non"}</td>
                  <td>{c.cercleMember ? "Membre" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="sources-title">
        <h2 id="sources-title" className="t-h3">Ventes par source · 90 jours</h2>
        <p className="t-note">Canal d’origine de chaque commande (Shopify, ou mesure d’audience acceptée sur le site). Les commandes sans information sont classées « non renseignée ».</p>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Commandes</th>
                <th scope="col">Chiffre d’affaires</th>
                <th scope="col">Part</th>
                <th scope="col">Panier moyen</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((r) => (
                <tr key={r.source}>
                  <th scope="row">{r.label}</th>
                  <td>{r.orders}</td>
                  <td>{formatPrice(r.revenue)}</td>
                  <td>{totalSources ? Math.round((r.revenue / totalSources) * 100) : 0} %</td>
                  <td>{formatPrice(Math.round(r.revenue / Math.max(1, r.orders)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="flows-title">
        <h2 id="flows-title" className="t-h3">E-mails automatiques</h2>
        <p className="t-note">
          Outil : {marketingProvider === "brevo" ? "Brevo" : marketingProvider === "klaviyo" ? "Klaviyo (évènements) + envoi par le site" : "envoi par le site (aucun outil marketing configuré)"}. Gabarits à l’image de la
          maison, un seul envoi par évènement.
        </p>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Scénario</th>
                <th scope="col">Déclencheur</th>
                <th scope="col">Condition</th>
              </tr>
            </thead>
            <tbody>
              {flowCatalog.map((f) => (
                <tr key={f.id}>
                  <th scope="row">{f.label}</th>
                  <td>{f.trigger}</td>
                  <td>{f.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ActionButton endpoint="/api/gestion/flows" label="Lancer les envois du jour" busyLabel="Envois…" />
        {sent.length ? (
          <ul className="stack">
            {sent.map((m, i) => (
              <li key={i} className="t-note">
                <When iso={m.date} /> — {m.subject} → {m.to} ({m.flow})
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="rgpd-title">
        <h2 id="rgpd-title" className="t-h3">Demandes RGPD</h2>
        <p className="t-note">Les clientes téléchargent et suppriment elles-mêmes leurs données depuis leur compte. Registre sans donnée personnelle.</p>
        {rgpd.length ? (
          <ul className="stack">
            {rgpd.map((r, i) => (
              <li key={i} className="t-note">
                <When iso={r.at} /> — {r.kind}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucune demande enregistrée.</p>
        )}
      </section>
    </div>
  );
}
