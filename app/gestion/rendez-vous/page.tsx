import { APPOINTMENT_TYPES, agendaToken, getAvailability } from "@/lib/appointments";
import { upcomingAppointments, whenOf } from "@/lib/appointments-notify";
import { atelierApi } from "@/lib/admin/path";
import { siteUrl } from "@/lib/seo/metadata";
import { ActionButton } from "@/components/admin/ActionButton";
import { CopyButton } from "@/components/admin/CopyButton";
import { AvailabilityForm } from "@/components/admin/AvailabilityForm";

/** Agenda de l'atelier : rendez-vous à venir, disponibilités, abonnement de l'agenda personnel. */
export default async function RendezVousAtelier() {
  const [upcoming, availability] = await Promise.all([upcomingAppointments(), getAvailability()]);
  const feed = `${siteUrl}/api/rendez-vous/agenda?jeton=${agendaToken()}`;
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Rendez-vous</h1>
        <p className="t-lead">Les clientes réservent elles-mêmes sur la page Rendez-vous, dans les moments que vous ouvrez ici. Chacune reçoit une confirmation, puis un rappel la veille.</p>
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
                {upcoming.map((a) => (
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
                    </td>
                    <td>
                      {a.name}
                      <br />
                      <span className="t-soft">{[a.email, a.phone].filter(Boolean).join(" · ")}</span>
                      {a.message ? <><br /><span className="t-note">{a.message}</span></> : null}
                    </td>
                    <td>
                      <ActionButton endpoint={atelierApi("/rendez-vous")} body={{ action: "annuler", id: a.id }} label="Annuler" variant="quiet" confirm={`Annuler le rendez-vous de ${a.name} ? Elle reçoit un e-mail pour en choisir un autre.`} />
                    </td>
                  </tr>
                ))}
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

      <section className="panel stack" aria-labelledby="agenda">
        <h2 id="agenda" className="t-h3">Dans votre agenda</h2>
        <p className="t-note">Ajoutez cette adresse à votre agenda (Google : « Ajouter un agenda à partir d’une URL » ; Apple : « Nouvel abonnement ») pour y voir chaque rendez-vous. Gardez-la pour vous : elle donne accès aux noms des clientes.</p>
        <CopyButton text={feed} label="Copier l’adresse de l’agenda" />
        <p className="t-note">Pour que les moments déjà pris dans votre agenda ne soient pas proposés, son adresse secrète iCal se renseigne dans CALENDAR_ICS_URL (ACTIVATION.md).</p>
      </section>
    </div>
  );
}
