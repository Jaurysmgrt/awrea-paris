"use client";
/** Date de fabrication et mot de la créatrice d'un certificat (Atelier). */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CertificateEditor({ serial, madeOn, note, defaultWord }: { serial: string; madeOn: string; note: string; defaultWord: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  return (
    <form
      className="stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        const f = new FormData(e.currentTarget);
        const res = await fetch(`/api/gestion/certificats/${serial}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ madeOn: f.get("madeOn"), note: f.get("note") }),
        }).catch(() => null);
        setState(res?.ok ? "ok" : "error");
        if (res?.ok) router.refresh();
      }}
    >
      <div className="field">
        <label htmlFor="cert-made" className="field__label">
          Façonnée le
        </label>
        <input id="cert-made" name="madeOn" type="date" className="field__input" defaultValue={madeOn} required />
      </div>
      <div className="field">
        <label htmlFor="cert-note" className="field__label">
          Mot de la créatrice (facultatif)
        </label>
        <textarea id="cert-note" name="note" className="field__input" maxLength={240} defaultValue={note} placeholder={defaultWord} />
        <p className="field__hint">Laissé vide, le certificat porte votre phrase : « {defaultWord} »</p>
      </div>
      <div>
        <button type="submit" className="btn" disabled={state === "busy"}>
          {state === "busy" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <p className="t-note" role="status">
        {state === "ok" ? "C’est enregistré." : state === "error" ? "L’enregistrement n’a pas abouti. Merci de réessayer." : ""}
      </p>
    </form>
  );
}
