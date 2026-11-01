import Link from "@/components/ui/Link";
import { getProposals } from "@/lib/agents/perform";
import { confectionAlerts } from "@/lib/agents/confection";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { withStages } from "@/lib/store/order-stages";
import { listInbox } from "@/lib/inbox";
import { listReturns } from "@/lib/returns";
import { upcomingAppointments } from "@/lib/appointments-notify";
import { parisDay } from "@/lib/appointments";
import { formatPrice } from "@/lib/format";
import { imageAt } from "@/lib/media";
import { ProposalCard } from "@/components/admin/ProposalCard";
import { atelierHref } from "@/lib/admin/path";

/** « 1 message », « 3 messages ». */
const compte = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/**
 * Accueil de l'Atelier (retour de la créatrice du 01/11 : trop austère, trop technique, on s'y
 * perd) : ce qui l'attend aujourd'hui, en mots simples et dans l'ordre où le faire, quelques
 * chiffres, ses pièces en photo et les gestes les plus courants. Les agents, la maintenance et le
 * journal sont dans les coulisses (Équipe).
 */
export default async function GestionHome() {
  const [proposals, orders, inbox, products, rdv, returns] = await Promise.all([
    getProposals(),
    getOrders().then(withStages),
    listInbox(500),
    getAllProducts().catch(() => []),
    upcomingAppointments(),
    listReturns(),
  ]);
  // composant serveur dynamique : rendu une seule fois par requête, l'heure courante est voulue
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since = now - 7 * 24 * 60 * 60 * 1000;
  const week = orders.filter((o) => new Date(o.createdAt).getTime() >= since && !["refunded", "pending"].includes(o.status));
  const revenue = week.reduce((s, o) => s + o.total, 0);
  const pending = proposals.filter((p) => p.status === "pending");
  const toAnswer = inbox.filter((m) => ["new", "drafted", "escalated"].includes(m.status));
  // chaque pièce est créée sur demande : on suit les confections, jamais un stock
  const received = orders.filter((o) => o.status === "paid");
  const making = orders.filter((o) => o.status === "paid" || o.status === "in_production");
  const late = confectionAlerts(making, products).filter((a) => a.kind === "en-retard").length;
  const today = parisDay(new Date(now)).day;
  const rdvToday = rdv.filter((a) => parisDay(new Date(a.start)).day === today);
  const returnsToHandle = returns.filter((r) => r.status === "demande" || r.status === "recu");
  const greeting = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(now));

  // dans l'ordre où les faire : ce qui est en retard, puis les clientes, puis le reste
  const todo: { href: string; titre: string; detail: string }[] = [];
  if (late) todo.push({ href: "/commandes", titre: `${compte(late, "commande", "commandes")} en retard sur le délai annoncé`, detail: "À faire avancer en priorité, ou à expliquer à la cliente." });
  if (rdvToday.length) todo.push({ href: "/rendez-vous", titre: `${compte(rdvToday.length, "rendez-vous", "rendez-vous")} aujourd’hui`, detail: "Le lien de l’appel vidéo est dans la rubrique Rendez-vous." });
  if (toAnswer.length) todo.push({ href: "/messages", titre: `${compte(toAnswer.length, "message", "messages")} à lire`, detail: "Une réponse est souvent déjà préparée : relisez-la, puis envoyez." });
  if (received.length) todo.push({ href: "/commandes", titre: `${compte(received.length, "commande reçue", "commandes reçues")} à mettre en confection`, detail: "Un geste fait avancer la commande, et la cliente reçoit l’e-mail de l’étape." });
  if (returnsToHandle.length) todo.push({ href: "/retours", titre: `${compte(returnsToHandle.length, "retour", "retours")} à traiter`, detail: "Demandes de retour et colis arrivés à l’atelier." });
  if (pending.length) todo.push({ href: "/validations", titre: `${compte(pending.length, "proposition", "propositions")} à valider`, detail: "Rien ne part sans votre accord : prix, délais, messages délicats." });

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head admin-page__head--accueil">
        <p className="eyebrow">{greeting}</p>
        <h1 className="t-h1">Bonjour.</h1>
        <p className="t-lead">{todo.length ? "Voici ce qui vous attend aujourd’hui, dans l’ordre." : "Rien ne presse aujourd’hui : tout est à jour."}</p>
      </header>

      {todo.length ? (
        <section className="panel" aria-labelledby="todo-title">
          <h2 id="todo-title" className="t-h3">
            À faire
          </h2>
          <ol className="a-faire">
            {todo.map((t) => (
              <li key={t.titre}>
                <Link href={atelierHref(t.href)} className="a-faire__item">
                  <span className="a-faire__titre">{t.titre}</span>
                  <span className="t-note">{t.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <dl className="kpis">
        <div>
          <dt className="t-label">Ventes · 7 jours</dt>
          <dd className="kpis__value">{formatPrice(revenue)}</dd>
          <dd className="t-note">{compte(week.length, "commande", "commandes")}</dd>
        </div>
        <div>
          <dt className="t-label">En confection</dt>
          <dd className="kpis__value">{making.length}</dd>
          <dd className="t-note">
            <Link href={atelierHref("/commandes")} className="text-link">
              {late ? `Dont ${late} en retard` : "Toutes dans les délais"}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="t-label">Rendez-vous à venir</dt>
          <dd className="kpis__value">{rdv.length}</dd>
          <dd className="t-note">
            <Link href={atelierHref("/rendez-vous")} className="text-link">
              Voir l’agenda
            </Link>
          </dd>
        </div>
        <div>
          <dt className="t-label">Messages à lire</dt>
          <dd className="kpis__value">{toAnswer.length}</dd>
          <dd className="t-note">
            <Link href={atelierHref("/messages")} className="text-link">
              Ouvrir la boîte
            </Link>
          </dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="gestes-title">
        <h2 id="gestes-title" className="t-h3">
          Gestes courants
        </h2>
        <div className="gestes">
          <Link href={atelierHref("/pages")} className="btn">
            Modifier le site
          </Link>
          <Link href={atelierHref("/catalogue")} className="btn btn--outline">
            Ajouter une pièce
          </Link>
          <Link href={atelierHref("/pages/photos")} className="btn btn--outline">
            Changer une photo
          </Link>
          <Link href="/" className="btn btn--outline">
            Voir le site
          </Link>
        </div>
      </section>

      {products.length ? (
        <section className="panel" aria-labelledby="pieces-title">
          <div className="panel__head">
            <h2 id="pieces-title" className="t-h3">
              Vos pièces
            </h2>
            <Link href={atelierHref("/catalogue")} className="link">
              Prix et délais
            </Link>
          </div>
          <ul className="pieces">
            {products.map((p) => (
              <li key={p.handle}>
                <Link href={`/boutique/${p.handle}`} className="pieces__item">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageAt(p.images[0].src, 480)} alt="" width={240} height={320} loading="lazy" className="pieces__photo" />
                  ) : null}
                  <span className="pieces__nom">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending.length ? (
        <section className="panel" aria-labelledby="valider-title">
          <div className="panel__head">
            <h2 id="valider-title" className="t-h3">
              À valider
            </h2>
            <Link href={atelierHref("/validations")} className="link">
              Tout voir
            </Link>
          </div>
          <div className="stack-m">
            {pending.slice(0, 3).map((p) => (
              <ProposalCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
