"use client";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack-m admin-login__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const password = new FormData(e.currentTarget).get("password");
        const res = await fetch("/api/gestion/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
        const j = await res.json().catch(() => ({}));
        setBusy(false);
        if (res.ok) window.location.href = next;
        else setError(j.error ?? "Connexion impossible.");
      }}
    >
      <div className="field">
        <label htmlFor="pw" className="field__label">
          Mot de passe
        </label>
        <input id="pw" name="password" type="password" required autoComplete="current-password" className="field__input" />
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
        {busy ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}
