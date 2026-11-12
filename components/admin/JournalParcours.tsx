/**
 * Journal des parcours de vente : ce qui est parti, ou serait parti en simulation (« aurait envoyé
 * tel e-mail à telle personne, tel jour »), les entrées et les sorties. Le plus récent en tête.
 */
import { When } from "./Status";
import { RAISONS, type LigneJournal } from "@/lib/marketing/parcours/types";

function phrase(l: LigneJournal): string {
  switch (l.evenement) {
    case "entree":
      return `${l.email} entre dans « ${l.parcoursNom} ».`;
    case "email":
      return l.mode === "reel" ? `E-mail « ${l.sujet} » envoyé à ${l.email}.` : `Aurait envoyé « ${l.sujet} » à ${l.email}.`;
    case "sortie":
      return `${l.email} sort de « ${l.parcoursNom} » : ${l.raison ? RAISONS[l.raison].toLowerCase() : "fin"}.`;
    case "erreur":
      return `L’e-mail « ${l.sujet} » n’a pas pu partir pour ${l.email}.`;
  }
}

export function JournalParcours({ titre, lignes, vide, id = titre.toLowerCase().replace(/[^a-z]+/g, "-") }: { titre: string; lignes: LigneJournal[]; vide?: string; id?: string }) {
  return (
    <section className="panel stack-m" aria-labelledby={id}>
      <h2 id={id} className="t-h3">
        {titre}
      </h2>
      {lignes.length ? (
        <ul className="liste-simple parcours-journal">
          {lignes.map((l, i) => (
            <li key={`${l.at}-${l.parcours}-${l.email}-${l.evenement}-${i}`} className="liste-simple__ligne">
              <span>{phrase(l)}</span>
              <span className="t-note">
                <When iso={l.at} />
              </span>
            </li>
          ))}
        </ul>
      ) : vide ? (
        <p className="t-note">{vide}</p>
      ) : null}
    </section>
  );
}
