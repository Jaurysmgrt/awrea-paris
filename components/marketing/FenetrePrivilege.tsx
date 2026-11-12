"use client";
/**
 * Fenêtre « Profitez de votre privilège » (cahier du site du 10/11, § 8) : le texte de la créatrice,
 * un champ e-mail, une case de consentement non cochée (distincte de la création de compte), un
 * bouton noir en pilule, une croix ; les conditions de l'offre en une ligne.
 *
 * Sobre et rare : quelques secondes après l'arrivée, au plus une fois tous les 30 jours après une
 * fermeture, jamais pour une personne inscrite depuis ce navigateur, jamais tant que le bandeau
 * cookies attend un choix, jamais sur le panier, le paiement, le compte, la confirmation ou le suivi
 * d'une commande (l'Atelier a son propre gabarit). Le souvenir vit dans le stockage local
 * (« awrea_privilege », cookie nécessaire).
 *
 * Accessibilité : <dialog> modal nommé par son titre, le reste de la page inerte, focus gardé dans la
 * fenêtre (Tab boucle), Échap et la croix ferment, le focus revient où il était. Mode Nuit par les
 * rôles de couleur ; animations apaisées par la durée unique (--dur).
 */
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/ui/Icon";
import { Turnstile } from "@/components/security/Turnstile";
import { useTexts } from "@/components/content/Texts";
import { useConsent } from "@/components/consent/ConsentProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { stripLocale } from "@/lib/i18n/routing";
import { track } from "@/lib/analytics/track";
import { EMAIL_MAX, emailPlausible } from "@/app/api/newsletter/regles";
import { ecrireMemoire, lireMemoire, noterInscription, pageExclue, peutAfficher } from "./memoire-privilege";

type Texts = typeof import("@/content/site/fr/privilege.json")["fenetre"];
type Champ = "email" | "consentement";

/** quelques secondes de visite avant de se présenter */
const DELAI_MS = 8000;
/** une autre fenêtre est ouverte (menu, panier, assistante) : on attend qu'elle se ferme */
const NOUVEL_ESSAI_MS = 3000;

