import Link from "@/components/ui/Link";
import { atelierHref } from "@/lib/admin/path";
import { EmailsTabs } from "@/components/admin/EmailsTabs";
import { When } from "@/components/admin/Status";
import { AccordEnvoisReels, CreerDepuisModele, LancerPassage, NouvelEmail, PlafondForm } from "@/components/admin/ParcoursGestes";
import { modeActuel, prevision, statsParcours, variableEnvoisReels } from "@/lib/marketing/parcours";
import type { Bilan } from "@/lib/marketing/parcours/moteur";
import { lireContacts } from "@/lib/marketing/parcours/contacts";
import { emailsDesParcours } from "@/lib/marketing/parcours/emails";
import { MODELES } from "@/lib/marketing/parcours/modeles";
import { derniersPassages, lireInterrupteur, lireJournal, lireReglages, listeParcours } from "@/lib/marketing/parcours/stockage";
import { DECLENCHEURS, PLAFOND_MAX, PLAFOND_MIN, STATUTS, type LigneJournal, type Statut } from "@/lib/marketing/parcours/types";
import { JournalParcours } from "@/components/admin/JournalParcours";

const STATUT_CLASSE: Record<Statut, string> = { brouillon: "status status--info", actif: "status status--done", pause: "status status--proposed" };
const pl = (n: number) => (n > 1 ? "s" : "");
/** Bilan d'un passage, en une phrase : ce qui est entré, parti (ou simulé), sorti, et ce qui attend. */
const bilan = (b: Bilan) =>
  [
    `${b.entrees} entrée${pl(b.entrees)}`,
    `${b.envois} e-mail${pl(b.envois)} ${b.mode === "reel" ? "envoyé" : "simulé"}${pl(b.envois)}`,
    `${b.sorties} sortie${pl(b.sorties)}`,
    b.reportes ? `${b.reportes} reporté${pl(b.reportes)} pour garder le rythme` : "",
    b.enAttente ? `${b.enAttente} en attente d’un e-mail à finir` : "",
    b.erreurs ? `${b.erreurs} en échec` : "",
  ]
    .filter(Boolean)
    .join(", ") + ".";
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

/**
 * E-mails › Parcours (cahier de l'Atelier du 10/11, § 4) : les parcours de vente, leur statut et
 * leurs chiffres, les modèles, le plafond de fréquence, les deux clés des envois réels, ce qui
 * partirait dans les 30 prochains jours et le journal de simulation.
 */
