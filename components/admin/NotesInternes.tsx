"use client";
/**
 * Notes internes d'une commande ou d'une cliente, sur sa fiche dans l'Atelier : elles ne paraissent
 * nulle part sur le site, et font partie des données remises à la cliente qui les demande (RGPD). Une note s'ajoute en un geste ; la liste (et l'historique) se mettent à jour sans recharger.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export function NotesInternes({ chemin, max, exemple }: { chemin: string; max: number; exemple: string }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) {
      setMessage({ ok: false, texte: "Écrivez la note avant de l’ajouter." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(chemin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texte }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, texte: j.error ?? "La note n’a pas pu être enregistrée. Merci de réessayer." });
      return;
    }
    setTexte("");
    setMessage({ ok: true, texte: "Note ajoutée." });
    router.refresh();
  }

  return (
    <form className="stack-s" onSubmit={ajouter}>
      <div className="field">
        <label className="field__label" htmlFor="note-interne">
          Nouvelle note
        </label>
        <textarea id="note-interne" aria-describedby="note-interne-aide" className="field__input" rows={3} maxLength={max} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={exemple} />
        <span className="field__hint" id="note-interne-aide">Pour l’atelier : elle ne paraît nulle part sur le site. Si la cliente demande ses données, ses notes lui sont remises.</span>
      </div>
      <div>
        <button type="submit" className="btn btn--outline" disabled={busy}>
          {busy ? "Un instant…" : "Ajouter la note"}
        </button>
      </div>
      {/* zones d'annonce présentes dès le départ : les lecteurs d'écran lisent ce qui s'y inscrit */}
      <p className="t-note" role="status">
        {message?.ok ? message.texte : ""}
      </p>
      <p className="field__error" role="alert">
        {message && !message.ok ? message.texte : ""}
      </p>
    </form>
  );
}