export function FenetrePrivilege() {
  const t = useTexts<{ fenetre: Texts }>("privilege").fenetre;
  const { consent } = useConsent();
  const locale = useLocale();
  const chemin = stripLocale(usePathname() ?? "/");
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const merciRef = useRef<HTMLHeadingElement>(null);
  const [ouverte, setOuverte] = useState(false);
  const [etat, setEtat] = useState<"repos" | "envoi" | "merci">("repos");
  const [erreurs, setErreurs] = useState<Champ[]>([]);
  const [alerte, setAlerte] = useState("");
  const dejaVue = useRef(false);

  // le moment de se présenter : choix des cookies fait, page permise, aucune autre fenêtre ouverte
  useEffect(() => {
    if (dejaVue.current || !consent || pageExclue(chemin) || !peutAfficher(lireMemoire(), Date.now())) return;
    let minuterie = 0;
    const essayer = () => {
      if (document.querySelector("dialog[open], .consent") || document.documentElement.classList.contains("consent-bloque")) {
        minuterie = window.setTimeout(essayer, NOUVEL_ESSAI_MS);
        return;
      }
      dejaVue.current = true;
      ecrireMemoire({ vu: new Date().toISOString() });
      setOuverte(true);
    };
    minuterie = window.setTimeout(essayer, DELAI_MS);
    return () => window.clearTimeout(minuterie);
  }, [consent, chemin]);

  // ouverture et fermeture du <dialog> modal ; le défilement doux de la page s'arrête pendant ce temps
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (ouverte && !d.open) {
      d.showModal();
      lenis?.stop();
    } else if (!ouverte && d.open) {
      d.close();
      lenis?.start();
    }
  }, [ouverte]);

  const fermer = () => {
    ecrireMemoire({ vu: new Date().toISOString() });
    setOuverte(false);
  };

  /** le focus reste dans la fenêtre : Tab et Maj+Tab bouclent sur ses éléments */
  const garderFocus = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    const elements = [...ref.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent !== null);
    if (!elements.length) return;
    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  };

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (etat === "envoi") return;
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const consentement = f.get("consent") === "on";
    const manque: Champ[] = [...(emailPlausible(email) ? [] : (["email"] as const)), ...(consentement ? [] : (["consentement"] as const))];
    setAlerte("");
    setErreurs(manque);
    if (manque.length) {
      requestAnimationFrame(() => document.getElementById(`${id}-${manque[0]}`)?.focus());
      return;
    }
    setEtat("envoi");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formule: "compacte", email, consent: true, source: "fenetre", langue: locale, turnstile: f.get("cf-turnstile-response") || undefined }),
    }).catch(() => null);
    const j: { error?: string; champs?: string[] } = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      track({ name: "newsletter" });
      noterInscription();
      setEtat("merci");
      requestAnimationFrame(() => merciRef.current?.focus());
      return;
    }
    setEtat("repos");
    if (res?.status === 429) setAlerte(t.erreurs.limite);
    else if (j.error === "verification") setAlerte(t.erreurs.verification);
    else if (j.error === "invalide" && j.champs?.includes("email")) setErreurs(["email"]);
    else setAlerte(t.erreurs.generale);
  }

  const enErreur = (c: Champ) => erreurs.includes(c);
  const a11y = (c: Champ) => ({ "aria-invalid": enErreur(c) || undefined, "aria-describedby": enErreur(c) ? `${id}-${c}-erreur` : undefined });

  return (
    <dialog
      ref={ref}
      className="privilege scene"
      data-theme="ivory"
      aria-labelledby={`${id}-titre`}
      aria-describedby={`${id}-texte`}
      onCancel={(e) => {
        e.preventDefault();
        fermer();
      }}
      onClick={(e) => {
        if (e.target === ref.current) fermer();
      }}
      onKeyDown={garderFocus}
      data-lenis-prevent=""
    >
      {ouverte ? (
        <div className="privilege__panel stack-m">
          <button type="button" className="icon-btn privilege__fermer" onClick={fermer} aria-label={t.fermer}>
            <Icon name="close" />
          </button>
          {etat === "merci" ? (
            <div className="stack-m" role="status">
              <h2 id={`${id}-titre`} ref={merciRef} tabIndex={-1} className="t-h3 privilege__titre">
                {t.merci.titre}
              </h2>
              <p id={`${id}-texte`} className="t-body t-left">
                {t.merci.texte}
              </p>
            </div>
          ) : (
            <>
              <div className="stack-m" data-officiel="">
                <h2 id={`${id}-titre`} className="t-h3 privilege__titre">
                  {t.texte.titre}
                </h2>
                <div id={`${id}-texte`} className="stack-s">
                  {t.texte.paragraphes.map((p, i) => (
                    <p key={i} className="t-body t-left">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              <form className="stack-m" onSubmit={envoyer} noValidate>
                <div className="field">
                  <label className="field__label" htmlFor={`${id}-email`}>
                    {t.email}
                  </label>
                  <input
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={EMAIL_MAX}
                    className="field__input"
                    onChange={() => setErreurs((e) => e.filter((c) => c !== "email"))}
                    {...a11y("email")}
                  />
                  {enErreur("email") ? (
                    <p id={`${id}-email-erreur`} className="field__error">
                      {t.erreurs.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="check" htmlFor={`${id}-consentement`}>
                    <input id={`${id}-consentement`} type="checkbox" name="consent" required onChange={() => setErreurs((e) => e.filter((c) => c !== "consentement"))} {...a11y("consentement")} />
                    <span>{t.consentement}</span>
                  </label>
                  {enErreur("consentement") ? (
                    <p id={`${id}-consentement-erreur`} className="field__error">
                      {t.erreurs.consentement}
                    </p>
                  ) : null}
                </div>
                <Turnstile action="newsletter" />
                <div>
                  <button type="submit" className="btn" aria-disabled={etat === "envoi" || undefined}>
                    {etat === "envoi" ? t.envoi : t.bouton}
                  </button>
                </div>
                {alerte ? (
                  <p className="field__error" role="alert">
                    {alerte}
                  </p>
                ) : null}
                <p className="t-note t-left privilege__conditions">
                  {t.conditions}{" "}
                  <Link href={t.confidentialite.href} className="text-link">
                    {t.confidentialite.label}
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