export default async function ParcoursPage() {
  const [liste, reglages, interrupteur, mode, journal, emails, passages, contacts] = await Promise.all([
    listeParcours(),
    lireReglages(),
    lireInterrupteur(),
    modeActuel(),
    lireJournal(300),
    emailsDesParcours(),
    derniersPassages(1),
    lireContacts().catch((e: Error) => {
      console.error("[parcours] contacts", e);
      return null;
    }),
  ]);
  const [stats, prevus] = await Promise.all([
    contacts ? Promise.all(liste.map((p) => statsParcours(p, contacts))) : Promise.resolve(null),
    contacts ? prevision(30).catch(() => []) : Promise.resolve([]),
  ]);
  const variable = variableEnvoisReels();
  const actifs = liste.filter((p) => p.statut === "actif").map((p) => p.nom);
  const simules = journal.filter((l: LigneJournal) => l.mode === "simulation").slice(0, 100);
  const reels = journal.filter((l: LigneJournal) => l.mode === "reel").slice(0, 100);

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">E-mails</h1>
        <EmailsTabs actif="/e-mails/parcours" />
        <p className="t-lead">Des suites d’e-mails qui partent seules, chaque matin. Rien ne part pour de vrai sans votre accord.</p>
      </header>

      <section className="panel stack-m" aria-labelledby="envois-titre">
        <div className="panel__head">
          <h2 id="envois-titre" className="t-h3">
            Envois
          </h2>
          <span className={mode === "reel" ? "status status--done" : "status status--proposed"}>{mode === "reel" ? "Envois réels" : "Simulation"}</span>
        </div>
        <p className="t-note t-left">{mode === "reel" ? "Les e-mails des parcours actifs partent pour de vrai." : "Rien ne part. Le journal dit ce qui serait parti, à qui et quel jour."}</p>
        <ul className="liste-simple">
          <li className="liste-simple__ligne">
            <span>Variable PARCOURS_ENVOIS_REELS dans Vercel</span>
            <span className="liste-simple__montant">{variable ? "Posée" : "Pas posée"}</span>
          </li>
          <li className="liste-simple__ligne">
            <span>Votre accord</span>
            <span className="liste-simple__montant">{interrupteur.actif ? "Donné" : "Pas donné"}</span>
            {interrupteur.actif && interrupteur.le ? (
              <span className="t-note">
                Par {interrupteur.par}, le <When iso={interrupteur.le} />
              </span>
            ) : null}
          </li>
        </ul>
        <AccordEnvoisReels actif={interrupteur.actif} parcoursActifs={actifs} variable={variable} />
      </section>

      <section className="panel stack-m" aria-labelledby="liste-titre">
        <h2 id="liste-titre" className="t-h3">
          Vos parcours
        </h2>
        {liste.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Parcours</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Départ</th>
                  <th scope="col">Entrées</th>
                  <th scope="col">{mode === "reel" ? "E-mails envoyés" : "E-mails simulés"}</th>
                  <th scope="col">Achats ensuite</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((p, i) => {
                  const s = stats?.[i]?.[mode];
                  return (
                    <tr key={p.id}>
                      <th scope="row">
                        <Link href={atelierHref(`/e-mails/parcours/${p.id}`)}>{p.nom}</Link>
                      </th>
                      <td>
                        <span className={STATUT_CLASSE[p.statut]}>{STATUTS[p.statut]}</span>
                      </td>
                      <td>{DECLENCHEURS[p.declencheur].label}</td>
                      <td className="table__nombre">{s?.entrees ?? ""}</td>
                      <td className="table__nombre">{s?.messages ?? ""}</td>
                      <td className="table__nombre">{s?.conversions ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">Aucun parcours pour l’instant. Partez d’un modèle, juste en dessous.</p>
        )}
        {!contacts ? <p className="field__error">Les contacts n’ont pas pu être lus : les chiffres reviendront au prochain chargement.</p> : null}
        <p className="t-note t-left">Clics et ouvertures : non mesurés, aucun outil de suivi n’est branché.</p>
      </section>

      <section className="panel stack-m" aria-labelledby="modeles-titre">
        <h2 id="modeles-titre" className="t-h3">
          Partir d’un modèle
        </h2>
        <p className="t-note t-left">Chaque modèle devient un brouillon à relire. Il ne part jamais seul.</p>
        <ul className="liste-simple">
          {MODELES.map((m) => (
            <li key={m.id} className="parcours-modele">
              <div className="stack-s">
                <h3 className="t-h4">{m.nom}</h3>
                <p className="t-note t-left">{m.pour}</p>
                {m.note ? <p className="t-note t-left">{m.note}</p> : null}
              </div>
              <CreerDepuisModele modele={m.id} nom={m.nom} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel stack-m" aria-labelledby="reglages-titre">
        <h2 id="reglages-titre" className="t-h3">
          Rythme
        </h2>
        <PlafondForm jours={reglages.plafondJours} min={PLAFOND_MIN} max={PLAFOND_MAX} />
        <p className="t-note t-left">Le passage se fait seul chaque matin. Vous pouvez aussi le lancer maintenant.</p>
        <LancerPassage />
        {passages[0] ? (
          <p className="t-note t-left">
            Dernier passage, <When iso={passages[0].at} />
            {` : ${bilan(passages[0])}`}
          </p>
        ) : null}
      </section>

      {actifs.length ? (
        <section className="panel stack-m" aria-labelledby="prevision-titre">
          <h2 id="prevision-titre" className="t-h3">
            Les 30 prochains jours
          </h2>
          <p className="t-note t-left">Si personne n’achète ni ne se désinscrit d’ici là.</p>
          {prevus.length ? (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Jour</th>
                    <th scope="col">Personne</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Parcours</th>
                  </tr>
                </thead>
                <tbody>
                  {prevus.map((v) => (
                    <tr key={`${v.parcours}-${v.email}-${v.etape}`}>
                      <td>{jour(v.le)}</td>
                      <th scope="row" className="table__mail">
                        {v.email}
                      </th>
                      <td>{v.sujet}</td>
                      <td>{v.parcoursNom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="t-note">Aucun e-mail prévu pour l’instant.</p>
          )}
        </section>
      ) : null}

      <JournalParcours titre="Journal de simulation" lignes={simules} vide="Rien encore. Activez un parcours, puis lancez un passage." />
      {reels.length ? <JournalParcours titre="Journal des envois" lignes={reels} /> : null}

      <section className="panel stack-m" aria-labelledby="emails-titre">
        <h2 id="emails-titre" className="t-h3">
          E-mails des parcours
        </h2>
        <p className="t-note t-left">Des e-mails de la lettre, avec le lien de désinscription. Les e-mails de commande et de rendez-vous n’entrent jamais dans un parcours.</p>
        {emails.length ? (
          <ul className="liste-simple">
            {emails.map((e) => (
              <li key={e.id}>
                <Link className="liste-simple__ligne" href={atelierHref(`/e-mails/${e.id}`)}>
                  <span className="liste-simple__titre">{e.nom}</span>
                  <span className="t-note">{e.pret ? (e.brouillon ? "Prêt, avec des changements pas encore publiés" : "Prêt") : e.raison}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <NouvelEmail />
      </section>
    </div>
  );
}
