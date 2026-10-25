"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { Turnstile } from "@/components/security/Turnstile";
import { fill } from "@/lib/edition/fill";

/**
 * Formulaire de contact (maquette FORMULAIRE CONTACT) : champs sans cadre soulignés d'un filet,
 * Prénom * et Nom, E-mail * et Adresse côte à côte dès la tablette, Téléphone, Informations
 * complémentaires, bouton noir en pilule sur toute la largeur. Seuls le prénom et l'e-mail sont
 * obligatoires : leur absence est dite par écrit sous le champ, et le curseur y retourne.
 * Protections inchangées : Turnstile, champ piège à robots, contrôle d'origine et limitation de
 * débit côté serveur, validation Zod (app/api/contact/route.ts).
 * Textes : document « contact » (content/site/fr/contact.json), transmis par la page.
 */
type ContactTexts = typeof import("@/content/site/fr/contact.json");
type Requis = "prenom" | "courriel";

export function ContactForm({ t, email }: { t: ContactTexts["formulaire"]; email: string }) {
  const id = useId();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [missing, setMissing] = useState<Partial<Record<Requis, boolean>>>({});
  const done = useRef<HTMLParagraphElement>(null);

  // message envoyé : le remerciement prend la place du formulaire et reçoit le focus (il est lu)
  useEffect(() => {
    if (state === "done") done.current?.focus();
  }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
    const next = { prenom: !field("firstName")?.value.trim(), courriel: !field("email")?.value.trim() || !field("email")?.validity.valid };
    setMissing(next);
    if (next.prenom || next.courriel) {
      field(next.prenom ? "firstName" : "email")?.focus();
      return;
    }
    const f = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const value = (k: string) => (f[k]?.trim() ? f[k].trim() : undefined);
    setState("loading");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "contact",
        firstName: value("firstName"),
        lastName: value("lastName"),
        email: value("email"),
        address: value("address"),
        phone: value("phone"),
        message: value("message"),
        website: f.website || undefined,
        turnstile: f["cf-turnstile-response"] || undefined,
      }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState("done");
      setMsg(j.message ?? "");
    } else {
      setState("error");
      setMsg(j.error ?? fill(t.erreur, { email }));
    }
  }

  if (state === "done") {
    return (
      <p ref={done} className="t-lead t-left" role="status" tabIndex={-1}>
        {msg}
      </p>
    );
  }

  const err = (k: Requis) => `${id}-${k}-erreur`;
  return (
    <form className="stack-m" onSubmit={onSubmit} noValidate aria-describedby={`${id}-requis`}>
      <p id={`${id}-requis`} className="t-note">
        {t.obligatoires}
      </p>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-prenom`}>
            {t.champs.prenom}
            <span aria-hidden="true"> *</span>
          </label>
          <input
            className="field__input"
            id={`${id}-prenom`}
            name="firstName"
            required
            maxLength={80}
            autoComplete="given-name"
            aria-invalid={missing.prenom || undefined}
            aria-describedby={missing.prenom ? err("prenom") : undefined}
            onInput={() => missing.prenom && setMissing((m) => ({ ...m, prenom: false }))}
          />
          {missing.prenom ? (
            <p id={err("prenom")} className="field__error">
              {t.manquants.prenom}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-nom`}>
            {t.champs.nom}
          </label>
          <input className="field__input" id={`${id}-nom`} name="lastName" maxLength={80} autoComplete="family-name" />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-courriel`}>
            {t.champs.courriel}
            <span aria-hidden="true"> *</span>
          </label>
          <input
            className="field__input"
            id={`${id}-courriel`}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            aria-invalid={missing.courriel || undefined}
            aria-describedby={missing.courriel ? err("courriel") : undefined}
            onInput={() => missing.courriel && setMissing((m) => ({ ...m, courriel: false }))}
          />
          {missing.courriel ? (
            <p id={err("courriel")} className="field__error">
              {t.manquants.courriel}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-adresse`}>
            {t.champs.adresse}
          </label>
          <input className="field__input" id={`${id}-adresse`} name="address" maxLength={240} autoComplete="street-address" />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-telephone`}>
          {t.champs.telephone}
        </label>
        <input className="field__input" id={`${id}-telephone`} name="phone" type="tel" maxLength={40} autoComplete="tel" />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-message`}>
          {t.champs.message}
        </label>
        <textarea className="field__input" id={`${id}-message`} name="message" maxLength={4000} />
      </div>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${id}-website`}>{t.robot}</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Turnstile action="contact" />
      {state === "error" ? (
        <p className="field__error" role="alert">
          {msg}
        </p>
      ) : null}
      <button type="submit" className="btn btn--block" disabled={state === "loading"}>
        {state === "loading" ? t.envoi : t.bouton}
      </button>
      <p className="t-note">
        {t.confidentialite}{" "}
        <Link href={t.confidentialiteLien.href} className="link">
          {t.confidentialiteLien.label}
        </Link>
      </p>
    </form>
  );
}
