"use client";
/** Nouvelle page à partir d'un modèle : un titre, une adresse, et la page s'ouvre en mode Édition. */
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

interface ModeleInfo {
  id: string;
  label: string;
  description: string;
  prefixe: string;
}

const slugOf = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function NewPageForm({ modeles }: { modeles: ModeleInfo[] }) {
  const atelier = useAtelier();
  const [modele, setModele] = useState(modeles[0]?.id ?? "");
  const [titre, setTitre] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = modeles.find((m) => m.id === modele);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch(atelier.api("/edition/pages"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modele, titre, slug: slug || slugOf(titre) }) }).catch(() => null);
        const json = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (!res?.ok) return setError(json.error ?? "La page n’a pas pu être créée.");
        window.location.href = json.ouvrir;
      }}
    >
      <fieldset className="field">
        <legend className="field__label">Modèle</legend>
        {modeles.map((m) => (
          <label key={m.id} className="check">
            <input type="radio" name="modele" value={m.id} checked={modele === m.id} onChange={() => setModele(m.id)} /> <span className="t-body t-left">{m.label}</span>
          </label>
        ))}
        {current ? <p className="field__hint">{current.description}</p> : null}
      </fieldset>
      <div className="field">
        <label className="field__label" htmlFor="page-titre">Titre</label>
        <input id="page-titre" className="field__input" required minLength={2} maxLength={90} value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="page-slug">Adresse</label>
        <input id="page-slug" className="field__input" maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder={slugOf(titre) || "pop-up-du-marais"} value={slug} onChange={(e) => setSlug(e.target.value)} />
        <p className="field__hint">La page sera à l’adresse {current?.prefixe ?? "/"}{slug || slugOf(titre) || "…"}. Lettres sans accent et chiffres, séparés par un trait d’union.</p>
      </div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <div>
        <button type="submit" className="btn" disabled={busy || titre.trim().length < 2}>
          {busy ? "Création…" : "Créer la page en brouillon"}
        </button>
      </div>
    </form>
  );
}
