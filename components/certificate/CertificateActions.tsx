"use client";
/**
 * Actions sous le certificat : l'imprimer, et le rattacher à son compte avec le code imprimé sur
 * le certificat papier (pièce offerte, ou achetée avec une autre adresse e-mail).
 */
import { useState } from "react";
import Link from "@/components/ui/Link";

export function CertificateActions({ serial, mine, signedIn }: { serial: string; mine: boolean; signedIn: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">(mine ? "ok" : "idle");
  const [error, setError] = useState("");

  return (
    <div className="certificate-actions stack-s">
      <button type="button" className="btn" onClick={() => window.print()}>
        Imprimer le certificat
      </button>
      {state === "ok" ? (
        <p className="t-note t-left" role="status">
          Cette pièce fait partie de votre collection : retrouvez-la dans <Link href="/compte#certificats" className="text-link">votre compte</Link>.
        </p>
      ) : signedIn ? (
        <form
          className="certificate-claim stack-s"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("busy");
            setError("");
            const res = await fetch(`/api/certificats/${serial}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: new FormData(e.currentTarget).get("code") }),
            }).catch(() => null);
            const j = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) setState("ok");
            else {
              setState("error");
              setError(j.error ?? "Le rattachement n’a pas abouti. Merci de réessayer.");
            }
          }}
        >
          <p className="t-note t-left">On vous a offert cette pièce ? Rattachez-la à votre compte avec le code imprimé sur votre certificat.</p>
          <div className="field">
            <label htmlFor="claim-code" className="field__label">
              Code du certificat
            </label>
            <input id="claim-code" name="code" className="field__input" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="XXXX-XXXX" />
          </div>
          {state === "error" ? (
            <p className="field__error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn--solid" disabled={state === "busy"}>
            {state === "busy" ? "Vérification…" : "Rattacher à mon compte"}
          </button>
        </form>
      ) : (
        <p className="t-note t-left">
          Cette pièce vous appartient ? <Link href="/compte" className="text-link">Connectez-vous</Link> pour la rattacher à votre compte.
        </p>
      )}
    </div>
  );
}
