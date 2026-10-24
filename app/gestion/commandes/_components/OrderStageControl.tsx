"use client";
/**
 * Atelier : faire avancer une commande d'une étape, en un geste. « Expédiée » demande une
 * confirmation et accepte le numéro de suivi du transporteur (facultatif) ; les autres étapes
 * passent d'un clic. La cliente reçoit l'e-mail de l'étape.
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "@/components/admin/AtelierContext";
import type { OrderStage } from "@/lib/commerce/types";
import { CARRIERS } from "./transporteurs";

/** Bouton de chaque étape suivante. */
export const STAGE_ACTIONS: Record<Exclude<OrderStage, "paid">, string> = {
  in_production: "Passer en confection",
  ready: "Marquer comme prête",
  shipped: "Marquer comme expédiée",
  delivered: "Marquer comme livrée",
};

export function OrderStageControl({ number, next, compact = false }: { number: string; next: Exclude<OrderStage, "paid">; compact?: boolean }) {
  const { api } = useAtelier();
  const router = useRouter();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "warning"; text: string } | null>(null);

  async function advance(extra: { carrier?: string; tracking?: string } = {}) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(api(`/commandes/${encodeURIComponent(number)}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etape: next, ...extra }),
    }).catch(() => null);
    const json = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; warning?: string };
    setBusy(false);
    if (!res?.ok) return setMessage({ kind: "error", text: json.error ?? "L’étape n’a pas pu être enregistrée. Merci de réessayer." });
    if (json.warning) setMessage({ kind: "warning", text: json.warning });
    router.refresh();
  }

  const feedback = message ? (
    <span className={message.kind === "error" ? "field__error" : "t-note"} role={message.kind === "error" ? "alert" : "status"}>
      {message.text}
    </span>
  ) : null;

  if (next !== "shipped") {
    return (
      <span className="action-button">
        <button type="button" className={compact ? "link link--quiet" : "btn btn--solid"} disabled={busy} onClick={() => advance()}>
          {busy ? "Enregistrement…" : STAGE_ACTIONS[next]}
        </button>
        {feedback}
      </span>
    );
  }

  return (
    <form
      className="admin-actions"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const tracking = String(f.get("tracking") ?? "").trim();
        // l'expédition prévient la cliente : elle se confirme
        const ok = window.confirm(`Marquer la commande ${number} comme expédiée${tracking ? `, suivi ${tracking}` : ", sans numéro de suivi"} ? La cliente reçoit l’e-mail d’expédition.`);
        if (ok) void advance({ carrier: String(f.get("carrier") ?? CARRIERS[0]), tracking });
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor={`${id}-carrier`}>
          Transporteur
        </label>
        <select id={`${id}-carrier`} name="carrier" className="field__input" defaultValue={CARRIERS[0]}>
          {CARRIERS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-tracking`}>
          Numéro de suivi (facultatif)
        </label>
        <input id={`${id}-tracking`} name="tracking" className="field__input" minLength={6} maxLength={40} pattern="[A-Za-z0-9\-]+" autoComplete="off" spellCheck={false} />
      </div>
      <button type="submit" className="btn btn--solid" disabled={busy}>
        {busy ? "Enregistrement…" : STAGE_ACTIONS.shipped}
      </button>
      {feedback}
    </form>
  );
}
