"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Bouton qui appelle une route du tableau de bord puis rafraîchit la page. Langage du design
 * system : « default » et « solid » (ancien nom) donnent le bouton noir en pilule (.btn), l'action
 * principale ; « outline » l'action secondaire qui le côtoie (.btn--outline) ; « quiet » un lien
 * souligné (.btn--link) pour les gestes discrets d'une ligne de tableau.
 */
const CLASSES = { default: "btn", solid: "btn", outline: "btn btn--outline", quiet: "btn btn--link" } as const;

export function ActionButton({
  endpoint,
  body,
  label,
  busyLabel = "En cours…",
  variant = "default",
  confirm,
  onDone,
}: {
  endpoint: string;
  body?: unknown;
  label: string;
  busyLabel?: string;
  variant?: keyof typeof CLASSES;
  confirm?: string;
  onDone?: (json: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="action-button">
      <button
        type="button"
        className={CLASSES[variant]}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError("");
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null);
          const json = res ? await res.json().catch(() => ({})) : {};
          setBusy(false);
          if (!res?.ok) setError(json.error ?? "Échec de l’opération.");
          else {
            onDone?.(json);
            router.refresh();
          }
        }}
      >
        {busy ? busyLabel : label}
      </button>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
