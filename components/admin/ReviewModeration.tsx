"use client";
/** Relecture d'un avis : publier ou refuser, avec une réponse de la créatrice si elle le souhaite. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

export function ReviewModeration({ id, reply = "" }: { id: string; reply?: string }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [text, setText] = useState(reply);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = async (status: "approved" | "rejected") => {
    setBusy(true);
    setError("");
    const res = await fetch(api("/avis"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, reply: text || null }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError("L’avis n’a pas pu être mis à jour.");
  };
  return (
    <div className="stack-s">
      <div className="field">
        <label className="field__label" htmlFor={`reply-${id}`}>
          Votre réponse (facultatif, publiée sous l’avis)
        </label>
        <textarea id={`reply-${id}`} className="field__input" maxLength={600} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="admin-actions">
        <button type="button" className="btn" disabled={busy} onClick={() => act("approved")}>
          Publier
        </button>
        <button type="button" className="btn btn--outline" disabled={busy} onClick={() => act("rejected")}>
          Refuser
        </button>
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
