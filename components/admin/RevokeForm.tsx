"use client";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export function RevokeForm({ token }: { token: string }) {
  const { api } = useAtelier();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  if (state === "done") {
    return (
      <p className="t-body t-center" role="status">
        Toutes les sessions sont fermées et le compte est remis à zéro. Changez maintenant le mot de passe d’installation (ATELIER_PASSWORD) dans Vercel.
      </p>
    );
  }
  return (
    <div className="stack-m admin-login__form">
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--block"
        disabled={state === "busy" || !token}
        onClick={async () => {
          setState("busy");
          setError("");
          const res = await fetch(api("/login/revoquer"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token }) }).catch(() => null);
          const json = res ? await res.json().catch(() => ({})) : {};
          if (res?.ok) setState("done");
          else {
            setState("idle");
            setError(json.error ?? "La demande n’a pas abouti. Réessayez dans un instant.");
          }
        }}
      >
        {state === "busy" ? "Fermeture…" : "Fermer toutes les sessions"}
      </button>
    </div>
  );
}
