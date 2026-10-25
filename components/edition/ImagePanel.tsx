"use client";
/**
 * Panneau d'une photo : la remplacer (glisser-déposer, choisir un fichier, ou reprendre une photo
 * déjà déposée), régler son point focal d'un clic, écrire sa description pour les personnes qui ne
 * la voient pas. Jamais d'image inventée : seulement les photographies de la Maison.
 *
 * Photo provisoire (lib/edition/provisoires.ts) : pastille « Provisoire » sur l'aperçu et dans la
 * médiathèque, case « Photo provisoire » à décocher ; une photo remplacée par un envoi n'est plus
 * provisoire, sauf si la créatrice coche la case.
 */
import { useEffect, useRef, useState } from "react";
import { guardValue, writingFor } from "@/lib/edition/guard";
import { stegaClean } from "@/lib/edition/stega";
import type { Img } from "@/lib/edition/blocks";
import { provisionalAfterReplace, TEXTES_PROVISOIRES as P } from "@/lib/edition/provisoires";
import { call, postJson, shrink, thumb as preview } from "./client";
import { valueOf, type Docs, type ImageTarget } from "./EditionMode";
import s from "./edition.module.css";

type Media = Img & { id: string; name: string };


export function ImagePanel({ target, docs, api, onClose, onSaved }: { target: ImageTarget; docs: Docs; api: (p: string) => string; onClose: () => void; onSaved: (message?: string) => void }) {
  const current = (valueOf(docs, target.src) as Img | undefined) ?? { src: "", alt: "", width: 1200, height: 1500 };
  const [img, setImg] = useState<Img>({ ...current, alt: stegaClean(current.alt ?? ""), focal: current.focal ?? { x: 50, y: 50 } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState<Media[] | null>(null);
  // case « Photo provisoire » : cochée pour un visuel d'attente ; `touched` quand la créatrice l'a réglée elle-même
  const [box, setBox] = useState({ checked: current.provisoire === true, touched: false });
  const [replaced, setReplaced] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("fichier", await shrink(file), file.name);
    if (box.touched && box.checked) body.append("provisoire", "1");
    const r = await call<{ image: Media }>(api("/medias"), { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "La photo n’a pas été déposée.");
    setImg((x) => ({ ...r.data.image, alt: r.data.image.alt || x.alt, focal: { x: 50, y: 50 } }));
    // la nouvelle photo n'est plus provisoire, sauf si la case a été cochée
    setBox((b) => ({ ...b, checked: provisionalAfterReplace(b, r.data.image) }));
    setReplaced(true);
  };

  const pick = (m: Media) => {
    setImg((x) => ({ ...m, alt: m.alt || x.alt, focal: m.focal ?? { x: 50, y: 50 } }));
    setBox((b) => ({ ...b, checked: provisionalAfterReplace(b, m) }));
    setReplaced(true);
  };

  // photo déposée directement sur l'image de la page
  useEffect(() => {
    dialog.current?.focus();
    if (!target.file) return;
    const t = window.setTimeout(() => void upload(target.file!), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const blocked = img.src ? guardValue(`${target.src.path}.alt`, undefined, img.alt) : null;
    if (blocked) return setError(blocked);
    setBusy(true);
    const r = await postJson(api("/brouillon"), { doc: target.src.doc, locale: target.src.locale, path: target.src.path, image: { src: img.src, alt: img.alt, width: img.width, height: img.height, focal: img.focal, provisoire: Boolean(img.src) && box.checked } });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "La photo n’a pas été enregistrée.");
    onSaved("Photo enregistrée en brouillon. Rien n’est en ligne avant « Publier ».");
  };

  const issues = img.alt ? writingFor(`${target.src.path}.alt`, img.alt, target.src.locale === "en" ? "en" : "fr").filter((i) => i.severity === "erreur") : [];

  return (
    <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        tabIndex={-1}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la photo"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
      >
        <h2 className={s.sheetTitle}>Photo</h2>
        <div className={s.imageEdit}>
          <div
            className={s.focal}
            role="button"
            tabIndex={0}
            aria-label="Cliquez sur la photo pour choisir la partie à garder quand elle est recadrée"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setImg((x) => ({ ...x, focal: { x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) } }));
            }}
          >
            {img.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview(img.src)} alt="" />
            ) : (
              <span className={s.empty}>Aucune photo pour l’instant</span>
            )}
            {img.src && img.focal ? <span className={s.focalPoint} style={{ left: `${img.focal.x}%`, top: `${img.focal.y}%` }} aria-hidden="true" /> : null}
            {img.src && box.checked ? <span className={`${s.pastille} ${s.pastilleSurPhoto}`}>{P.pastille}</span> : null}
          </div>
          <div className={s.stack}>
            <p className={s.hint}>Glissez une photo ici, ou choisissez-la. Elle est allégée et déclinée en plusieurs tailles. Un clic sur la photo règle la partie à garder quand l’écran la recadre.</p>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <div className={s.row}>
              <button type="button" className={s.btn} onClick={() => input.current?.click()} disabled={busy}>
                {busy ? "Traitement…" : "Choisir une photo"}
              </button>
              <button
                type="button"
                className={s.btn}
                onClick={async () => {
                  const r = await call<{ medias: Media[] }>(api("/medias"));
                  setLibrary(r.ok ? r.data.medias : []);
                }}
              >
                Photos déjà déposées
              </button>
              {img.src ? (
                <button type="button" className={s.btnQuiet} onClick={() => setImg((x) => ({ ...x, src: "" }))}>
                  Retirer la photo
                </button>
              ) : null}
            </div>
            <label className={s.label} htmlFor="ed-alt">
              Description pour les personnes qui ne voient pas la photo
            </label>
            <textarea id="ed-alt" className={s.input} rows={3} value={img.alt} maxLength={180} onChange={(e) => setImg((x) => ({ ...x, alt: e.target.value }))} />
            <p className={s.hint}>La pièce, la matière, la pose, le fond. Sans « image de ».</p>
            {issues.map((i, k) => (
              <p key={k} className={s.issue}>
                {i.message}
              </p>
            ))}
            {img.src ? (
              <>
                <label className={s.choice}>
                  <input type="checkbox" checked={box.checked} aria-describedby="ed-provisoire-aide" onChange={(e) => setBox({ checked: e.target.checked, touched: true })} />
                  {P.case}
                </label>
                <p id="ed-provisoire-aide" className={s.hint}>
                  {P.caseAide}
                </p>
                {replaced && !box.checked ? (
                  <p className={s.hint} role="status">
                    {P.remplacee}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {library ? (
          <ul className={s.library} aria-label="Photos déjà déposées">
            {library.length ? (
              library.map((m) => (
                <li key={m.id} className={s.libraryItem}>
                  <button type="button" onClick={() => pick(m)} aria-label={m.provisoire ? `${m.alt || m.name}, ${P.case.toLowerCase()}` : m.alt || m.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview(m.src)} alt="" />
                  </button>
                  {m.provisoire ? (
                    <span className={`${s.pastille} ${s.pastilleSurPhoto}`} aria-hidden="true">
                      {P.pastille}
                    </span>
                  ) : null}
                </li>
              ))
            ) : (
              <li className={s.hint}>Aucune photo déposée pour l’instant.</li>
            )}
          </ul>
        ) : null}
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={s.row}>
          <button type="button" className={s.btnQuiet} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={s.btnSolid} onClick={save} disabled={busy}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
