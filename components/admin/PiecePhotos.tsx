"use client";
/**
 * Photos d'une pièce, depuis sa fiche dans l'Atelier : en ajouter, en retirer (après confirmation),
 * choisir la principale (la première, celle des listes) et écrire le texte que lisent les lecteurs
 * d'écran. Une pièce garde toujours au moins une photo. Le résultat s'affiche en mots simples.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";
import { deposerPhoto } from "./depot-photos";

export interface PhotoFiche {
  cle: string;
  src: string;
  alt: string;
  provisoire?: boolean;
}

export function PiecePhotos({ handle, photos, max }: { handle: string; photos: PhotoFiche[]; max: number }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [textes, setTextes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(corps: Record<string, unknown>, confirmer?: string) {
    if (confirmer && !window.confirm(confirmer)) return false;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/pieces/${handle}/photos`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setMessage({ ok: Boolean(res?.ok), texte: res?.ok ? String(j.message ?? "C’est fait.") : (j.error ?? "Les photos n’ont pas pu être modifiées. Merci de réessayer.") });
    if (res?.ok) router.refresh();
    return Boolean(res?.ok);
  }

  async function ajouter(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const ids: string[] = [];
    for (const file of Array.from(files).slice(0, max - photos.length)) {
      const depot = await deposerPhoto(atelier.api("/media"), file);
      if (depot) ids.push(depot.id);
    }
    setBusy(false);
    if (!ids.length) {
      setMessage({ ok: false, texte: "Ces photos n’ont pas pu être préparées. Essayez une autre photo." });
      return;
    }
    await envoyer({ action: "ajouter", mediaIds: ids });
  }

  return (
    <div className="stack-m">
      <ul className="piece-photos-liste">
        {photos.map((ph, i) => {
          const texte = textes[ph.cle] ?? ph.alt;
          const id = `alt-${i}`;
          return (
            <li key={ph.cle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt="" width={96} height={128} loading="lazy" />
              <div className="stack-s">
                <p className="t-note">
                  {i === 0 ? "Photo principale" : `Photo ${i + 1}`}
                  {ph.provisoire ? " · provisoire" : ""}
                </p>
                <div className="field">
                  <label className="field__label" htmlFor={id}>
                    Ce que montre la photo
                  </label>
                  <input id={id} className="field__input" value={texte} maxLength={240} onChange={(e) => setTextes((t) => ({ ...t, [ph.cle]: e.target.value }))} />
                  <span className="field__hint">Lu aux personnes aveugles et aux moteurs de recherche.</span>
                </div>
                <div className="piece-gestes">
                  {texte !== ph.alt ? (
                    <button type="button" className="btn btn--outline" disabled={busy} onClick={() => envoyer({ action: "texte", cle: ph.cle, alt: texte.trim() })}>
                      Enregistrer le texte
                    </button>
                  ) : null}
                  {i > 0 ? (
                    <button type="button" className="btn btn--outline" disabled={busy} onClick={() => envoyer({ action: "principale", cle: ph.cle })}>
                      Mettre en premier
                    </button>
                  ) : null}
                  {photos.length > 1 ? (
                    <button type="button" className="btn btn--link" disabled={busy} onClick={() => envoyer({ action: "retirer", cle: ph.cle }, "Retirer cette photo de la pièce ?")}>
                      Retirer
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {photos.length < max ? (
        <label className="dropzone">
          <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => ajouter(e.target.files)} />
          <span className="t-body">{busy ? "Un instant…" : "Ajouter des photos"}</span>
        </label>
      ) : (
        <p className="t-note">{max} photos au plus par pièce.</p>
      )}
      {/* zones d'annonce présentes dès le départ : les lecteurs d'écran lisent ce qui s'y inscrit */}
      <p className="t-note" role="status">
        {message?.ok ? message.texte : ""}
      </p>
      <p className="field__error" role="alert">
        {message && !message.ok ? message.texte : ""}
      </p>
    </div>
  );
}
