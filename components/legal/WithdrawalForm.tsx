"use client";
/**
 * Fonction de rétractation en ligne (Code de la consommation, directive 2011/83/UE modifiée) :
 * deux étapes — « Se rétracter du contrat ici », puis « Confirmer la rétractation » —
 * et un accusé de réception immédiat, par e-mail, avec la date et l'heure de la demande.
 */
import { useId, useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";

type Draft = { name: string; email: string; order: string; pieces: string; receivedAt: string };

export function WithdrawalForm() {
  const id = useId();
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [draft, setDraft] = useState<Draft>({ name: "", email: "", order: "", pieces: "", receivedAt: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<{ reference: string; at: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  if (step === "done" && ack) {
    return (
      <div className="legal__box" role="status">
        <p className="t-label">Rétractation enregistrée</p>
        <p>
          Votre demande de rétractation a bien été reçue le {new Date(ack.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })} (référence {ack.reference}). Un
          accusé de réception vient de vous être envoyé par e-mail ; l’atelier vous adresse ensuite l’étiquette de retour.
        </p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="stack-m withdrawal">
        <p className="t-body">Vérifiez votre demande avant de la confirmer :</p>
        <dl className="withdrawal__summary">
          <div>
            <dt className="t-label">Nom</dt>
            <dd>{draft.name}</dd>
          </div>
          <div>
            <dt className="t-label">E-mail</dt>
            <dd>{draft.email}</dd>
          </div>
          <div>
            <dt className="t-label">Commande</dt>
            <dd>{draft.order}</dd>
          </div>
          {draft.pieces ? (
            <div>
              <dt className="t-label">Pièces concernées</dt>
              <dd>{draft.pieces}</dd>
            </div>
          ) : null}
          {draft.receivedAt ? (
            <div>
              <dt className="t-label">Reçue le</dt>
              <dd>{new Date(draft.receivedAt).toLocaleDateString("fr-FR")}</dd>
            </div>
          ) : null}
        </dl>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="account__actions">
          <button
            type="button"
            className="btn btn--solid"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const res = await fetch("/api/retractation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...draft, turnstile: token ?? undefined }),
              }).catch(() => null);
              const j = res ? await res.json().catch(() => ({})) : {};
              setBusy(false);
              if (!res?.ok) return setError(j.error ?? "La demande n’a pas pu être enregistrée. Écrivez-nous par e-mail.");
              setAck({ reference: j.reference, at: j.at });
              setStep("done");
            }}
          >
            Confirmer la rétractation
          </button>
          <button type="button" className="link link--quiet" onClick={() => setStep("form")}>
            Modifier
          </button>
        </div>
      </div>
    );
  }

  const field = (k: keyof Draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label className="field__label" htmlFor={`${id}-${k}`}>
        {label}
      </label>
      <input id={`${id}-${k}`} className="field__input" value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} {...props} />
    </div>
  );

  return (
    <form
      className="form stack-m withdrawal"
      onSubmit={(e) => {
        e.preventDefault();
        setStep("confirm");
      }}
    >
      <div className="form__row">
        {field("name", "Nom et prénom", { required: true, autoComplete: "name", maxLength: 120 })}
        {field("email", "E-mail (pour l’accusé de réception)", { required: true, type: "email", autoComplete: "email", maxLength: 200 })}
      </div>
      <div className="form__row">
        {field("order", "Numéro de commande", { required: true, placeholder: "AW-1031", maxLength: 40 })}
        {field("receivedAt", "Date de réception (facultatif)", { type: "date" })}
      </div>
      {field("pieces", "Pièces concernées (facultatif : toutes par défaut)", { maxLength: 300 })}
      <Turnstile action="retractation" onToken={setToken} />
      <div>
        <button type="submit" className="btn btn--solid">
          Se rétracter du contrat ici
        </button>
      </div>
    </form>
  );
}
