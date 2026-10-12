"use client";
/**
 * Bandeau cookies conforme RGPD / recommandations CNIL :
 * refuser est aussi simple qu'accepter, aucun cookie non nécessaire avant le choix,
 * choix mémorisé 6 mois, modifiable à tout moment depuis le pied de page.
 */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Consent {
  v: 1;
  analytics: boolean;
  social: boolean;
  date: string;
}

const COOKIE = "awrea_consent";
const OPEN_EVENT = "awrea:cookies";

const ConsentContext = createContext<Consent | null>(null);
export const useConsent = () => useContext(ConsentContext);

function readConsent(): Consent | null {
  const m = document.cookie.match(/(?:^|; )awrea_consent=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as Consent;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Max-Age=${60 * 60 * 24 * 182}; Path=/; SameSite=Lax${secure}`;
}

export function CookieSettingsButton() {
  return (
    <button type="button" className="link link--quiet" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Gérer les cookies
    </button>
  );
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, social: false });

  useEffect(() => {
    const c = readConsent();
    setConsent(c);
    if (!c) setOpen(true);
    else setDraft({ analytics: c.analytics, social: c.social });
    const reopen = () => {
      setOpen(true);
      setDetails(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const save = useCallback((analytics: boolean, social: boolean) => {
    const c: Consent = { v: 1, analytics, social, date: new Date().toISOString() };
    writeConsent(c);
    setConsent(c);
    setDraft({ analytics, social });
    setOpen(false);
    setDetails(false);
  }, []);

  return (
    <ConsentContext.Provider value={consent}>
      {children}
      {open ? (
        <section className="cookie-banner scene" data-theme="ivory" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
          <div className="cookie-banner__inner">
            <h2 id="cookie-title" className="t-label">
              Cookies
            </h2>
            <p className="t-note cookie-banner__text">
              Nous utilisons des cookies nécessaires au fonctionnement du site (panier, préférences). Avec votre accord, nous mesurons aussi l’audience de façon
              anonyme et affichons le flux Instagram. <Link href="/cookies" className="text-link">En savoir plus</Link>
            </p>
            {details ? (
              <fieldset className="cookie-banner__details">
                <legend className="sr-only">Choisir les cookies</legend>
                <label className="check t-note">
                  <input type="checkbox" checked disabled />
                  <span>Nécessaires — toujours actifs</span>
                </label>
                <label className="check t-note">
                  <input type="checkbox" checked={draft.analytics} onChange={(e) => setDraft((d) => ({ ...d, analytics: e.target.checked }))} />
                  <span>Mesure d’audience anonyme</span>
                </label>
                <label className="check t-note">
                  <input type="checkbox" checked={draft.social} onChange={(e) => setDraft((d) => ({ ...d, social: e.target.checked }))} />
                  <span>Contenus Instagram</span>
                </label>
              </fieldset>
            ) : null}
            <div className="cookie-banner__actions">
              <button type="button" className="btn" onClick={() => save(false, false)}>
                Tout refuser
              </button>
              {details ? (
                <button type="button" className="btn" onClick={() => save(draft.analytics, draft.social)}>
                  Enregistrer
                </button>
              ) : (
                <button type="button" className="btn" onClick={() => setDetails(true)}>
                  Personnaliser
                </button>
              )}
              <button type="button" className="btn" onClick={() => save(true, true)}>
                Tout accepter
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </ConsentContext.Provider>
  );
}
