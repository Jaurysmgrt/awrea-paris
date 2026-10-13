"use client";
/**
 * Connexion à l'Atelier en deux étapes : mot de passe, puis code de l'application
 * d'authentification. À la première connexion : QR code à scanner, puis codes de secours.
 */
import { useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";

type Step = "password" | "totp" | "enroll" | "recovery";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  return { ok: Boolean(res?.ok), json };
}

export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enroll, setEnroll] = useState<{ svg: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);

  const startEnroll = async () => {
    const res = await fetch("/api/gestion/login/enroll").catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setEnroll(j);
    else setError(j.error ?? "Impossible de préparer la double authentification.");
  };

  if (step === "recovery") {
    return (
      <div className="stack-m admin-login__form">
        <h2 className="t-label">Codes de secours</h2>
        <p className="t-body">
          Notez ces huit codes et rangez-les en lieu sûr (gestionnaire de mots de passe, papier). Chacun permet d’entrer une seule fois si votre téléphone n’est pas à portée de
          main. Ils ne seront plus affichés.
        </p>
        <ul className="recovery-codes">
          {codes.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--solid btn--block" onClick={() => (window.location.href = next)}>
          J’ai noté mes codes — entrer
        </button>
      </div>
    );
  }

  if (step === "enroll") {
    return (
      <form
        className="stack-m admin-login__form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { ok, json } = await post("/api/gestion/login/enroll", { code: new FormData(e.currentTarget).get("code") });
          setBusy(false);
          if (!ok) return setError(json.error ?? "Code incorrect.");
          setCodes(json.recoveryCodes ?? []);
          setStep("recovery");
        }}
      >
        <h2 className="t-label">Double authentification</h2>
        <p className="t-body">
          L’accès à l’Atelier est protégé par un second facteur. Scannez ce code avec une application d’authentification (Apple Mots de passe, Google Authenticator, 1Password…),
          puis saisissez le code à six chiffres qu’elle affiche.
        </p>
        {enroll ? (
          <>
            <div className="totp-qr" role="img" aria-label="QR code de configuration de la double authentification" dangerouslySetInnerHTML={{ __html: enroll.svg }} />
            <p className="t-note">
              Ou saisissez la clé à la main : <code className="totp-secret">{enroll.secret}</code>
            </p>
          </>
        ) : (
          <p className="t-note">Préparation…</p>
        )}
        <div className="field">
          <label htmlFor="enroll-code" className="field__label">
            Code à six chiffres
          </label>
          <input id="enroll-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="field__input" />
        </div>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--solid btn--block" disabled={busy || !enroll}>
          {busy ? "Vérification…" : "Activer et entrer"}
        </button>
      </form>
    );
  }

  if (step === "totp") {
    return (
      <form
        className="stack-m admin-login__form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { ok, json } = await post("/api/gestion/login/totp", { code: new FormData(e.currentTarget).get("code") });
          setBusy(false);
          if (ok) window.location.href = next;
          else {
            setError(json.error ?? "Code incorrect.");
            if (json.error?.startsWith("Session expirée")) setStep("password");
          }
        }}
      >
        <div className="field">
          <label htmlFor="totp" className="field__label">
            Code de l’application d’authentification
          </label>
          <input id="totp" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required className="field__input" autoFocus />
          <p className="field__hint">Six chiffres, ou l’un de vos codes de secours.</p>
        </div>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--solid btn--block" disabled={busy}>
          {busy ? "Vérification…" : "Entrer"}
        </button>
      </form>
    );
  }

  return (
    <form
      className="stack-m admin-login__form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        const { ok, json } = await post("/api/gestion/login", { password: f.get("password"), turnstile: f.get("cf-turnstile-response") || undefined });
        setBusy(false);
        if (!ok) return setError(json.error ?? "Connexion impossible.");
        if (json.step === "enroll") {
          setStep("enroll");
          await startEnroll();
        } else setStep("totp");
      }}
    >
      <div className="field">
        <label htmlFor="pw" className="field__label">
          Mot de passe
        </label>
        <input id="pw" name="password" type="password" required autoComplete="current-password" className="field__input" />
      </div>
      <Turnstile action="atelier" />
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn--solid btn--block" disabled={busy}>
        {busy ? "Connexion…" : "Continuer"}
      </button>
    </form>
  );
}
