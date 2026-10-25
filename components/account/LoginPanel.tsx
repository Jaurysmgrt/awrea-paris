"use client";
/**
 * Connexion et création de compte : code à usage unique par e-mail (sans mot de passe),
 * ou Google / Apple. La création exige l'acceptation des CGU (case à cocher).
 */
import { useState } from "react";
import { TermsCheckbox } from "./TermsCheckbox";
import { Turnstile } from "@/components/security/Turnstile";
import { accountCopy as t } from "@/content/fr/account";

type Mode = "login" | "signup";

export function LoginPanel({ onSignedIn, demo, notice }: { onSignedIn: () => void; demo: boolean; notice?: string | null }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [token, setToken] = useState<string | null>(null);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode, terms, marketing, turnstile: token ?? undefined }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setError(j.error ?? t.login.failed);
      if (res?.status === 404) setMode("signup");
      return;
    }
    setDemoCode(j.demoCode ?? null);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(j.error ?? t.login.failed);
    onSignedIn();
  }

  const oauth = (provider: "google" | "apple") => {
    if (demo) return setError(t.login.oauthUnavailable);
    if (mode === "signup" && !terms) return setError(t.login.oauthNeedsTerms);
    // navigation complète voulue : la route API redirige vers Google ou Apple
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/account/oauth/${provider}?next=/compte${mode === "signup" ? "&cgu=1" : ""}`;
  };

  if (step === "code") {
    return (
      <form className="account-login stack-m" onSubmit={verify}>
        <p className="t-body" role="status">
          {t.login.codeSent(email)}
        </p>
        {demoCode ? (
          <p className="notice t-note">
            {t.login.demo} <strong className="t-label">{demoCode}</strong>
          </p>
        ) : null}
        <div className="field">
          <label className="field__label" htmlFor="login-code">
            {t.login.code}
          </label>
          <input
            id="login-code"
            name="code"
            className="field__input account-login__code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,8}"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="account-login__actions">
          <button type="submit" className="btn btn--solid" disabled={busy || code.length < 6}>
            {t.login.verify}
          </button>
          <button type="button" className="link link--quiet" onClick={() => requestCode()} disabled={busy}>
            {t.login.resend}
          </button>
          <button
            type="button"
            className="link link--quiet"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
          >
            {t.login.change}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="account-login stack-m">
      <div className="segmented" role="radiogroup" aria-label="Connexion ou création de compte">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className="segmented__item" onClick={() => setMode(m)}>
            {t.login.tabs[m]}
          </button>
        ))}
      </div>
      <p className="t-body">{t.login.intro[mode]}</p>
      <form className="stack-m" onSubmit={requestCode}>
        <div className="field">
          <label className="field__label" htmlFor="login-email">
            {t.login.email}
          </label>
          <input id="login-email" name="email" type="email" required autoComplete="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "signup" ? (
          <div className="stack">
            <TermsCheckbox kind="cgu" checked={terms} onChange={setTerms} />
            <label className="check t-note">
              <input type="checkbox" name="marketing" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{t.login.marketing}</span>
            </label>
          </div>
        ) : null}
        <Turnstile action="login" onToken={setToken} />
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn--solid" disabled={busy}>
            {busy ? t.login.sending : t.login.send}
          </button>
        </div>
      </form>
      <p className="account-login__or t-label" aria-hidden="true">
        {t.login.or}
      </p>
      <div className="account-login__oauth">
        <button type="button" className="btn btn--outline" onClick={() => oauth("google")}>
          {t.login.google}
        </button>
        <button type="button" className="btn btn--outline" onClick={() => oauth("apple")}>
          {t.login.apple}
        </button>
      </div>
      <p className="t-note">{t.login.noAccount}</p>
    </div>
  );
}
