"use client";
/**
 * Réglages d'affichage, au pied de page et dans le menu plein écran :
 * Jour · Nuit · Auto (« Auto » suit le réglage du téléphone), et des animations apaisées.
 * De vrais boutons radio (flèches du clavier comprises), soulignés d'un trait doré.
 */
import { useSyncExternalStore } from "react";
import { parsePrefs, prefsSnapshot, subscribePrefs, writePrefs, type ColorMode } from "@/lib/prefs";

const modes: { value: ColorMode; label: string; hint?: string }[] = [
  { value: "light", label: "Jour" },
  { value: "dark", label: "Nuit" },
  { value: "auto", label: "Auto", hint: " (selon le réglage de l’appareil)" },
];

/** côté serveur, aucun choix n'est coché : le navigateur seul connaît la préférence */
const serverSnapshot = () => null;

export function DisplayPrefs({ id, withMotion = false, className = "" }: { id: string; withMotion?: boolean; className?: string }) {
  const raw = useSyncExternalStore(subscribePrefs, prefsSnapshot, serverSnapshot);
  const prefs = raw === null ? null : parsePrefs(raw);

  return (
    <fieldset className={`display-prefs ${className}`}>
      <legend className="t-label display-prefs__legend">Affichage</legend>
      <div className="segmented display-prefs__modes">
        {modes.map((m) => (
          <label key={m.value} className="segmented__item">
            <input type="radio" className="sr-only" name={`${id}-mode`} value={m.value} checked={prefs?.mode === m.value} onChange={() => writePrefs({ mode: m.value })} />
            {m.label}
            {m.hint ? <span className="sr-only">{m.hint}</span> : null}
          </label>
        ))}
      </div>
      {withMotion ? (
        <label className="switch display-prefs__motion">
          <input type="checkbox" role="switch" checked={prefs?.motion === "reduce"} onChange={(e) => writePrefs({ motion: e.target.checked ? "reduce" : "auto" })} />
          <span className="switch__track" aria-hidden="true" />
          <span className="t-label">Animations apaisées</span>
        </label>
      ) : null}
    </fieldset>
  );
}
