import { APPOINTMENT_TYPES, agendaToken, getAvailability } from "@/lib/appointments";
import { upcomingAppointments, whenOf } from "@/lib/appointments-notify";
import { atelierApi } from "@/lib/admin/path";
import { siteUrl } from "@/lib/seo/metadata";
import { ActionButton } from "@/components/admin/ActionButton";
import { CopyButton } from "@/components/admin/CopyButton";
import { AvailabilityForm } from "@/components/admin/AvailabilityForm";
import { ConnecterGoogleAgenda } from "@/components/admin/GoogleAgenda";
import { adresseRetour, etatRendezVous, vueGoogle } from "@/lib/google-agenda";
import { LIBELLES_ETAT, type EtatSynchro } from "@/lib/google-agenda/regles";

/** pastilles d'état de Google Agenda : fait (plein), en attente (gris), à refaire (filet) */
const PASTILLE: Record<EtatSynchro, string> = { synchronise: "status status--done", "en-attente": "status status--pending", "a-refaire": "status" };

const jour = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

/** Agenda de l'atelier : rendez-vous à venir, disponibilités, Google Agenda, abonnement de l'agenda personnel. */
export default async function RendezVousAtelier({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const [upcoming, availability, google, { google: retour }] = await Promise.all([upcomingAppointments(), getAvailability(), vueGoogle(), searchParams]);
  const feed = `${siteUrl}/api/rendez-vous/agenda?jeton=${agendaToken()}`;
  const api = atelierApi("/agenda-google");
  // pastilles par rendez-vous dès qu'une connexion existe (même à refaire)
  const suivi = google.etat === "connecte" || google.etat === "a-reconnecter";
  const attente = google.enAttente + google.aRefaire;
  const global: EtatSynchro = google.aRefaire ? "a-refaire" : google.enAttente ? "en-attente" : "synchronise";
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Rendez-vous</h1>
        <p className="t-lead">Les moments que vous ouvrez ici, les clientes les réservent sur le site.</p>
      </header>

      <section className="panel stack" aria-labelledby="a-venir">
        <h2 id="a-venir" className="t-h3">À venir</h2>
        {upcoming.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Quand</th>
                  <th scope="col">Rendez-vous</th>
                  <th scope="col">Cliente</th>
                  <th scope="col"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => {
                  const etat = suivi ? etatRendezVous(a) : null;
                  return (
                  <tr key={a.id}>
                    <th scope="row">{whenOf(a.start)}</th>
                    <td>
                      {APPOINTMENT_TYPES[a.type].label}
                      {a.videoUrl ? (
                        <>
                          {" · "}
                          <a className="link" href={a.videoUrl} target="_blank" rel="noopener noreferrer">appel vidéo</a>
                        </>
                      ) : null}
                      {etat ? (
                        <>
                          <br />
                          <span className={PASTILLE[etat]} title="Google Agenda">{LIBELLES_ETAT[etat]}</span>
                          {etat === "a-refaire" && a.google?.erreur ? <span className="t-note"> {a.google.erreur}</span> : null}
                        </>
                      ) : null}
                    </td>
                    <td>
                      {a.name}
                      <br />
                      <span className="t-soft">{[a.email, a.phone].filter(Boolean).join(" · ")}</span>
                      {a.message ? <><br /><span className="t-note">{a.message}</span></> : null}
                    </td>
                    <td>
                      <ActionButton endpoint={atelierApi("/rendez-vous")} body={{ action: "annuler", id: a.id }} label="Annuler" variant="quiet" confirm={`Annuler le rendez-vous de ${a.name} ? Elle reçoit un e-mail pour en choisir un autre.`} />
                      {etat === "a-refaire" && google.etat === "connecte" ? <ActionButton endpoint={api} body={{ action: "reessayer", id: a.id }} label="Réessayer" variant="quiet" /> : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">Aucun rendez-vous à venir.</p>
        )}
      </section>

      <section className="panel stack" aria-labelledby="dispos">
        <h2 id="dispos" className="t-h3">Disponibilités</h2>
        <AvailabilityForm value={availability} />
      </section>

      <section className="panel stack" aria-labelledby="google">
        <h2 id="google" className="t-h3">Google Agenda</h2>
        {retour === "connecte" && google.etat === "connecte" ? (
          <p className="t-note" role="status">
            Google Agenda est connecté. Vos rendez-vous à venir y sont ajoutés.
          </p>
        ) : null}
        {google.etat === "non-branche" ? (
          <p className="t-note">
            La connexion à Google Agenda n’est pas encore branchée. Le guide d’activation explique comment la brancher, à l’étape Google Agenda. En attendant, l’adresse de la rubrique suivante montre vos rendez-vous dans votre agenda.
          </p>
        ) : google.etat === "deconnecte" ? (
          <>
            <p className="t-note">Chaque rendez-vous confirmé s’ajoute à votre agenda Google, et s’en retire s’il est annulé. Google vous demande votre accord ; votre mot de passe Google ne passe jamais par ce site.</p>
            <div className="admin-actions">
              <ConnecterGoogleAgenda label="Connecter Google Agenda" />
            </div>
          </>
        ) : google.etat === "a-reconnecter" ? (
          <>
            <p>
              <span className="status">À reconnecter</span>
            </p>
            <p className="t-note">{google.erreur ?? "Google a retiré l’accès de ce site, ou il a expiré."} Les rendez-vous attendent et partiront dès la reconnexion.</p>
            <div className="admin-actions">
              <ConnecterGoogleAgenda label="Reconnecter Google Agenda" />
              <ActionButton endpoint={api} body={{ action: "deconnecter" }} label="Déconnecter" variant="outline" confirm="Déconnecter Google Agenda ? Les rendez-vous déjà ajoutés restent dans votre agenda." />
            </div>
          </>
        ) : (
          <>
            <p>
              <span className={PASTILLE[global]}>{LIBELLES_ETAT[global]}</span>
              {attente ? <span className="t-note"> {attente} rendez-vous {google.aRefaire ? "à refaire" : "en attente"}</span> : null}
            </p>
            <p className="t-note">
              Connecté à {google.calendrier ?? "votre agenda Google"}
              {google.le ? ` depuis le ${jour(google.le)}` : ""}. Les moments déjà pris dans cet agenda ne sont plus proposés aux clientes.
            </p>
            {google.fuseau && google.fuseau !== "Europe/Paris" ? <p className="t-note">Votre agenda Google est réglé sur un autre fuseau ({google.fuseau}) : les rendez-vous y gardent l’heure de Paris.</p> : null}
            {google.aRefaire ? <p className="t-note">Un nouvel essai part chaque matin, ou tout de suite avec Réessayer.</p> : null}
            <div className="admin-actions">
              {attente ? <ActionButton endpoint={api} body={{ action: "reessayer" }} label="Réessayer" /> : null}
              <ActionButton endpoint={api} body={{ action: "deconnecter" }} label="Déconnecter" variant="outline" confirm="Déconnecter Google Agenda ? Les rendez-vous déjà ajoutés restent dans votre agenda, les suivants n’y seront plus ajoutés." />
            </div>
          </>
        )}
        {google.etat === "non-branche" || google.etat === "deconnecte" ? (
          <p className="t-note">
            Adresse de retour à déclarer chez Google : <code className="lien-prive">{adresseRetour()}</code>
          </p>
        ) : null}
      </section>

      <section className="panel stack" aria-labelledby="agenda">
        <h2 id="agenda" className="t-h3">Dans votre agenda</h2>
        <p className="t-note">Ajoutez cette adresse à votre agenda pour y voir chaque rendez-vous. Gardez-la pour vous.</p>
        <CopyButton text={feed} label="Copier l’adresse de l’agenda" />
      </section>
    </div>
  );
}
