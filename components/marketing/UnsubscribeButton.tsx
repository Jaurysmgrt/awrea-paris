"use client";
/** Confirmation de la désinscription : un bouton, puis le message de la Maison. */
import { useState } from "react";

interface Texts {
  bouton: string;
  attente: string;
  fait: { titre: string; texte: string };
  erreur: string;
}

export function UnsubscribeButton({ token, t }: { token: string; t: Texts }) {
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
            const res = await fetch(`/api/newsletter/desinscription?jeton=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => null);
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
