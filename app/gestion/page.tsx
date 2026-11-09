import Link from "@/components/ui/Link";
import { getProposals } from "@/lib/agents/perform";
import { confectionAlerts } from "@/lib/agents/confection";
import { getLog } from "@/lib/agents/log";
import { getAllProducts } from "@/lib/commerce";
import { getOrdersWithSource, statusLabel } from "@/lib/commerce/orders";
import { withStages } from "@/lib/store/order-stages";
import { listInbox } from "@/lib/inbox";
import { listReturns } from "@/lib/returns";
import { listReviews } from "@/lib/reviews";
import { listCustomerStats } from "@/lib/customers";
import { upcomingAppointments } from "@/lib/appointments-notify";
import { APPOINTMENT_TYPES, parisDay } from "@/lib/appointments";
import { formatPrice } from "@/lib/format";
import {
  activiteRecente,
  compte,
  de,
  evolution,
  lienAction,
  latestOrders,
  monthRevenue,
  newCustomers,
  ordersToHandle,
  parisMonthKey,
  prenom,
  previousMonthKey,
  priorites,
  topSold,
} from "@/lib/admin/dashboard";
import { atelierHref } from "@/lib/admin/path";

const quand = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
const heure = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
const mois = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "Europe/Paris",
  }).format(d);
const lien = (href: string) => lienAction(href, atelierHref);

/** Raccourcis de « Que souhaitez-vous faire ? » : une entrée n'apparaît que le jour où sa page existe. */
const RACCOURCIS: { href: string; label: string; site?: boolean }[] = [
  { href: "/catalogue/nouveau", label: "Ajouter un produit" },
  { href: "/commandes", label: "Voir les commandes" },
  { href: "/pages", label: "Modifier mon site" },
  { href: "/pages/photos", label: "Changer une photo" },
  { href: "/e-mails", label: "Écrire une lettre" },
  { href: "/", label: "Voir le site", site: true },
];

/**
 * Vue d'ensemble de l'Atelier, le centre de pilotage (brief de la créatrice du 03/11 et du 07/11) :
 * en ouvrant l'Atelier le matin, ce qui attend dans l'ordre où le faire, les gestes courants, quatre
 * chiffres, puis les dernières commandes, les prochains rendez-vous, les pièces qui se vendent et
 * l'activité récente. Rien n'est inventé : chaque chiffre vient des commandes, des clientes et des
 * messages réels (calculs dans lib/admin/dashboard.ts) ; en mode essai, la page le dit.
 */
