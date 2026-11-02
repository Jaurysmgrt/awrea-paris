"use client";
/**
 * Interrupteur d'une autonomie des agents (Atelier › Réglages › Ce que les agents font seuls).
 * Allumé : l'agent agit seul dans sa règle. Coupé : il vous propose chaque action dans « À valider ».
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

export function AutonomieSwitch({ autonomie, titre, actif }: { autonomie: string; titre: string; actif: boolean }) {
  const router = useRouter();
  const atelier = useAtelier();
  const [on, setOn] = useState(actif);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="autonomie-switch">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={titre}
        className="switch"
        disabled={busy}
        onClick={async () => {
          const next = !on;
          setBusy(true);
          setError("");
          const res = await fetch(atelier.api("/autonomie"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autonomie, actif: next }) }).catch(() => null);
          setBusy(false);
          if (!res?.ok) {
            setError("Le réglage n’a pas été enregistré.");
            return;
          }
          setOn(next);
          router.refresh();
        }}
      >
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__label">{on ? "Seul" : "Avec vous"}</span>
      </button>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
