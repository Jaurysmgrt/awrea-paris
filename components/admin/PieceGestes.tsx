"use client";
/**
 * Gestes sur une pièce, depuis sa fiche dans l'Atelier : la mettre en ligne, la passer en
 * brouillon, l'archiver ou la dupliquer. Retirer une pièce du site demande une confirmation ; la
 * copie s'ouvre aussitôt, en brouillon. Le résultat s'affiche en mots simples, sans recharger.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";
import type { StatutPiece } from "@/lib/commerce/statut-pieces";

export function PieceGestes({ handle, title, statut }: { handle: string; title: string; statut: StatutPiece }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(chemin: string, corps: unknown, confirmer?: string) {
    if (confirmer && !window.confirm(confirmer)) return null;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(chemin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, texte: json.error ?? "Le geste n’a pas abouti. Merci de réessayer." });
      return null;
    }
    return json as Record<string, unknown>;
  }

  const statutVers = async (cible: StatutPiece, confirmer?: string) => {
    const r = await envoyer(`/pieces/${handle}/statut`, { statut: cible }, confirmer);
    if (r) {
      setMessage({ ok: r.canaux !== false, texte: String(r.message ?? "C’est fait.") });
      router.refresh();
    }
  };

  return (
    <div className="stack-s">
      <div className="piece-gestes">
        {statut === "en-ligne" ? (
          <>
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => statutVers("brouillon", `Passer « ${title} » en brouillon ? Elle ne sera plus visible sur le site.`)}>
              Mettre en brouillon
            </button>
          </>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={() => statutVers("en-ligne")}>
            Mettre en ligne
          </button>
        )}
        <button
          type="button"
          className="btn btn--outline"
          disabled={busy}
          onClick={async () => {
            const r = await envoyer(`/pieces/${handle}/dupliquer`, {});
            if (r?.handle) router.push(atelier.href(`/catalogue/${String(r.handle)}`));
          }}
        >
          Dupliquer
        </button>
        {statut !== "archivee" ? (
          <button type="button" className="btn btn--link" disabled={busy} onClick={() => statutVers("archivee", `Archiver « ${title} » ? Elle quitte le site ; vous pourrez la remettre en ligne plus tard.`)}>
            Archiver
          </button>
        ) : null}
      </div>
      {busy ? <p className="t-note" role="status">Un instant…</p> : null}
      {message ? (
        <p className={message.ok ? "t-note" : "field__error"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}
