"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Bouton qui appelle une route du tableau de bord puis rafraîchit la page. */
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
  variant?: "default" | "solid" | "quiet";
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
        className={variant === "quiet" ? "link link--quiet" : `btn ${variant === "solid" ? "btn--solid" : ""}`}
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
