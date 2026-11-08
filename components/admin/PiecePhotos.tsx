"use client";
/**
 * Photos d'une pièce, depuis sa fiche dans l'Atelier : en ajouter, en retirer (après confirmation),
 * choisir la principale (la première, celle des listes) et écrire le texte que lisent les lecteurs
 * d'écran. Une pièce garde toujours au moins une photo. Le résultat s'affiche en mots simples.
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  // après un changement d'ordre ou un retrait, le focus reste dans la liste des photos
  const liste = useRef<HTMLUListElement>(null);

  async function envoyer(corps: Record<string, unknown>, confirmer?: string) {
    if (confirmer && !window.confirm(confirmer)) return false;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/pieces/${handle}/photos`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setMessage({ ok: Boolean(res?.ok), texte: res?.ok ? String(j.message ?? "C’est fait.") : (j.error ?? "Les photos n’ont pas pu être modifiées. Merci de réessayer.") });
    if (res?.ok) {
      if (corps.action === "texte") setTextes(({ [String(corps.cle)]: _fait, ...reste }) => reste);
      if (corps.action === "principale" || corps.action === "retirer") liste.current?.focus();
      router.refresh();
    }
    return Boolean(res?.ok);
  }

  async function ajouter(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = ""; // la même photo peut être choisie de nouveau
    if (!files.length) return;
    setBusy(true);
    setMessage(null);
    const place = Math.max(0, max - photos.length);
    const ids: string[] = [];
    for (const file of files.slice(0, place)) {
      const depot = await deposerPhoto(atelier.api("/media"), file);
      if (depot) ids.push(depot.id);
    }
    setBusy(false);
    if (!ids.length) {
      setMessage({ ok: false, texte: "Ces photos n’ont pas pu être préparées. Essayez-en d’autres." });
      return;
    }
    const manquees = Math.min(files.length, place) - ids.length;
    const ecartees = files.length - place;
    const ok = await envoyer({ action: "ajouter", mediaIds: ids });
    const notes = [
      manquees > 0 ? (manquees > 1 ? `${manquees} photos n’ont pas pu être préparées.` : "Une photo n’a pas pu être préparée.") : "",
      ecartees > 0 ? `${max} photos au plus : ${ecartees > 1 ? `${ecartees} photos n’ont pas été ajoutées` : "une photo n’a pas été ajoutée"}.` : "",
    ].filter(Boolean);
    if (ok && notes.length) setMessage((m) => (m ? { ...m, texte: `${m.texte}. ${notes.join(" ")}` } : m));
  }

  return (
    <div className="stack-m">
      <ul className="piece-photos-liste" ref={liste} tabIndex={-1} aria-label="Photos de la pièce">
        {photos.map((ph, i) => {
          const texte = textes[ph.cle] ?? ph.alt;
          const id = `alt-${i}`;
          const modifie = texte.trim() !== ph.alt.trim();
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
                    Ce que montre la photo<span className="sr-only"> {i + 1}</span>
                  </label>
                  <input id={id} className="field__input" value={texte} maxLength={240} onChange={(e) => setTextes((t) => ({ ...t, [ph.cle]: e.target.value }))} />
                  <span className="field__hint">Lu aux personnes aveugles et aux moteurs de recherche.</span>
                </div>
                <div className="piece-gestes">
                  {modifie ? (
                    <button type="button" className="btn btn--outline" disabled={busy} aria-label={`Enregistrer le texte de la photo ${i + 1}`} onClick={() => envoyer({ action: "texte", cle: ph.cle, alt: texte.trim() })}>
                      Enregistrer le texte
                    </button>
                  ) : null}
                  {i > 0 ? (
                    <button type="button" className="btn btn--outline" disabled={busy} aria-label={`Mettre en premier la photo ${i + 1}`} onClick={() => envoyer({ action: "principale", cle: ph.cle })}>
                      Mettre en premier
                    </button>
                  ) : null}
                  {photos.length > 1 ? (
                    <button type="button" className="btn btn--link" disabled={busy} aria-label={`Retirer la photo ${i + 1}`} onClick={() => envoyer({ action: "retirer", cle: ph.cle }, `Retirer la photo ${i + 1} de la pièce ?`)}>
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
          <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => ajouter(e.currentTarget)} />
          <span className="t-body">{busy ? "Un instant…" : "Ajouter des photos"}</span>
        </label>
      ) : (
        <p className="t-note">
          {max} photos au plus par pièce{photos.length > max ? ` : le site montre les ${max} premières` : ""}.
        </p>
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
