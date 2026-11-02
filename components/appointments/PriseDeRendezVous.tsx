"use client";
/**
 * Page « Rendez-vous » (dossier de la créatrice du 02/11) : un seul bouton, « Prendre rendez-vous »,
 * avec sa petite phrase dessous. La réservation (le rendez-vous, le jour, l'heure, vous) s'ouvre à sa
 * place quand on le touche, sans changer de page, et la première question prend la main au clavier.
 * Arrivée depuis un lien qui choisit déjà le rendez-vous (« ?type=visio ») : elle est ouverte.
 */
import { useEffect, useId, useRef, useState } from "react";
import { BookingForm, type BookingTexts } from "./BookingForm";

type TypeId = keyof BookingTexts["types"];

export function PriseDeRendezVous({ t, bouton, note, initialType, className }: { t: BookingTexts; bouton: string; note: string; initialType?: TypeId; className?: string }) {
  const id = useId();
  const [ouvert, setOuvert] = useState(Boolean(initialType));
  const zone = useRef<HTMLDivElement>(null);
  const aLaMain = useRef(false);

  // ouverte par le bouton : la première question reçoit le focus (le bouton vient de disparaître)
  useEffect(() => {
    if (!ouvert || !aLaMain.current) return;
    aLaMain.current = false;
    zone.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [ouvert]);

  return (
    <div className={className}>
      {ouvert ? null : (
        <div className="rdv-appel">
          <button
            type="button"
            className="btn btn--capsule"
            aria-expanded={false}
            aria-controls={id}
            onClick={() => {
              aLaMain.current = true;
              setOuvert(true);
            }}
          >
            {bouton}
          </button>
          <p className="t-note t-center">{note}</p>
        </div>
      )}
      <div id={id} ref={zone} className="rdv-reservation" hidden={!ouvert}>
        {ouvert ? <BookingForm t={t} initialType={initialType} /> : null}
      </div>
    </div>
  );
}