export default async function GestionHome() {
  const [
    proposals,
    { orders, source },
    inbox,
    products,
    rdv,
    returns,
    reviews,
    customers,
    log,
  ] = await Promise.all([
    getProposals(),
    getOrdersWithSource().then(async (r) => ({ ...r, orders: await withStages(r.orders) })),
    listInbox(500),
    getAllProducts().catch(() => []),
    upcomingAppointments(),
    listReturns(),
    listReviews("pending").catch(() => []),
    // base clientes injoignable : le chiffre est dit indisponible, jamais « 0 »
    listCustomerStats().catch(() => null),
    getLog(60),
  ]);
  // composant serveur dynamique : rendu une seule fois par requête, l'heure courante est voulue
  // eslint-disable-next-line react-hooks/purity
  const now = new Date(Date.now());
  const revenue = monthRevenue(orders, now);
  const change = evolution(revenue.amount, revenue.previousAmount);
  const { received, ready } = ordersToHandle(orders);
  const making = orders.filter(
    (o) => o.status === "paid" || o.status === "in_production",
  );
  const late = confectionAlerts(making, products, now).filter(
    (a) => a.kind === "en-retard",
  ).length;
  const toAnswer = inbox.filter((m) =>
    ["new", "drafted", "escalated"].includes(m.status),
  );
  const today = parisDay(now).day;
  const nouvelles = customers ? newCustomers(customers, now) : null;
  const ventes = topSold(orders, now);
  const todo = priorites({
    blocked: orders.filter((o) => o.status === "blocked").length,
    late,
    rdvToday: rdv.filter((a) => parisDay(new Date(a.start)).day === today)
      .length,
    messages: toAnswer.length,
    received: received.length,
    ready: ready.length,
    returns: returns.filter(
      (r) => r.status === "demande" || r.status === "recu",
    ).length,
    proposals: proposals.filter((p) => p.status === "pending").length,
    reviews: reviews.length,
    unsellable: products.filter((p) => !p.variants.length).map((p) => p.title),
    provisional: products
      .filter((p) => p.priceProvisional || p.leadTimeProvisional)
      .map((p) => p.title),
  });
  const activite = activiteRecente({ messages: inbox, actions: log });
  const greeting = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(now);
  const [py, pm] = previousMonthKey(parisMonthKey(now)).split("-").map(Number);
  const previousMonth = new Date(Date.UTC(py, pm - 1, 15));

  return (
    <div className="admin-page stack-l pilotage">
      <header className="admin-page__head admin-page__head--accueil">
        <p className="eyebrow">{greeting}</p>
        <h1 className="t-h1">Bonjour.</h1>
        <p className="t-lead">
          {todo.length
            ? `${compte(todo.length, "chose à faire", "choses à faire")} aujourd’hui.`
            : "Tout est à jour."}
        </p>
        {source === "demo" ? (
          <p className="t-note">Démonstration : des exemples, pas des ventes.</p>
        ) : null}
      </header>

      <div className="pilotage__haut">
        <section className="panel" aria-labelledby="todo-title">
          <h2 id="todo-title" className="t-h3">
            À faire en priorité
          </h2>
          {todo.length ? (
            <ol className="a-faire">
              {todo.map((t) => (
                <li key={t.titre}>
                  <Link href={atelierHref(t.href)} className="a-faire__item" title={t.detail}>
                    <span className="a-faire__titre">{t.titre}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="t-note">Rien n’attend.</p>
          )}
        </section>

        <nav className="panel" aria-labelledby="raccourcis-title">
          <h2 id="raccourcis-title" className="t-h3">
            Raccourcis
          </h2>
          <ul className="raccourcis">
            {RACCOURCIS.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.site ? r.href : atelierHref(r.href)}
                  className="raccourcis__lien"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <dl className="kpis">
        <div>
          <dt className="t-label">Ventes {de(mois(now))}</dt>
          <dd className="kpis__value">{formatPrice(revenue.amount)}</dd>
          <dd className="t-note">
            {compte(revenue.count, "commande", "commandes")}
            {change === null
              ? ""
              : `, ${change >= 0 ? "+" : "−"}${Math.abs(change)} % par rapport à ${mois(previousMonth)} à la même date`}
          </dd>
        </div>
        <div>
          <dt className="t-label">Commandes à traiter</dt>
          <dd className="kpis__value">{received.length + ready.length}</dd>
          <dd className="t-note">
            <Link href={atelierHref("/commandes")} className="text-link">
              {received.length || ready.length
                ? `${received.length} à mettre en confection, ${ready.length} à expédier`
                : "Toutes avancent"}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="t-label">En confection</dt>
          <dd className="kpis__value">{making.length}</dd>
          <dd className="t-note">
            {late ? `Dont ${late} en retard` : "Toutes dans les délais"}
          </dd>
        </div>
        <div>
          <dt className="t-label">Nouvelles clientes</dt>
          <dd className={nouvelles ? "kpis__value" : "kpis__value kpis__value--small"}>{nouvelles ? nouvelles.length : "Indisponible"}</dd>
          <dd className="t-note">
            <Link href={atelierHref("/clientes")} className="text-link">
              Ces 30 derniers jours
            </Link>
          </dd>
        </div>
      </dl>

      <div className="pilotage__bas">
        <div className="stack-l">
          <section className="panel" aria-labelledby="dernieres-title">
            <div className="panel__head">
              <h2 id="dernieres-title" className="t-h3">
                Dernières commandes
              </h2>
              <Link href={atelierHref("/commandes")} className="link">
                Toutes les commandes
              </Link>
            </div>
            {orders.length ? (
              <ul className="liste-simple">
                {latestOrders(orders).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={atelierHref(
                        `/commandes/${encodeURIComponent(o.number)}`,
                      )}
                      className="liste-simple__ligne"
                    >
                      <span className="liste-simple__titre">
                        {o.number} · {prenom(o.name)}
                      </span>
                      <span className="t-note">
                        {quand(o.createdAt)} · {statusLabel[o.status]}
                      </span>
                      <span className="liste-simple__montant">
                        {formatPrice(o.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-note">
                Aucune commande pour l’instant. Elles apparaîtront ici dès la
                première.
              </p>
            )}
          </section>
          <section className="panel" aria-labelledby="activite-title">
            <h2 id="activite-title" className="t-h3">
              Activité récente
            </h2>
            {activite.length ? (
              <ul className="liste-simple">
                {activite.map((a) => (
                  <li key={`${a.date}-${a.texte}`}>
                    {a.href ? (
                      <Link href={lien(a.href)} className="liste-simple__ligne">
                        <span className="liste-simple__titre">{a.texte}</span>
                        <span className="t-note">{quand(a.date)}</span>
                      </Link>
                    ) : (
                      <div className="liste-simple__ligne">
                        <span className="liste-simple__titre">{a.texte}</span>
                        <span className="t-note">{quand(a.date)}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-note">Rien de nouveau pour l’instant.</p>
            )}
          </section>
        </div>

        <div className="stack-l">
          <section className="panel" aria-labelledby="rdv-title">
            <div className="panel__head">
              <h2 id="rdv-title" className="t-h3">
                Prochains rendez-vous
              </h2>
              <Link href={atelierHref("/rendez-vous")} className="link">
                Agenda
              </Link>
            </div>
            {rdv.length ? (
              <ul className="liste-simple">
                {[...rdv]
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .slice(0, 3)
                  .map((a) => (
                    <li key={a.id} className="liste-simple__ligne">
                      <span className="liste-simple__titre">
                        {prenom(a.name)}
                      </span>
                      <span className="t-note">
                        {APPOINTMENT_TYPES[a.type].label}, {heure(a.start)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="t-note">Aucun rendez-vous à venir.</p>
            )}
          </section>

          <section className="panel" aria-labelledby="ventes-title">
            <h2 id="ventes-title" className="t-h3">
              Pièces les plus vendues
            </h2>
            {ventes.length ? (
              <ol className="liste-simple">
                {ventes.map((v) => (
                  <li key={v.handle} className="liste-simple__ligne">
                    <span className="liste-simple__titre">{v.title}</span>
                    <span className="t-note">
                      {compte(v.quantity, "pièce vendue", "pièces vendues")}{" "}
                      en trois mois
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="t-note">
                Pas encore de vente ces trois derniers mois.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
