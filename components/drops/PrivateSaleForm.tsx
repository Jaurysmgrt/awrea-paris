"use client";
/** Vente privée : le mot de passe transmis par la maison ouvre l'accès dans ce navigateur. */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";

export function PrivateSaleForm({ slug }: { slug: string }) {
  const id = useId();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch(`/api/drops/${slug}/acces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (res?.ok) router.refresh();
        else setError(j.error ?? "L’accès n’a pas pu être ouvert. Merci de réessayer.");
      }}
    >
      <div className="field">
        <label htmlFor={`${id}-pw`} className="field__label">
          Mot de passe de la vente privée
        </label>
        <input id={`${id}-pw`} name="password" type="password" required autoComplete="off" className="field__input" />
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={busy}>
          {busy ? "Vérification…" : "Entrer"}
        </button>
      </div>
    </form>
  );
}
