"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "@/components/ui/Link";
import { useAtelier } from "./AtelierContext";
import { useConfirmation } from "./Confirmation";

const compter = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Ce que le geste a donné, en une phrase : le message de la route, ou le bilan d'un agent. */
function retour(json: Record<string, unknown>): { texte: string; aValider: boolean } {
  if (typeof json.message === "string") return { texte: json.message, aValider: false };
  const run = json.run as { done?: number; proposed?: number; failed?: number } | undefined;
  if (!run) return { texte: "C’est fait.", aValider: false };
  const faits = [
    run.proposed ? compter(run.proposed, "proposition à valider", "propositions à valider") : "",
    run.done ? compter(run.done, "geste fait", "gestes faits") : "",
    run.failed ? compter(run.failed, "geste manqué", "gestes manqués") : "",
  ].filter(Boolean);
  return { texte: faits.length ? `Terminé : ${faits.join(", ")}.` : "Terminé : rien à faire pour l’instant.", aValider: Boolean(run.proposed) };
}

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
  confirmLabel,
  onDone,
}: {
  endpoint: string;
  body?: unknown;
  label: string;
  busyLabel?: string;
  variant?: keyof typeof CLASSES;
  confirm?: string;
  /** mot du bouton qui confirme, dans la page (sinon le libellé du bouton) */
  confirmLabel?: string;
  onDone?: (json: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fait, setFait] = useState<{ texte: string; aValider: boolean } | null>(null);
  const atelier = useAtelier();
  const { confirmer, fenetre } = useConfirmation();
  return (
    <span className="action-button">
      <button
        type="button"
        className={CLASSES[variant]}
        disabled={busy}
        onClick={async () => {
          if (confirm && !(await confirmer(confirm, confirmLabel ?? label))) return;
          setBusy(true);
          setError("");
          setFait(null);
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null);
          const json = res ? await res.json().catch(() => ({})) : {};
          setBusy(false);
          if (!res?.ok) setError(json.error ?? "Échec de l’opération.");
          else {
            // un retour visible après le geste (parcours UX du 23/11)
            setFait(retour(json));
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
      {fait ? (
        <span className="t-note" role="status">
          {fait.texte}{" "}
          {fait.aValider ? (
            <Link href={atelier.href("/validations")} className="text-link">
              Voir À valider
            </Link>
          ) : null}
        </span>
      ) : null}
      {fenetre}
    </span>
  );
}
