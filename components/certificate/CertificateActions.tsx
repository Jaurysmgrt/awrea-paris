"use client";
/**
 * Actions sous le certificat : l'imprimer, et le rattacher à son compte avec le code imprimé sur
 * le certificat papier (pièce offerte, ou achetée avec une autre adresse e-mail). Textes : document
 * « certificat » (clé `actions`), transmis par la page.
 */
import { useState } from "react";
import Link from "@/components/ui/Link";
import type { CertificatTexts } from "./CertificateSheet";

/** Phrase avec un lien au milieu : « … {lien} … ». */
function WithLink({ text, href, label }: { text: string; href: string; label: string }) {
  const [before, after = ""] = text.split("{lien}");
  return (
    <>
      {before}
      <Link href={href} className="text-link">
        {label}
      </Link>
      {after}
    </>
  );
}

export function CertificateActions({ serial, mine, signedIn, t }: { serial: string; mine: boolean; signedIn: boolean; t: CertificatTexts["actions"] }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">(mine ? "ok" : "idle");
  const [error, setError] = useState("");

  return (
    <div className="certificate-actions stack-s">
      <button type="button" className="btn" onClick={() => window.print()}>
        {t.imprimer}
      </button>
      {state === "ok" ? (
        <p className="t-note t-left" role="status">
          <WithLink text={t.votre} href="/compte#certificats" label={t.lienCompte} />
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
              setError(j.error ?? t.erreur);
            }
          }}
        >
          <p className="t-note t-left">{t.offerte}</p>
          <div className="field">
            <label htmlFor="claim-code" className="field__label">
              {t.code}
            </label>
            <input id="claim-code" name="code" className="field__input" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder={t.exemple} />
          </div>
          {state === "error" ? (
            <p className="field__error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn--solid" disabled={state === "busy"}>
            {state === "busy" ? t.verification : t.rattacher}
          </button>
        </form>
      ) : (
        <p className="t-note t-left">
          <WithLink text={t.connexion} href="/compte" label={t.lienConnexion} />
        </p>
      )}
    </div>
  );
}
