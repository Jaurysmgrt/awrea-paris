"use client";
/**
 * Inscription à l'avant-première d'une collection : l'adresse reçoit un lien personnel qui ouvre
 * l'avant-première dans le navigateur. Champ souligné d'un filet, bouton noir en pilule sur toute
 * la largeur (langage des maquettes). Textes transmis par la page (avant-premieres.json) ; le
 * serveur revérifie tout : contrôle d'origine, limitation de débit, Turnstile, schéma Zod.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";
import s from "./avant-premieres.module.css";

type Erreur = "email" | "verification" | "limite" | "close" | "generale";
export type SignupTexts = { champ: string; bouton: string; envoi: string; merci: string; mention: string; erreurs: Record<Erreur, string> };

const CODES: Erreur[] = ["email", "verification", "limite", "close", "generale"];
const erreurDe = (status: number, code: unknown): Erreur => (status === 429 ? "limite" : CODES.includes(code as Erreur) ? (code as Erreur) : "generale");

export function DropSignupForm({ slug, t }: { slug: string; t: SignupTexts }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const merci = useRef<HTMLParagraphElement>(null);
  const [etat, setEtat] = useState<"repos" | "envoi" | "merci">("repos");
  const [erreur, setErreur] = useState<Erreur | null>(null);

  useEffect(() => {
    if (etat === "merci") merci.current?.focus();
  }, [etat]);

  if (etat === "merci") {
    return (
      <p ref={merci} tabIndex={-1} className="t-lead" role="status">
        {t.merci}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (etat === "envoi") return;
    const f = new FormData(e.currentTarget);
    setEtat("envoi");
    setErreur(null);
    const res = await fetch(`/api/drops/${encodeURIComponent(slug)}/inscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(f.get("email") ?? "").trim(), turnstile: f.get("cf-turnstile-response") || undefined }),
    }).catch(() => null);
    if (res?.ok) {
      setEtat("merci");
      return;
    }
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: unknown }) : {};
    const code = res ? erreurDe(res.status, j.error) : "generale";
    setEtat("repos");
    setErreur(code);
    if (code === "email") requestAnimationFrame(() => input.current?.focus());
  }

  const erreurId = `${id}-erreur`;
  const mentionId = `${id}-mention`;
  return (
    <form className={s.formulaire} onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-email`} className="field__label">
          {t.champ}
        </label>
        <input
          ref={input}
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          className="field__input"
          aria-invalid={erreur === "email" || undefined}
          aria-describedby={erreur ? `${erreurId} ${mentionId}` : mentionId}
        />
      </div>
      <Turnstile action="avant-premiere" />
      {erreur ? (
        <p id={erreurId} className="field__error" role="alert">
          {t.erreurs[erreur]}
        </p>
      ) : null}
      <button type="submit" className="btn btn--block" disabled={etat === "envoi"} aria-busy={etat === "envoi" || undefined}>
        {etat === "envoi" ? t.envoi : t.bouton}
      </button>
      <p id={mentionId} className="t-note">
        {t.mention}
      </p>
    </form>
  );
}
