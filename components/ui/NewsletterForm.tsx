"use client";
import { useId, useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";
import { track } from "@/lib/analytics/track";

/** Inscription aux lettres de l'atelier (double consentement géré côté serveur / Shopify). */
export function NewsletterForm({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), consent: form.get("consent") === "on", source, turnstile: form.get("cf-turnstile-response") || undefined }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      track({ name: "newsletter" });
      setStatus("done");
      setMessage(json.message ?? "Merci. Votre première lettre arrivera avec la prochaine saison.");
    } else {
      setStatus("error");
      setMessage(json.error ?? "Votre inscription n’a pas pu être enregistrée. Merci de réessayer.");
    }
  }

  if (status === "done") {
    return (
      <p className="t-lead" role="status">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`newsletter ${compact ? "newsletter--compact" : ""}`} noValidate={false}>
      <div className="newsletter__row">
        <div className="field newsletter__field">
          <label htmlFor={`${id}-email`} className="field__label">
            Adresse e-mail
          </label>
          <input id={`${id}-email`} name="email" type="email" required autoComplete="email" className="field__input" placeholder="vous@exemple.fr" />
        </div>
        <button type="submit" className="btn" disabled={status === "loading"}>
          {status === "loading" ? "Envoi…" : "S’inscrire"}
        </button>
      </div>
      <label className="check t-note">
        <input type="checkbox" name="consent" required />
        <span>J’accepte de recevoir les lettres d’Awrea Paris. Désinscription en un clic à tout moment.</span>
      </label>
      <Turnstile action="newsletter" />
      {status === "error" ? (
        <p className="field__error" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
