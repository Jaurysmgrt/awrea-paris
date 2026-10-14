"use client";
/** Démonstration : déclarer l'expédition (transporteur, suivi) ou la livraison d'une commande. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "./ActionButton";

export function OrderShipping({ number, status }: { number: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const endpoint = `/api/gestion/commandes/${encodeURIComponent(number)}`;
  if (status === "shipped") return <ActionButton endpoint={endpoint} body={{ action: "livree" }} label="Marquer comme livrée" />;
  if (!["paid", "in_production"].includes(status)) return null;
  return (
    <form
      className="admin-actions"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError("");
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "expediee", carrier: f.get("carrier"), tracking: f.get("tracking") }) }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        if (!res?.ok) setError(j.error ?? "Échec.");
        else router.refresh();
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="ship-carrier">
          Transporteur
        </label>
        <select id="ship-carrier" name="carrier" className="field__input" defaultValue="Colissimo">
          {["Colissimo", "Chronopost", "Mondial Relay", "DHL"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ship-tracking">
          Numéro de suivi
        </label>
        <input id="ship-tracking" name="tracking" className="field__input" required minLength={6} maxLength={40} pattern="[A-Za-z0-9\-]+" />
      </div>
      <button type="submit" className="btn btn--solid">
        Marquer comme expédiée
      </button>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
