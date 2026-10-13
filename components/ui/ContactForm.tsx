"use client";
import { useId, useState } from "react";
import { contact } from "@/content/fr/pages";
import { Turnstile } from "@/components/security/Turnstile";

/** Formulaire de contact ou de prise de rendez-vous (essayage, sur mesure, retouche). */
export function ContactForm({ kind }: { kind: "contact" | "rendez-vous" }) {
  const id = useId();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState("loading");
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, kind, turnstile: f["cf-turnstile-response"] || undefined }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setState(res?.ok ? "done" : "error");
    setMsg(j.message ?? j.error ?? "Le message n’a pas pu être envoyé.");
  }

  if (state === "done") {
    return (
      <p className="t-lead" role="status">
        {msg}
      </p>
    );
  }

  return (
    <form className="form stack-m" onSubmit={onSubmit}>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-name`}>
            Nom
          </label>
          <input className="field__input" id={`${id}-name`} name="name" required autoComplete="name" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-email`}>
            E-mail
          </label>
          <input className="field__input" id={`${id}-email`} name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      {kind === "contact" ? (
        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor={`${id}-subject`}>
              Sujet
            </label>
            <select className="field__input" id={`${id}-subject`} name="subject" defaultValue="piece">
              {contact.subjects.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-order`}>
              N° de commande (facultatif)
            </label>
            <input className="field__input" id={`${id}-order`} name="orderNumber" placeholder="AW-1042" />
          </div>
        </div>
      ) : (
        <>
          <fieldset className="field">
            <legend className="field__label">Objet du rendez-vous</legend>
            <div className="form__choices">
              {contact.appointmentTypes.map((t, i) => (
                <label key={t.value} className="check">
                  <input type="radio" name="appointmentType" value={t.value} defaultChecked={i === 0} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form__row">
            <div className="field">
              <label className="field__label" htmlFor={`${id}-date`}>
                Date souhaitée
              </label>
              <input className="field__input" id={`${id}-date`} name="preferredDate" type="date" min={today} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${id}-slot`}>
                Moment préféré
              </label>
              <select className="field__input" id={`${id}-slot`} name="slot" defaultValue="apres-midi">
                <option value="matin">Matin</option>
                <option value="apres-midi">Après-midi</option>
                <option value="fin-de-journee">Fin de journée</option>
              </select>
            </div>
          </div>
        </>
      )}
      <div className="field">
        <label className="field__label" htmlFor={`${id}-message`}>
          {kind === "contact" ? "Votre message" : "Pièces à essayer, mesures, idées…"}
        </label>
        <textarea className="field__input" id={`${id}-message`} name="message" required minLength={2} />
      </div>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Ne pas remplir</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="t-note">Vos informations servent uniquement à vous répondre. Voir notre politique de confidentialité.</p>
      <Turnstile action={kind} />
      {state === "error" ? (
        <p className="field__error" role="alert">
          {msg}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={state === "loading"}>
          {state === "loading" ? "Envoi…" : kind === "contact" ? "Envoyer" : "Demander un rendez-vous"}
        </button>
      </div>
    </form>
  );
}
