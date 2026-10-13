"use client";
/** Inscription à l'accès anticipé d'un drop (lien personnel envoyé par e-mail). */
import { useId, useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";

export function DropSignupForm({ slug }: { slug: string }) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  if (status === "done") {
    return (
      <p className="t-lead" role="status">
        {message}
      </p>
    );
  }
  return (
    <form
      className="stack-m drop-signup"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setStatus("loading");
        const res = await fetch(`/api/drops/${slug}/inscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: f.get("email"), turnstile: f.get("cf-turnstile-response") || undefined }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setStatus(res?.ok ? "done" : "error");
        setMessage(res?.ok ? j.message : (j.error ?? "L’inscription n’a pas abouti. Merci de réessayer."));
      }}
    >
      <div className="field">
        <label htmlFor={`${id}-email`} className="field__label">
          Adresse e-mail
        </label>
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" className="field__input" />
      </div>
      <Turnstile action="drop" />
      {status === "error" ? (
        <p className="field__error" role="alert">
          {message}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={status === "loading"}>
          {status === "loading" ? "Envoi…" : "Réserver mon accès anticipé"}
        </button>
      </div>
    </form>
  );
}
