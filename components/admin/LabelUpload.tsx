"use client";
/** Déposer l'étiquette prépayée d'un retour (PDF) : elle part aussitôt à la cliente. */
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAtelier } from "./AtelierContext";

export function LabelUpload({ id }: { id: string }) {
  const { api } = useAtelier();
  const router = useRouter();
  const input = useId();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  return (
    <form
      className="stack-s"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("loading");
        const res = await fetch(api(`/retours/${encodeURIComponent(id)}/etiquette`), { method: "POST", body: new FormData(e.currentTarget) }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setState(res?.ok ? "idle" : "error");
        setMessage(j.message ?? j.error ?? "");
        if (res?.ok) router.refresh();
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor={input}>
          Étiquette prépayée (PDF)
        </label>
        <input id={input} name="etiquette" type="file" accept="application/pdf" required className="field__input" />
      </div>
      <div>
        <button type="submit" className="btn" disabled={state === "loading"}>
          {state === "loading" ? "Envoi…" : "Envoyer à la cliente"}
        </button>
      </div>
      {message ? (
        <p className={state === "error" ? "field__error" : "t-note"} role={state === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
