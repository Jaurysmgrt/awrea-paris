"use client";
/**
 * Gestes d'argent sur une commande : l'annuler et la rembourser, ou la rembourser après la
 * livraison. Chaque geste demande une confirmation qui dit ce qui va se passer ; un seul geste à la
 * fois par commande (lib/admin/commandes-suivi.ts), le résultat s'affiche en mots simples.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

type Geste = "annuler-rembourser" | "rembourser";

const LIBELLE: Record<Geste, string> = { "annuler-rembourser": "Annuler et rembourser", rembourser: "Rembourser" };

export function CommandeGestes({ numero, montant, gestes }: { numero: string; montant: string; gestes: Geste[] }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const confirmation: Record<Geste, string> = {
    "annuler-rembourser": `Annuler la commande ${numero} et rembourser ${montant} à la cliente ? Ce geste ne se défait pas. Aucun e-mail ne part seul : écrivez-lui pour lui expliquer.`,
    rembourser: `Rembourser ${montant} à la cliente pour la commande ${numero} ? Ce geste ne se défait pas. La cliente reçoit l’e-mail de remboursement.`,
  };

  async function faire(g: Geste) {
    if (!window.confirm(confirmation[g])) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/commandes/${encodeURIComponent(numero)}/geste`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geste: g }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setMessage({ ok: Boolean(res?.ok), texte: res?.ok ? String(j.message ?? "C’est fait.") : (j.error ?? "Le geste n’a pas abouti. Rien n’a été remboursé : vérifiez la commande avant de réessayer.") });
    if (res?.ok) router.refresh();
  }

  return (
    <div className="stack-s">
      <div className="piece-gestes">
        {gestes.map((g) => (
          <button key={g} type="button" className="btn btn--outline" disabled={busy} onClick={() => faire(g)}>
            {LIBELLE[g]}
          </button>
        ))}
      </div>
      <p className="t-note" role="status">
        {busy ? "Un instant…" : message?.ok ? message.texte : ""}
      </p>
      <p className="field__error" role="alert">
        {message && !message.ok ? message.texte : ""}
      </p>
    </div>
  );
}
