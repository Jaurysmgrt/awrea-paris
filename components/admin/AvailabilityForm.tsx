"use client";
/** Disponibilités des rendez-vous : jours ouverts, heures, délai de prévenance, jours fermés. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export interface AvailabilityValue {
  weekdays: number[];
  start: string;
  end: string;
  stepMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  closed: string[];
}

export function AvailabilityForm({ value }: { value: AvailabilityValue }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [v, setV] = useState(value);
  const [closed, setClosed] = useState(value.closed.join("\n"));
  const [status, setStatus] = useState("");
  return (
    <form
      className="stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        const body = { action: "disponibilites", ...v, closed: closed.split(/\s+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) };
        const res = await fetch(atelier.api("/rendez-vous"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setStatus(j.message ?? j.error ?? "Réglage non enregistré.");
        if (res?.ok) router.refresh();
      }}
    >
      <fieldset className="field">
        <legend className="field__label">Jours ouverts aux rendez-vous</legend>
        <div className="booking__chips">
          {DAYS.map((d, i) => (
            <label key={d} className="check">
              <input type="checkbox" checked={v.weekdays.includes(i)} onChange={(e) => setV({ ...v, weekdays: e.target.checked ? [...v.weekdays, i].sort() : v.weekdays.filter((x) => x !== i) })} />
              <span className="t-note">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="dispo-debut">Premier rendez-vous</label>
          <input id="dispo-debut" type="time" className="field__input" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} required />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="dispo-fin">Fin de journée</label>
          <input id="dispo-fin" type="time" className="field__input" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} required />
        </div>
      </div>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="dispo-pas">Un rendez-vous peut commencer toutes les</label>
          <select id="dispo-pas" className="field__input" value={v.stepMinutes} onChange={(e) => setV({ ...v, stepMinutes: Number(e.target.value) })}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>heures</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="dispo-prevenance">Prévenance (heures)</label>
          <input id="dispo-prevenance" type="number" min={0} max={336} className="field__input" value={v.minNoticeHours} onChange={(e) => setV({ ...v, minNoticeHours: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="dispo-horizon">Réservable jusqu’à (jours)</label>
          <input id="dispo-horizon" type="number" min={1} max={180} className="field__input" value={v.maxDaysAhead} onChange={(e) => setV({ ...v, maxDaysAhead: Number(e.target.value) })} />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="dispo-fermes">Jours fermés (un par ligne, sous la forme 2026-12-24)</label>
        <textarea id="dispo-fermes" className="field__input" rows={4} value={closed} onChange={(e) => setClosed(e.target.value)} />
      </div>
      {status ? <p className="t-note" role="status">{status}</p> : null}
      <div>
        <button type="submit" className="btn">Enregistrer les disponibilités</button>
      </div>
    </form>
  );
}
