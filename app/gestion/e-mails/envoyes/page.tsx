import { kv } from "@/lib/store";
import { emailIds } from "@/lib/email/documents";
import { EmailsTabs } from "@/components/admin/EmailsTabs";
import { When } from "@/components/admin/Status";

type Parti = { id: string; to: string; subject: string; text?: string; tag?: string; date: string; delivered: boolean };

/** Noms des e-mails qui ne sont pas des documents de l'éditeur (alertes, rapports, gestes des agents). */
const TYPES: Record<string, string> = {
  alerte: "Alerte à l’atelier",
  rapport: "Rapport de la semaine",
  remboursement: "Remboursement",
  "message-cliente": "Message à une cliente",
  "retard-confection": "Retard de confection",
  "relance-retour": "Rappel d’un retour",
  "relance-sur-mesure": "Accusé de sur mesure",
  "relance-cercle": "Bienvenue dans le Cercle",
  lettre: "La lettre",
  "lettre-essai": "Essai de la lettre",
  newsletter: "La lettre",
  "rappel-rendez-vous": "Rappel de rendez-vous",
};

/**
 * E-mails › Envoyés : les 300 derniers e-mails partis du site (boîte d'envoi, lib/email/send.ts),
 * les plus récents en premier. Sans service d'envoi configuré, ils sont seulement conservés ici.
 */
export default async function EnvoyesPage() {
  const [partis, docs] = await Promise.all([kv.list<Parti>("email:outbox", 300), emailIds()]);
  const noms = Object.fromEntries(docs.map((d) => [d.id, d.label]));
  const liste = [...partis].sort((a, b) => b.date.localeCompare(a.date));
  const simulation = liste.length > 0 && liste.every((m) => !m.delivered);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">E-mails</h1>
        <EmailsTabs actif="/e-mails/envoyes" />
      </header>
      <section className="panel" aria-labelledby="envoyes-titre">
        <h2 id="envoyes-titre" className="t-h3">
          Derniers e-mails partis
        </h2>
        {simulation ? <p className="t-note">Aucun service d’envoi n’est encore branché (RESEND_API_KEY) : les e-mails sont gardés ici, sans partir.</p> : null}
        {liste.length ? (
          <ul className="envoyes">
            {liste.map((m, i) => (
              <li key={`${m.id}-${i}`} className="envoye">
                <details>
                  <summary>
                    <span className="t-label t-soft">
                      <When iso={m.date} /> · {(m.tag && (noms[m.tag] ?? TYPES[m.tag])) || "E-mail"}
                    </span>
                    <span className="t-body t-left">{m.subject}</span>
                    <span className="t-note t-left">À {m.to}</span>
                  </summary>
                  {m.text ? <pre className="envoye__texte">{m.text}</pre> : null}
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucun e-mail n’est encore parti.</p>
        )}
      </section>
    </div>
  );
}
