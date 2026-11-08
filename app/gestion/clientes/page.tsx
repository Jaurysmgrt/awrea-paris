import { listCustomerStats, customersMode } from "@/lib/customers";
import { consentStats } from "@/lib/consent/store";
import { flowCatalog } from "@/lib/marketing/flows";
import { marketingProvider } from "@/lib/marketing/provider";
import { salesBySource } from "@/lib/analytics/sales";
import { segments as rules } from "@/content/settings";
import { kv } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { When } from "@/components/admin/Status";
import { ActionButton } from "@/components/admin/ActionButton";
import { atelierHref, atelierApi } from "@/lib/admin/path";
import Link from "@/components/ui/Link";
import { categorieActivite, CATEGORIES, compterParCategorie, estCategorie, filtrerClientes, LIBELLE_CATEGORIE, type CategorieActivite } from "@/lib/admin/clientes";

export const dynamic = "force-dynamic";

const AFFICHEES = 200;

/**
 * Clientes de l'Atelier : chercher une cliente, la retrouver par catégorie d'activité (nouvelle,
 * régulière, fidèle, inactive), ouvrir sa fiche ; consentements, ventes par source, e-mails
 * automatiques et registre RGPD.
 */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const categorie: CategorieActivite | "toutes" = estCategorie(sp.categorie) ? sp.categorie : "toutes";
  const [customers, consent, sources, sent, rgpd] = await Promise.all([
    listCustomerStats(),
    consentStats(),
    salesBySource(90),
    kv.list<{ to: string; subject: string; flow: string; date: string; provider: string }>("marketing:sent", 12),
    kv.list<{ kind: string; at: string }>("rgpd:requests", 10),
  ]);
  const maintenant = new Date();
  const cherchees = filtrerClientes(customers, { q }, maintenant);
  const counts = compterParCategorie(cherchees, maintenant);
  const shown = filtrerClientes(cherchees, { categorie }, maintenant);
  const totalSources = sources.reduce((s, r) => s + r.revenue, 0);
  const lien = (c: CategorieActivite | "toutes") => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(c !== "toutes" ? { categorie: c } : {}) }).toString();
    return atelierHref(`/clientes${p ? `?${p}` : ""}`);
  };
  const filtre = Boolean(q || categorie !== "toutes");

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Clientes</h1>
        <p className="t-lead">Chaque cliente, ses commandes et vos notes ({customersMode === "supabase" ? "base Supabase" : "mode démonstration"}).</p>
      </header>

      <section className="panel stack-m" aria-labelledby="customers-title">
        <h2 id="customers-title" className="t-h3">
          {filtre ? `Clientes trouvées (${shown.length})` : `Toutes les clientes (${customers.length})`}
        </h2>
        <form className="commandes-filtres" role="search" method="get" action={atelierHref("/clientes")}>
          <div className="field">
            <label className="field__label" htmlFor="clientes-q">
              Chercher une cliente
            </label>
            <input id="clientes-q" name="q" type="search" className="field__input" defaultValue={q} placeholder="Prénom, nom ou adresse" autoComplete="off" />
          </div>
          {categorie !== "toutes" ? <input type="hidden" name="categorie" value={categorie} /> : null}
          <button type="submit" className="btn btn--outline">
            Chercher
          </button>
        </form>
        <nav className="produits__filtres" aria-label="Catégories de clientes">
          <Link href={lien("toutes")} className="chip" aria-current={categorie === "toutes" ? "true" : undefined}>
            Toutes ({cherchees.length})
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={lien(c.id)} className="chip" aria-current={categorie === c.id ? "true" : undefined}>
              {c.label} ({counts[c.id]})
            </Link>
          ))}
        </nav>
        <p className="t-note">{CATEGORIES.map((c) => `${c.label.toLowerCase()} : ${c.regle}`).join(" · ")}. VIP à partir de {formatPrice(rules.vipMinSpent)} d’achats ou {rules.vipMinOrders} commandes.</p>
        {filtre ? (
          <p className="t-note">
            <Link href={atelierHref("/clientes")} className="text-link">
              Effacer la recherche et les filtres
            </Link>
          </p>
        ) : null}
        {!shown.length ? (
          <p className="t-body">{customers.length ? "Aucune cliente ne correspond. Essayez un autre mot ou une autre catégorie." : "Aucune cliente pour l’instant."}</p>
        ) : (
          <div className="table-scroll">
            <table className="table table--clientes">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Catégorie</th>
                  <th scope="col">Commandes</th>
                  <th scope="col">Montant</th>
                  <th scope="col">Dernière commande</th>
                  <th scope="col">Lettres</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, AFFICHEES).map((c) => (
                  <tr key={c.id}>
                    <th scope="row">
                      <Link href={atelierHref(`/clientes/${encodeURIComponent(c.id)}`)} className="text-link">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "Nom inconnu"}
                      </Link>
                      <br />
                      <span className="t-note table__mail">{c.email}</span>
                    </th>
                    <td data-titre="Catégorie">
                      <span className="status status--info">{LIBELLE_CATEGORIE[categorieActivite(c, maintenant)]}</span>
                      {c.segment === "vip" ? <> <span className="status status--done">VIP</span></> : null}
                      {c.cercleMember ? <span className="t-note table__detail">Membre du Cercle</span> : null}
                    </td>
                    <td data-titre="Commandes">{c.ordersCount}</td>
                    <td data-titre="Montant">{formatPrice(c.totalSpent)}</td>
                    <td data-titre="Dernière commande">{c.lastOrderAt ? <When iso={c.lastOrderAt} /> : "Aucune"}</td>
                    <td data-titre="Lettres">{c.marketingEmail ? "Oui" : "Non"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > AFFICHEES ? <p className="t-note">Les {AFFICHEES} premières sont affichées : affinez la recherche pour trouver les autres.</p> : null}
      </section>

      <dl className="kpis">
        <div>
          <dt className="t-label">Consentements</dt>
          <dd className="kpis__value kpis__value--small">{consent.total} choix</dd>
          <dd className="t-note">
            Audience {consent.analytics} % · Personnalisation {consent.personalization} % · Publicité {consent.advertising} %
          </dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="sources-title">
        <h2 id="sources-title" className="t-h3">Ventes par source · 90 jours</h2>
        <p className="t-note">Canal d’origine de chaque commande (Shopify, ou mesure d’audience acceptée sur le site). Les commandes sans information sont classées « non renseignée ».</p>
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
          Outil : {marketingProvider === "brevo" ? "Brevo" : marketingProvider === "klaviyo" ? "Klaviyo pour les évènements, envoi par le site" : "envoi par le site (aucun outil marketing configuré)"}. Tous les e-mails partagent le même gabarit, noir et blanc cassé, dans les
          caractères du site. Un évènement n’en déclenche qu’un seul.
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
        <ActionButton endpoint={atelierApi("/flows")} label="Lancer les envois du jour" busyLabel="Envois…" />
        {sent.length ? (
          <ul className="stack">
            {sent.map((m, i) => (
              <li key={i} className="t-note">
                <When iso={m.date} /> · « {m.subject} » pour {m.to} ({m.flow})
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
                <When iso={r.at} /> · {r.kind}
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
