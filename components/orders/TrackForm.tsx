"use client";
/** « Suivre une commande » : numéro et e-mail de la commande, sans compte. Textes du document « suivi-commande ». */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";
import type { SuiviTexts } from "@/components/commerce/OrderStages";

export function TrackForm({ t }: { t: SuiviTexts["formulaire"] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  return (
    <form
      className="stack-m track-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState("loading");
        const res = await fetch("/api/suivi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: f.get("number"), email: f.get("email"), turnstile: f.get("cf-turnstile-response") || undefined }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        if (!res?.ok) {
          setState("error");
          setError(j.error ?? t.erreur);
          return;
        }
        router.push(j.link);
      }}
    >
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="track-number">
            {t.numero}
          </label>
          <input className="field__input" id="track-number" name="number" required placeholder={t.exempleNumero} autoComplete="off" autoCapitalize="characters" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="track-email">
            {t.email}
          </label>
          <input className="field__input" id="track-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <Turnstile action="suivi" />
      {state === "error" ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={state === "loading"}>
          {state === "loading" ? t.envoi : t.envoyer}
        </button>
      </div>
    </form>
  );
}
