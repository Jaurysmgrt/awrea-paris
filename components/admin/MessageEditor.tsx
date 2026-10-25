"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export function MessageEditor({ id, subject, draft }: { id: string; subject: string; draft: string }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [s, setS] = useState(subject);
  const [body, setBody] = useState(draft);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const post = async (payload: object) => {
    setState("busy");
    const res = await fetch(api(`/messages/${id}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setState(res.ok ? "idle" : "error");
    if (res.ok) router.refresh();
  };
  return (
    <div className="stack">
      <div className="field">
        <label className="field__label" htmlFor={`s-${id}`}>Objet</label>
        <input id={`s-${id}`} className="field__input" value={s} onChange={(e) => setS(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`b-${id}`}>Réponse (brouillon de l’agent, à ajuster)</label>
        <textarea id={`b-${id}`} className="field__input message__draft" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="proposal__actions">
        <button type="button" className="btn" disabled={state === "busy" || body.trim().length < 2} onClick={() => post({ action: "send", subject: s, body })}>
          Envoyer la réponse
        </button>
        <button type="button" className="btn btn--outline" disabled={state === "busy"} onClick={() => post({ action: "close" })}>
          Classer sans répondre
        </button>
      </div>
      {state === "error" ? <p className="field__error" role="alert">L’envoi a échoué.</p> : null}
    </div>
  );
}
