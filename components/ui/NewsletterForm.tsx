"use client";
/**
 * Lettre de la Maison, d'après la maquette NEWSLETTER : « Suivez-nous », grand titre en Fraunces
 * italique, champs soulignés d'un filet (Nom *, Prénom *, E-mail *, Téléphone), case de
 * consentement, bouton noir en pilule. Version compacte (pied de page) : Nom, Prénom, E-mail et
 * consentement, sans le téléphone.
 *
 * Textes : document « site » (content/site/fr/site.json, partie « lettre »), transmis à tout le
 * site par le TextsRoot de app/layout.tsx. Erreurs écrites sous chaque champ (aria-invalid,
 * aria-describedby), focus sur le premier champ à corriger. Le serveur (app/api/newsletter) revérifie
 * tout : contrôle d'origine, limitation de débit, Turnstile, schéma Zod, consentement confirmé
 * côté Shopify.
 */
import { useId, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { Turnstile } from "@/components/security/Turnstile";
import { useTexts } from "@/components/content/Texts";
import { track } from "@/lib/analytics/track";
import { EMAIL_MAX, NOM_MAX, TELEPHONE_MAX, champsEnErreur, type ChampLettre } from "@/app/api/newsletter/regles";

type SiteTexts = typeof import("@/content/site/fr/site.json");
type Etat = "repos" | "envoi" | "merci";

const ORDRE: ChampLettre[] = ["nom", "prenom", "email", "telephone", "consentement"];

/** Formulaire seul (les pages qui ont déjà leur titre l'utilisent tel quel). */
export function NewsletterForm({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const t = useTexts<SiteTexts>("site").lettre;
  const id = useId();
  const merciRef = useRef<HTMLParagraphElement>(null);
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreurs, setErreurs] = useState<ChampLettre[]>([]);
  const [alerte, setAlerte] = useState("");

  const fid = (c: ChampLettre) => `${id}-${c}`;
  const eid = (c: ChampLettre) => `${id}-${c}-erreur`;
  const enErreur = (c: ChampLettre) => erreurs.includes(c);

  /** Met en évidence les champs à corriger et place le focus sur le premier. */
  function signaler(champs: ChampLettre[]) {
    const tries = ORDRE.filter((c) => champs.includes(c));
    setErreurs(tries);
    const premier = tries[0];
    if (premier) requestAnimationFrame(() => document.getElementById(fid(premier))?.focus());
  }

  /** Un champ corrigé perd son message dès la saisie suivante. */
  const corrige = (c: ChampLettre) => () => setErreurs((e) => (e.includes(c) ? e.filter((x) => x !== c) : e));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (etat === "envoi") return;
    const form = new FormData(e.currentTarget);
    const saisie = {
      nom: String(form.get("nom") ?? ""),
      prenom: String(form.get("prenom") ?? ""),
      email: String(form.get("email") ?? ""),
      telephone: String(form.get("telephone") ?? ""),
      consentement: form.get("consent") === "on",
    };
    setAlerte("");
    const champs = champsEnErreur(saisie);
    if (champs.length) return signaler(champs);
    setErreurs([]);
    setEtat("envoi");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: saisie.nom,
        prenom: saisie.prenom,
        email: saisie.email.trim(),
        telephone: saisie.telephone.trim() || undefined,
        consent: saisie.consentement,
        source,
        turnstile: form.get("cf-turnstile-response") || undefined,
      }),
    }).catch(() => null);
    const json: { error?: string; champs?: ChampLettre[] } = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      track({ name: "newsletter" });
      setEtat("merci");
      requestAnimationFrame(() => merciRef.current?.focus());
      return;
    }
    setEtat("repos");
    if (res?.status === 429) setAlerte(t.erreurs.limite);
    else if (json.error === "verification") setAlerte(t.erreurs.verification);
    else if (json.error === "invalide" && json.champs?.length) signaler(json.champs);
    else setAlerte(t.erreurs.generale);
  }

  if (etat === "merci") {
    return (
      <p ref={merciRef} className="t-lead newsletter__merci" role="status" tabIndex={-1}>
        {t.merci}
      </p>
    );
  }

  const requis = (
    <span aria-hidden="true">
      {" "}
      {t.obligatoire}
    </span>
  );

  /** Attributs d'accessibilité d'un champ : état d'erreur, message et aide éventuelle. */
  const a11y = (c: ChampLettre, aide?: string) => {
    const decrit = [aide, enErreur(c) ? eid(c) : undefined].filter(Boolean).join(" ");
    return { "aria-invalid": enErreur(c) || undefined, "aria-describedby": decrit || undefined };
  };
  const message = (c: ChampLettre) =>
    enErreur(c) ? (
      <p id={eid(c)} className="field__error">
        {t.erreurs[c]}
      </p>
    ) : null;

  const champTexte = (c: "nom" | "prenom" | "email", type: string, autoComplete: string, max: number) => (
    <div className="field newsletter__field">
      <label htmlFor={fid(c)} className="field__label">
        {t.champs[c]}
        {requis}
      </label>
      <input id={fid(c)} name={c} type={type} required aria-required="true" autoComplete={autoComplete} maxLength={max} className="field__input" onChange={corrige(c)} {...a11y(c)} />
      {message(c)}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className={`newsletter ${compact ? "newsletter--compact" : ""}`} noValidate>
      <div className="newsletter__fields">
        <div className="field-row newsletter__names">
          {champTexte("nom", "text", "family-name", NOM_MAX)}
          {champTexte("prenom", "text", "given-name", NOM_MAX)}
        </div>
        {champTexte("email", "email", "email", EMAIL_MAX)}
        {compact ? null : (
          <div className="field newsletter__field">
            <label htmlFor={fid("telephone")} className="field__label">
              {t.champs.telephone}
            </label>
            <input id={fid("telephone")} name="telephone" type="tel" inputMode="tel" autoComplete="tel" maxLength={TELEPHONE_MAX} className="field__input" onChange={corrige("telephone")} {...a11y("telephone", `${id}-telephone-aide`)} />
            <p id={`${id}-telephone-aide`} className="field__hint">
              {t.aideTelephone}
            </p>
            {message("telephone")}
          </div>
        )}
      </div>

      <div className="newsletter__consent">
        <label className="check" htmlFor={fid("consentement")}>
          <input id={fid("consentement")} type="checkbox" name="consent" required aria-required="true" onChange={corrige("consentement")} {...a11y("consentement")} />
          <span>
            {t.consentement}
            {requis}
          </span>
        </label>
        {message("consentement")}
      </div>

      <p className="t-note newsletter__mention">
        {t.mention}{" "}
        <Link href={t.confidentialite.href} className="text-link">
          {t.confidentialite.label}
        </Link>
      </p>

      <Turnstile action="newsletter" />

      <button type="submit" className={`btn newsletter__submit ${compact ? "" : "btn--block"}`} aria-disabled={etat === "envoi" || undefined}>
        {etat === "envoi" ? t.envoi : t.bouton}
      </button>

      {alerte ? (
        <p className="field__error" role="alert">
          {alerte}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Bloc complet de la maquette NEWSLETTER : « Suivez-nous », le grand titre en Fraunces italique,
 * puis le formulaire. `compact` : version du pied de page (titre plus petit, sans le téléphone).
 */
export function NewsletterBlock({ source = "site", compact = false, titleId }: { source?: string; compact?: boolean; titleId?: string }) {
  const t = useTexts<SiteTexts>("site").lettre;
  const id = useId();
  const titre = titleId ?? `${id}-titre`;
  return (
    <div className={`newsletter-block ${compact ? "newsletter-block--compact" : ""}`}>
      <p className="t-lead t-center newsletter-block__kicker">{t.surtitre}</p>
      <h2 id={titre} className={`${compact ? "t-h3" : "t-h2"} newsletter-block__title`}>
        {t.titre}
      </h2>
      <NewsletterForm source={source} compact={compact} />
    </div>
  );
}
