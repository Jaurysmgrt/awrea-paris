"use client";
/**
 * Présentation privée : le mot de passe transmis par la Maison ouvre, dans ce navigateur, la
 * collection (texte, images, pièces) et la commande de ses pièces avant le dévoilement. Aucun prix
 * particulier : seule la date d'accès change. Le serveur limite les essais (8 par quart d'heure).
 */
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./avant-premieres.module.css";

type Erreur = "motDePasse" | "refuse" | "limite" | "generale";
export type PrivatePresentationTexts = { champ: string; bouton: string; envoi: string; erreurs: Record<Erreur, string> };

const erreurDe = (status: number): Erreur => (status === 400 ? "motDePasse" : status === 403 ? "refuse" : status === 429 ? "limite" : "generale");

export function PrivatePresentationForm({ slug, t }: { slug: string; t: PrivatePresentationTexts }) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<Erreur | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (envoi) return;
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setErreur(null);
    if (!password) {
      setErreur("motDePasse");
      input.current?.focus();
      return;
    }
    setEnvoi(true);
    const res = await fetch(`/api/drops/${encodeURIComponent(slug)}/acces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setEnvoi(false);
    if (res?.ok) {
      router.refresh();
      return;
    }
    setErreur(res ? erreurDe(res.status) : "generale");
    requestAnimationFrame(() => input.current?.select());
  }

  const erreurId = `${id}-erreur`;
  return (
    <form className={s.formulaire} onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-mdp`} className="field__label">
          {t.champ}
        </label>
        <input
          ref={input}
          id={`${id}-mdp`}
          name="password"
          type="password"
          required
          maxLength={120}
          autoComplete="off"
          className="field__input"
          aria-invalid={erreur === "motDePasse" || erreur === "refuse" || undefined}
          aria-describedby={erreur ? erreurId : undefined}
        />
      </div>
      {erreur ? (
        <p id={erreurId} className="field__error" role="alert">
          {t.erreurs[erreur]}
        </p>
      ) : null}
      <button type="submit" className="btn btn--block" disabled={envoi} aria-busy={envoi || undefined}>
        {envoi ? t.envoi : t.bouton}
      </button>
    </form>
  );
}
