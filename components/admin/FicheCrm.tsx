"use client";
/**
 * Fiche d'une personne dans l'Atelier (CRM) : corriger ses coordonnées, et la désinscrire de la
 * lettre à sa demande. Jamais l'inverse : l'abonnement ne vient que de son propre consentement.
 * Textes très courts, résultat dit en mots simples, page mise à jour sans rechargement.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

type Message = { ok: boolean; texte: string } | null;

function Annonces({ message }: { message: Message }) {
  return (
    <>
      <p className="t-note" role="status">
        {message?.ok ? message.texte : ""}
      </p>
      <p className="field__error" role="alert">
        {message && !message.ok ? message.texte : ""}
      </p>
    </>
  );
}

export function ModifierFiche({ id, prenom, nom, telephone }: { id: string; prenom: string; nom: string; telephone: string }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // seulement ce qui a changé : une valeur lue ailleurs (compte, commande) n'est pas recopiée
    const avant = { prenom, nom, telephone };
    const patch = Object.fromEntries((["prenom", "nom", "telephone"] as const).map((k) => [k, String(f.get(k) ?? "").trim()] as const).filter(([k, v]) => v !== avant[k]));
    if (!Object.keys(patch).length) {
      setMessage({ ok: true, texte: "Rien n’a changé." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/clientes/${encodeURIComponent(id)}/fiche`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, texte: j.error ?? "La fiche n’a pas pu être enregistrée. Merci de réessayer." });
      return;
    }
    setMessage({ ok: true, texte: "Fiche enregistrée." });
    router.refresh();
  }

  return (
    <form className="stack-s" onSubmit={enregistrer}>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="fiche-prenom">
            Prénom
          </label>
          <input id="fiche-prenom" name="prenom" className="field__input" defaultValue={prenom} maxLength={80} autoComplete="off" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="fiche-nom">
            Nom
          </label>
          <input id="fiche-nom" name="nom" className="field__input" defaultValue={nom} maxLength={80} autoComplete="off" />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="fiche-telephone">
          Téléphone
        </label>
        <input id="fiche-telephone" name="telephone" type="tel" className="field__input" defaultValue={telephone} maxLength={24} autoComplete="off" />
      </div>
      <div>
        <button type="submit" className="btn btn--outline" disabled={busy}>
          {busy ? "Un instant…" : "Enregistrer la fiche"}
        </button>
      </div>
      <Annonces message={message} />
    </form>
  );
}

export function DesinscrireFiche({ id }: { id: string }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function desinscrire() {
    if (!window.confirm("Désinscrire cette personne de la lettre ? Elle ne recevra plus aucun e-mail de la Maison, hors ses commandes.")) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/clientes/${encodeURIComponent(id)}/desinscrire`), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, texte: j.error ?? "La désinscription n’a pas abouti. Merci de réessayer." });
      return;
    }
    setMessage({ ok: true, texte: "Désinscrite." });
    router.refresh();
  }

  return (
    <div className="stack-s">
      <div>
        <button type="button" className="btn btn--outline" onClick={desinscrire} disabled={busy}>
          {busy ? "Un instant…" : "Désinscrire de la lettre"}
        </button>
      </div>
      <Annonces message={message} />
    </div>
  );
}
