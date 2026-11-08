import { formatPrice } from "@/lib/format";
import { LIBELLE_STATUT_PAIEMENT, lienStripe, type Paiement, type StatutPaiement } from "@/lib/paiement/types";

/**
 * Paiement d'une commande dans l'Atelier (ordinateur et application) : statut, montant, part
 * remboursée, moyen employé, références Stripe, lien vers le tableau de bord Stripe, historique des
 * événements. Aucune donnée bancaire : Stripe n'en transmet aucune à la boutique.
 */
const PASTILLE: Record<StatutPaiement, string> = {
  "en-attente": "status--pending",
  reussi: "status--done",
  echoue: "status--failed",
  expire: "status--info",
  rembourse: "status--info",
  "partiellement-rembourse": "status--info",
  conteste: "status--failed",
};

const quand = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));

export function PastillePaiement({ statut }: { statut: StatutPaiement }) {
  return <span className={`status ${PASTILLE[statut]}`}>{LIBELLE_STATUT_PAIEMENT[statut]}</span>;
}

export function PaiementCommande({ paiement, moyenAncien }: { paiement?: Paiement; moyenAncien: string }) {
  if (!paiement) {
    return (
      <p className="t-note">
        Paiement enregistré avant le suivi des paiements{moyenAncien ? ` (${moyenAncien})` : ""} : aucune référence à afficher.
      </p>
    );
  }
  const lien = paiement.prestataire === "stripe" ? lienStripe(paiement) : null;
  const evenements = [...paiement.evenements].reverse();
  return (
    <div className="stack-m">
      <dl className="paiement-fiche">
        <div>
          <dt className="t-label">Statut</dt>
          <dd>
            <PastillePaiement statut={paiement.statut} />
            {paiement.prestataire === "essai" ? <span className="t-note"> Paiement d’essai de la démonstration : aucun argent ne bouge.</span> : null}
            {paiement.test ? <span className="t-note"> Mode test de Stripe.</span> : null}
          </dd>
        </div>
        <div>
          <dt className="t-label">Montant</dt>
          <dd>
            {formatPrice(paiement.montant)}
            {paiement.rembourse ? <span className="t-note">, dont {formatPrice(paiement.rembourse)} remboursés</span> : null}
          </dd>
        </div>
        {paiement.moyen ? (
          <div>
            <dt className="t-label">Moyen</dt>
            <dd>{paiement.moyen}</dd>
          </div>
        ) : null}
        {paiement.prestataire === "stripe" ? (
          <div>
            <dt className="t-label">Références Stripe</dt>
            <dd className="paiement-fiche__refs">
              {[paiement.intention, paiement.charge, paiement.session].filter(Boolean).map((r) => (
                <code key={r}>{r}</code>
              ))}
              {lien ? (
                <a href={lien} className="text-link" target="_blank" rel="noopener noreferrer">
                  Ouvrir dans Stripe
                </a>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
      {evenements.length ? (
        <div className="stack-s">
          <h3 className="t-label">Historique du paiement</h3>
          <ol className="paiement-histoire">
            {evenements.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="t-note">{quand(e.at)}</span>
                <span>
                  {e.resume}
                  {e.montant !== undefined ? ` · ${formatPrice(e.montant)}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
