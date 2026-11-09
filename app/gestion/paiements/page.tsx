import Link from "@/components/ui/Link";
import { getOrders } from "@/lib/commerce/orders";
import { journalPaiements } from "@/lib/paiement/suivi";
import { LIBELLE_STATUT_PAIEMENT, lienStripe, type StatutPaiement } from "@/lib/paiement/types";
import { PastillePaiement } from "@/components/admin/PaiementCommande";
import { formatPrice } from "@/lib/format";
import { atelierHref } from "@/lib/admin/path";
import { boutiqueReelle, paiementEnLigne, raisonPaiementFerme, stripeEnTest } from "@/lib/config/boutique";

/**
 * Atelier › Commandes › Paiements : l'état des paiements de chaque commande (réussis, en attente,
 * échoués, remboursés, contestés) et l'historique des événements reçus de Stripe, avec les
 * références et le lien vers le tableau de bord Stripe. Les remboursements se font sur la fiche de
 * la commande (confirmés, une seule fois) ou depuis Retours.
 */
export const dynamic = "force-dynamic";

const ORDRE: StatutPaiement[] = ["en-attente", "reussi", "echoue", "expire", "partiellement-rembourse", "rembourse", "conteste"];
const quand = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));

export default async function PaiementsPage() {
  const [orders, journal] = await Promise.all([getOrders(), journalPaiements(200)]);
  const avecPaiement = orders.filter((o) => o.payment);
  const compte = new Map<StatutPaiement, number>();
  for (const o of avecPaiement) compte.set(o.payment!.statut, (compte.get(o.payment!.statut) ?? 0) + 1);
  const recents = avecPaiement.slice(0, 50);
  const raison = raisonPaiementFerme();
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Paiements</h1>
        <p className="t-lead">Chaque paiement et son état.</p>
        {paiementEnLigne() ? (
          <p className="t-note">{stripeEnTest() ? "Stripe en mode test : aucun argent réel ne bouge." : "Stripe encaisse les paiements de la boutique."}</p>
        ) : raison ? (
          <p className="t-note">{raison}</p>
        ) : null}
      </header>

      <section className="panel stack-m" aria-labelledby="etat-title">
        <h2 id="etat-title" className="t-h3">
          État des paiements
        </h2>
        {avecPaiement.length ? (
          <ul className="admin-actions" aria-label="Nombre de commandes par état de paiement">
            {ORDRE.filter((s) => compte.get(s)).map((s) => (
              <li key={s}>
                <PastillePaiement statut={s} /> <span className="t-note">{compte.get(s)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">{boutiqueReelle() ? "Aucun paiement pour l’instant." : "Aucun paiement pour l’instant : passez une commande d’essai sur le site pour en voir un."}</p>
        )}
      </section>

      {recents.length ? (
        <section className="panel stack-m" aria-labelledby="recents-title">
          <h2 id="recents-title" className="t-h3">
            Derniers paiements
          </h2>
          <div className="table-scroll">
            <table className="table table--paiements">
              <thead>
                <tr>
                  <th scope="col">Commande</th>
                  <th scope="col">Date</th>
                  <th scope="col">Montant</th>
                  <th scope="col">État</th>
                  <th scope="col">Moyen</th>
                  <th scope="col">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {recents.map((o) => {
                  const p = o.payment!;
                  const lien = p.prestataire === "stripe" ? lienStripe(p) : null;
                  return (
                    <tr key={o.id}>
                      <th scope="row">
                        <Link href={atelierHref(`/commandes/${encodeURIComponent(o.number)}`)} className="text-link">
                          {o.number}
                        </Link>
                      </th>
                      <td>{quand(o.createdAt)}</td>
                      <td>
                        {formatPrice(p.montant)}
                        {p.rembourse ? <span className="t-note"> ({formatPrice(p.rembourse)} remboursés)</span> : null}
                      </td>
                      <td>
                        <PastillePaiement statut={p.statut} />
                      </td>
                      <td>{p.prestataire === "essai" ? "Essai" : (p.moyen ?? "")}</td>
                      <td>
                        {lien ? (
                          <a href={lien} className="text-link" target="_blank" rel="noopener noreferrer">
                            Ouvrir{p.test ? " (test)" : ""}
                          </a>
                        ) : (
                          <span className="t-note">{p.prestataire === "essai" ? "Démonstration" : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel stack-m" aria-labelledby="journal-title">
        <h2 id="journal-title" className="t-h3">
          Historique des événements
        </h2>
        {journal.length ? (
          <ol className="paiement-histoire">
            {journal.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="t-note">{quand(e.at)}</span>
                <span>
                  <Link href={atelierHref(`/commandes/${encodeURIComponent(e.numero)}`)} className="text-link">
                    {e.numero}
                  </Link>{" "}
                  · {e.resume}
                  {e.montant !== undefined ? ` · ${formatPrice(e.montant)}` : ""}
                  {e.test ? " · test" : ""}
                  {e.reference ? <code className="t-note"> {e.reference}</code> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="t-note">Aucun événement de Stripe reçu pour l’instant.</p>
        )}
        <p className="t-note">États possibles : {Object.values(LIBELLE_STATUT_PAIEMENT).join(", ").toLowerCase()}.</p>
      </section>
    </div>
  );
}
