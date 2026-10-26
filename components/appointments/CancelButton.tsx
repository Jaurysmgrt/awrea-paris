"use client";
/** Annulation d'un rendez-vous par la cliente : un bouton, puis le mot de l'atelier. */
import { useState } from "react";

export function CancelButton({ id, jeton, t }: { id: string; jeton: string; t: { bouton: string; attente: string; fait: { titre: string; texte: string }; erreur: string } }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done")
    return (
      <div className="stack" role="status">
        <h2 className="t-h3">{t.fait.titre}</h2>
        <p className="t-body">{t.fait.texte}</p>
      </div>
    );
  return (
    <div className="stack">
      <div>
        <button
          type="button"
          className="btn btn--solid"
          disabled={state === "busy"}
          onClick={async () => {
            setState("busy");
            const res = await fetch("/api/rendez-vous/annuler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, jeton }) }).catch(() => null);
            setState(res?.ok ? "done" : "error");
          }}
        >
          {state === "busy" ? t.attente : t.bouton}
        </button>
      </div>
      {state === "error" ? (
        <p className="t-note" role="alert">
          {t.erreur}
        </p>
      ) : null}
    </div>
  );
}
