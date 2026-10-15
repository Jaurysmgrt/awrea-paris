"use client";
/**
 * Compte à rebours sobre de la page « Bientôt » : jours, heures, minutes — jamais de secondes qui
 * défilent, rien ne clignote. La date en toutes lettres reste lisible sans JavaScript et pour les
 * lecteurs d'écran ; les chiffres, eux, sont décoratifs.
 */
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const t = window.setInterval(cb, 30_000);
  return () => window.clearInterval(t);
};
const minute = () => Math.floor(Date.now() / 30_000);

export function Countdown({ target, label }: { target: string; label: string }) {
  const tick = useSyncExternalStore(subscribe, minute, () => null);
  const ms = tick === null ? null : Math.max(0, Date.parse(target) - tick * 30_000);
  const parts =
    ms === null
      ? null
      : [
          { n: Math.floor(ms / 86_400_000), unit: "jours" },
          { n: Math.floor((ms % 86_400_000) / 3_600_000), unit: "heures" },
          { n: Math.floor((ms % 3_600_000) / 60_000), unit: "minutes" },
        ];
  return (
    <div className="countdown">
      <p className="t-label countdown__label">{label}</p>
      {parts ? (
        <p className="countdown__digits" aria-hidden="true">
          {parts.map((p) => (
            <span key={p.unit} className="countdown__part">
              <span className="countdown__n">{String(p.n).padStart(2, "0")}</span>
              <span className="t-label countdown__unit">{p.unit}</span>
            </span>
          ))}
        </p>
      ) : null}
      <p className="t-note t-left countdown__date">
        {new Date(target).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}, heure de Paris
      </p>
    </div>
  );
}
