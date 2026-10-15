"use client";
/**
 * Prise de rendez-vous : le rendez-vous, le jour, l'heure, puis vous. Les jours et les heures
 * viennent de l'agenda de l'atelier (heure de Paris) ; un moment réservé n'est jamais donné deux fois.
 */
import { useEffect, useId, useState } from "react";
import { fill } from "@/lib/edition/fill";
import { Turnstile } from "@/components/security/Turnstile";

type TypeId = "essayage" | "visio" | "sur-mesure";

export interface BookingTexts {
  types: Record<TypeId, { titre: string; texte: string; duree: string }>;
  etapes: { type: string; jour: string; heure: string; vous: string };
  aucunJour: string;
  chargement: string;
  champs: { nom: string; email: string; telephone: string; message: string; accord: string };
  bouton: string;
  envoi: string;
  confirme: { titre: string; texte: string };
  erreur: string;
}

const dayLabel = (day: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));
const hourLabel = (t: string) => t.replace(":", " h ");

export function BookingForm({ t, initialType }: { t: BookingTexts; initialType?: TypeId }) {
  const id = useId();
  const [type, setType] = useState<TypeId | null>(initialType ?? null);
  const [days, setDays] = useState<string[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // relu après un moment pris entre-temps par une autre cliente
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!type) return;
    let live = true;
    void fetch(`/api/rendez-vous?type=${type}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => live && setDays(j.days ?? []))
      .catch(() => live && setDays([]));
    return () => {
      live = false;
    };
  }, [type]);

  useEffect(() => {
    if (!type || !day) return;
    let live = true;
    void fetch(`/api/rendez-vous?type=${type}&jour=${day}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => live && setSlots(j.slots ?? []))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [type, day, round]);

  if (state === "done")
    return (
      <div className="stack-m" role="status">
        <h2 className="t-h2">{t.confirme.titre}</h2>
        <p className="t-lead">{message}</p>
      </div>
    );

  return (
    <form
      className="form stack-l"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!type || !day || !time) return;
        const f = Object.fromEntries(new FormData(e.currentTarget).entries());
        setState("loading");
        const res = await fetch("/api/rendez-vous", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, day, time, name: f.name, email: f.email, phone: f.phone || undefined, message: f.message || undefined, consent: f.consent === "on", turnstile: f["cf-turnstile-response"] || undefined }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        if (!res?.ok) {
          setState("error");
          setMessage(j.error ?? t.erreur);
          if (res?.status === 409) {
            setTime(null);
            setSlots(null);
            setRound((n) => n + 1);
          }
          return;
        }
        setState("done");
        setMessage(fill(t.confirme.texte, { rendezvous: j.rendezvous, quand: j.quand, email: String(f.email) }));
      }}
    >
      <fieldset className="stack-s">
        <legend className="field__label">{t.etapes.type}</legend>
        <div className="booking__types">
          {(Object.keys(t.types) as TypeId[]).map((k) => (
            <label key={k} className="booking__type check">
              <input
                type="radio"
                name="type"
                value={k}
                checked={type === k}
                onChange={() => {
                  setType(k);
                  setDays(null);
                  setDay(null);
                  setSlots(null);
                  setTime(null);
                }}
              />
              <span className="stack-s">
                <span className="t-h4">{t.types[k].titre}</span>
                <span className="t-note t-left">{t.types[k].texte}</span>
                <span className="t-label t-soft">{t.types[k].duree}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {type ? (
        <fieldset className="stack-s">
          <legend className="field__label">{t.etapes.jour}</legend>
          {days === null ? (
            <p className="t-note">{t.chargement}</p>
          ) : days.length ? (
            <div className="booking__chips" role="group">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip"
                  aria-pressed={day === d}
                  onClick={() => {
                    setDay(d);
                    setSlots(null);
                    setTime(null);
                  }}
                >
                  {dayLabel(d)}
                </button>
              ))}
            </div>
          ) : (
            <p className="t-note">{t.aucunJour}</p>
          )}
        </fieldset>
      ) : null}

      {day ? (
        <fieldset className="stack-s">
          <legend className="field__label">{t.etapes.heure}</legend>
          {slots === null ? (
            <p className="t-note">{t.chargement}</p>
          ) : (
            <div className="booking__chips" role="group">
              {slots.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={time === s} onClick={() => setTime(s)}>
                  {hourLabel(s)}
                </button>
              ))}
            </div>
          )}
        </fieldset>
      ) : null}

      {time ? (
        <fieldset className="stack-m">
          <legend className="field__label">{t.etapes.vous}</legend>
          <div className="form__row">
            <div className="field">
              <label className="field__label" htmlFor={`${id}-name`}>
                {t.champs.nom}
              </label>
              <input className="field__input" id={`${id}-name`} name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${id}-email`}>
                {t.champs.email}
              </label>
              <input className="field__input" id={`${id}-email`} name="email" type="email" required autoComplete="email" />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-phone`}>
              {t.champs.telephone}
            </label>
            <input className="field__input" id={`${id}-phone`} name="phone" type="tel" maxLength={30} autoComplete="tel" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-message`}>
              {t.champs.message}
            </label>
            <textarea className="field__input" id={`${id}-message`} name="message" maxLength={1000} rows={3} />
          </div>
          <label className="check">
            <input type="checkbox" name="consent" required />
            <span className="t-note t-left">{t.champs.accord}</span>
          </label>
          <Turnstile action="rendez-vous" />
          {state === "error" ? (
            <p className="field__error" role="alert">
              {message}
            </p>
          ) : null}
          <div>
            <button type="submit" className="btn btn--solid" disabled={state === "loading"}>
              {state === "loading" ? t.envoi : t.bouton}
            </button>
          </div>
        </fieldset>
      ) : null}
    </form>
  );
}
