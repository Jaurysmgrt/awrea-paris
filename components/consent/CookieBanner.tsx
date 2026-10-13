"use client";
/**
 * Bandeau cookies : un filet noir très fin, du papier blanc cassé, une typographie fine.
 * Il apparaît en fondu au bas de l'écran sans jamais bloquer la page ;
 * « Refuser » et « Accepter » ont exactement le même poids visuel.
 */
import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { cookieCategories } from "@/content/fr/cookies";
import type { ConsentChoices } from "@/lib/consent";

type Props = {
  details: boolean;
  current: ConsentChoices;
  onDetails: () => void;
  onAcceptAll: () => void;
  onRefuseAll: () => void;
  onSave: (choices: ConsentChoices) => void;
};

export function CookieBanner({ details, current, onDetails, onAcceptAll, onRefuseAll, onSave }: Props) {
  const [draft, setDraft] = useState<ConsentChoices>(current);
  const [synced, setSynced] = useState(current);
  if (current !== synced) {
    setSynced(current);
    setDraft(current);
  }
  const listRef = useRef<HTMLUListElement>(null);
  // à l'ouverture du détail, le focus va à la première catégorie modifiable
  useEffect(() => {
    if (details) listRef.current?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus({ preventScroll: true });
  }, [details]);

  return (
    <section className="consent" data-details={details} aria-labelledby="consent-title">
      <div className="consent__inner container">
        <div className="consent__intro">
          <h2 id="consent-title" className="t-label consent__title">
            Cookies
          </h2>
          <p className="t-note consent__text">
            Les cookies nécessaires font fonctionner le site. Avec votre accord, d’autres mesurent l’audience, personnalisent votre visite et nous aident à faire
            connaître la maison. Vous pouvez changer d’avis à tout moment.{" "}
            <Link href="/cookies" className="text-link">
              Politique cookies
            </Link>
          </p>
        </div>

        {details ? (
          <fieldset className="consent__choices">
            <legend className="sr-only">Choisir les cookies par catégorie</legend>
            <ul ref={listRef} className="consent__list">
              {cookieCategories.map((c) => {
                const checked = c.always ? true : draft[c.key as keyof ConsentChoices];
                return (
                  <li key={c.key} className="consent__row">
                    <label className="switch">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={checked}
                        disabled={c.always}
                        aria-describedby={`consent-${c.key}`}
                        onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.checked }))}
                      />
                      <span className="switch__track" aria-hidden="true" />
                      <span className="t-label">{c.label}</span>
                    </label>
                    <p id={`consent-${c.key}`} className="t-note consent__desc">
                      {c.summary}
                    </p>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        <div className="consent__actions">
          <button type="button" className="btn consent__btn" onClick={onRefuseAll}>
            Refuser
          </button>
          <button type="button" className="btn consent__btn" onClick={onAcceptAll}>
            Accepter
          </button>
          {details ? (
            <button type="button" className="btn consent__btn consent__save" onClick={() => onSave(draft)}>
              Enregistrer mes choix
            </button>
          ) : (
            <button type="button" className="link link--quiet consent__more" aria-expanded="false" onClick={onDetails}>
              Choisir
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
