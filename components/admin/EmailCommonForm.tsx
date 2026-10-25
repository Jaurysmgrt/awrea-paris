"use client";
/** Textes communs à tous les e-mails (devise, pied de page, désinscription) : un formulaire, puis « Publier ». */
import { useState } from "react";
import { guardValue, writingFor } from "@/lib/edition/guard";
import { useAtelier } from "./AtelierContext";

export interface CommonField {
  key: string;
  label: string;
  value: string;
}

export function EmailCommonForm({ fields }: { fields: CommonField[] }) {
  const atelier = useAtelier();
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus("");
        for (const f of fields) {
          if (values[f.key] === f.value) continue;
          const res = await post(atelier.api("/edition/brouillon"), { doc: "email-commun", locale: "fr", path: f.key, value: values[f.key] });
          if (!res?.ok) {
            setBusy(false);
            return setStatus(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? "Le texte n’a pas été enregistré.");
          }
        }
        const res = await post(atelier.api("/edition/publier"), { docs: ["email-commun"] });
        setBusy(false);
        setStatus(res?.ok ? "Publié. Tous les e-mails reprennent ces textes." : "Rien à publier : aucun texte n’a changé.");
      }}
    >
      {fields.map((f) => {
        const blocked = values[f.key] ? guardValue(f.key, undefined, values[f.key]) : null;
        const issues = values[f.key] ? writingFor(f.key, values[f.key]).filter((i) => i.severity === "erreur") : [];
        return (
          <div key={f.key} className="field">
            <label className="field__label" htmlFor={`commun-${f.key}`}>
              {f.label}
            </label>
            <input id={`commun-${f.key}`} className="field__input" value={values[f.key]} maxLength={200} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            {[blocked, ...issues.map((i) => i.message)].filter(Boolean).map((m, i) => (
              <p key={i} className="field__error">
                {m}
              </p>
            ))}
          </div>
        );
      })}
      {status ? (
        <p className="t-note" role="status">
          {status}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Un instant…" : "Enregistrer et publier"}
        </button>
      </div>
    </form>
  );
}
