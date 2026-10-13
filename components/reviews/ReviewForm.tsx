"use client";
/**
 * Formulaire d'avis vérifié (lien personnel reçu après l'achat). Les photos sont redimensionnées et
 * recompressées dans le navigateur : les métadonnées (lieu, appareil) ne quittent jamais le téléphone.
 */
import { useId, useState } from "react";
import { Turnstile } from "@/components/security/Turnstile";

type Photo = { data: string; width: number; height: number; preview: string };

async function prepare(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return { data: url.split(",")[1], width: canvas.width, height: canvas.height, preview: url };
}

export function ReviewForm({ number, token, handle, title, size }: { number: string; token: string; handle: string; title: string; size: string }) {
  const id = useId();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [state, setState] = useState<{ status: "idle" | "busy" | "done" | "error"; message: string }>({ status: "idle", message: "" });
  if (state.status === "done") {
    return (
      <p className="t-body" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form
      className="stack-m review-form"
      aria-labelledby={`${id}-title`}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState({ status: "busy", message: "" });
        const res = await fetch("/api/avis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number,
            token,
            handle,
            body: f.get("body"),
            fit: f.get("fit") || undefined,
            photos: photos.map(({ data, width, height }) => ({ data, width, height })),
            consent: f.get("consent") === "on",
            turnstile: f.get("cf-turnstile-response") || undefined,
          }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setState(res?.ok ? { status: "done", message: j.message } : { status: "error", message: j.error ?? "Votre avis n’a pas pu être envoyé. Merci de réessayer." });
      }}
    >
      <h2 id={`${id}-title`} className="t-h3">
        {title} <span className="t-label t-soft">taille {size}</span>
      </h2>
      <div className="field">
        <label htmlFor={`${id}-body`} className="field__label">
          Comment la portez-vous ?
        </label>
        <textarea id={`${id}-body`} name="body" className="field__input" required minLength={20} maxLength={1500} />
      </div>
      <fieldset className="stack-s">
        <legend className="field__label">Le tombé</legend>
        {(
          [
            ["juste", "Taille juste"],
            ["petite", "Un peu petite"],
            ["grande", "Un peu grande"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="check t-note">
            <input type="radio" name="fit" value={value} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor={`${id}-photos`} className="field__label">
          Photos (facultatif, trois au plus)
        </label>
        <input
          id={`${id}-photos`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="field__input"
          onChange={async (e) => {
            const files = Array.from(e.currentTarget.files ?? []).slice(0, 3);
            setPhotos(await Promise.all(files.map(prepare)));
          }}
        />
        {photos.length ? (
          <ul className="review-form__photos">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local, jamais envoyé tel quel
              <li key={i}><img src={p.preview} alt={`Photo ${i + 1}`} width={p.width} height={p.height} /></li>
            ))}
          </ul>
        ) : null}
      </div>
      <label className="check t-note">
        <input type="checkbox" name="consent" required />
        <span>J’accepte que mon avis soit publié avec mon prénom et l’initiale de mon nom, après relecture par l’atelier.</span>
      </label>
      <Turnstile action="avis" />
      {state.status === "error" ? (
        <p className="field__error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={state.status === "busy"}>
          {state.status === "busy" ? "Envoi…" : "Envoyer mon avis"}
        </button>
      </div>
    </form>
  );
}
