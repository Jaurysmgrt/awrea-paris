"use client";
/**
 * Fenêtres de l'éditeur : aperçu sur téléphone, tablette et ordinateur ; historique des versions
 * avec retour en arrière en un clic ; publication programmée ; photos provisoires à remplacer ;
 * guide de prise en main.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { stegaClean } from "@/lib/edition/stega";
import { TEXTES_PROVISOIRES as P, type SitePhoto } from "@/lib/edition/provisoires";
import { call, postJson, thumb } from "./client";
import type { Docs } from "./EditionMode";
import s from "./edition.module.css";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

function Sheet({ label, onClose, wide, children }: { label: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => before?.focus?.();
  }, []);
  return (
    <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} className={wide ? `${s.sheet} ${s.sheetWide}` : s.sheet} role="dialog" aria-modal="true" aria-label={label} onKeyDown={(e) => e.key === "Escape" && onClose()}>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ aperçu

const FORMATS = [
  { id: "telephone", label: "Téléphone", width: 390, height: 844 },
  { id: "tablette", label: "Tablette", width: 820, height: 1180 },
  { id: "ordinateur", label: "Ordinateur", width: 1440, height: 900 },
] as const;

/** La page telle qu'elle sera, brouillon compris, dans la largeur de chaque écran. */
export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(FORMATS[0]);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const src = `${window.location.pathname}${window.location.search}${window.location.search ? "&" : "?"}apercu=1`;

  useEffect(() => {
    const fit = () => {
      const r = box.current?.getBoundingClientRect();
      if (r) setScale(Math.min(1, r.width / format.width, r.height / format.height));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [format]);

  return (
    <Sheet label="Aperçu de la page" onClose={onClose} wide>
      <div className={s.row}>
        <h2 className={s.sheetTitle}>Aperçu</h2>
        <div className={s.segmented} role="group" aria-label="Format d’écran">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === format.id} onClick={() => setFormat(f)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className={s.hint}>Les modifications pas encore publiées sont visibles ici, et seulement ici.</p>
      <div ref={box} className={s.preview}>
        <iframe
          title={`Aperçu sur ${format.label.toLowerCase()}`}
          src={src}
          className={s.previewFrame}
          width={format.width}
          height={format.height}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
      <div className={s.row}>
        <button type="button" className={s.btnSolid} onClick={onClose}>
          Fermer l’aperçu
        </button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ historique

interface VersionInfo {
  id: string;
  at: string;
  by: string;
  changed: string[];
  note?: string;
}

export function HistoryDialog({ docs, api, onClose, onRestored }: { docs: Docs; api: (p: string) => string; onClose: () => void; onRestored: () => Promise<void> }) {
  const ids = Object.keys(docs);
  const [doc, setDoc] = useState(ids[0] ?? "");
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!doc) return;
    let live = true;
    void call<{ versions: VersionInfo[] }>(`${api("/historique")}?doc=${encodeURIComponent(doc)}&locale=${locale}`).then((r) => {
      if (!live) return;
      setVersions(r.ok ? r.data.versions : []);
      if (!r.ok) setError(r.data.error ?? "L’historique ne s’est pas chargé.");
    });
    return () => {
      live = false;
    };
  }, [api, doc, locale]);

  const restore = async (v: VersionInfo) => {
    if (!window.confirm(`Remettre en ligne la version du ${when(v.at)} ? La version actuelle reste dans l’historique.`)) return;
    setBusy(v.id);
    const r = await postJson(api("/historique"), { doc, locale, version: v.id });
    setBusy("");
    if (!r.ok) return setError(r.data.error ?? "Le retour en arrière n’a pas abouti.");
    await onRestored();
  };

  return (
    <Sheet label="Historique des versions" onClose={onClose}>
      <h2 className={s.sheetTitle}>Historique</h2>
      <p className={s.hint}>Chaque publication est gardée. Un clic remet une ancienne version en ligne, et celle d’aujourd’hui reste ici.</p>
      <div className={s.row}>
        {ids.length > 1 ? (
          <label className={s.label}>
            Partie de la page
            <select className={s.input} value={doc} onChange={(e) => (setVersions(null), setDoc(e.target.value))}>
              {ids.map((id) => (
                <option key={id} value={id}>
                  {docs[id].info?.label ?? id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className={s.segmented} role="group" aria-label="Langue">
          {(["fr", "en"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => (setVersions(null), setLocale(l))}>
              {l === "fr" ? "Français" : "Anglais"}
            </button>
          ))}
        </div>
      </div>
      {versions === null ? (
        <p className={s.hint}>Chargement…</p>
      ) : versions.length ? (
        <ol className={s.versions}>
          {versions.map((v, i) => (
            <li key={v.id} className={s.version}>
              <div>
                <p className={s.versionDate}>
                  {when(v.at)}
                  {i === 0 ? <span className={s.current}> · en ligne</span> : null}
                </p>
                <p className={s.hint}>
                  {v.note ?? (v.changed.length ? `${v.changed.length} texte${v.changed.length > 1 ? "s" : ""} ou photo${v.changed.length > 1 ? "s" : ""} modifié${v.changed.length > 1 ? "s" : ""}` : "Version d’origine")}
                  {v.by && v.by !== "depot" ? ` par ${v.by}` : ""}
                </p>
              </div>
              {i > 0 ? (
                <button type="button" className={s.btn} onClick={() => restore(v)} disabled={Boolean(busy)}>
                  {busy === v.id ? "Un instant…" : "Remettre en ligne"}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className={s.hint}>Aucune publication depuis l’ouverture de l’éditeur. La première apparaîtra ici.</p>
      )}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={s.row}>
        <button type="button" className={s.btnQuiet} onClick={onClose}>
          Fermer
        </button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ programmation

const pad = (n: number) => String(n).padStart(2, "0");
/** au moins une minute à venir */
const isAhead = (d: Date) => !Number.isNaN(d.getTime()) && d.getTime() >= Date.now() + 60_000;
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function ScheduleDialog({ docs, api, onClose, onDone }: { docs: Docs; api: (p: string) => string; onClose: () => void; onDone: (message: string) => Promise<void> }) {
  const ids = Object.keys(docs);
  const pending = ids.filter((id) => docs[id].locales.fr.draft || docs[id].locales.en.draft);
  const programme = ids.flatMap((id) => docs[id].programme);
  const [at, setAt] = useState(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(9, 0, 0, 0);
    return localInput(tomorrow);
  });
  const [min] = useState(() => localInput(new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const schedule = async () => {
    const date = new Date(at);
    if (!isAhead(date)) return setError("Choisissez un moment à venir.");
    setBusy(true);
    const r = await postJson(api("/publier"), { docs: pending, at: date.toISOString() });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "La programmation n’a pas abouti.");
    await onDone(`Publication programmée le ${when(date.toISOString())}. D’ici là, le site ne change pas.`);
  };

  const cancel = async (id: string) => {
    const r = await call(`${api("/programme")}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return setError(r.data.error ?? "L’annulation n’a pas abouti.");
    await onDone("Programmation annulée. Les modifications restent en brouillon.");
  };

  return (
    <Sheet label="Programmer la publication" onClose={onClose}>
      <h2 className={s.sheetTitle}>Programmer</h2>
      <p className={s.hint}>La page passe en ligne toute seule au moment choisi, à l’heure de Paris. Vous pouvez encore la modifier ou annuler d’ici là.</p>
      <label className={s.label} htmlFor="ed-programme">
        Date et heure
      </label>
      <input id="ed-programme" type="datetime-local" className={s.input} value={at} min={min} onChange={(e) => setAt(e.target.value)} />
      {programme.length ? (
        <ul className={s.versions} aria-label="Déjà programmé">
          {programme.map((p) => (
            <li key={p.id} className={s.version}>
              <p className={s.versionDate}>
                {when(p.at)} · {p.locale === "en" ? "anglais" : "français"}
              </p>
              <button type="button" className={s.btnQuiet} onClick={() => cancel(p.id)}>
                Annuler
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={s.row}>
        <button type="button" className={s.btnQuiet} onClick={onClose}>
          Fermer
        </button>
        <button type="button" className={s.btnSolid} onClick={schedule} disabled={busy || !pending.length}>
          {busy ? "Un instant…" : "Programmer"}
        </button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ photos provisoires

/**
 * Filtre « Photos provisoires à remplacer » : toutes les photos provisoires du site, avec la page
 * où chacune paraît. Celles de la page ouverte se remplacent d'un clic ; les autres ouvrent leur
 * page, toujours en mode Édition. Les photos des pièces et des collections viennent du catalogue.
 */
export function ProvisionalDialog({ photos, onPage, onReplace, onClose }: { photos: SitePhoto[] | null; onPage: (p: SitePhoto) => boolean; onReplace: (p: SitePhoto) => void; onClose: () => void }) {
  const here = (photos ?? []).filter(onPage);
  const elsewhere = (photos ?? []).filter((p) => !onPage(p));
  const item = (p: SitePhoto, local: boolean) => {
    const name = stegaClean(p.image.alt) || p.label;
    return (
      <li key={p.id} className={s.photoItem}>
        <span className={s.photoThumb}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(p.image.src)} alt="" loading="lazy" />
          <span className={`${s.pastille} ${s.pastilleSurPhoto}`}>{P.pastille}</span>
        </span>
        <div className={s.stack}>
          <p className={s.photoTitle}>{p.label}</p>
          <p className={s.hint}>{p.chemin ?? P.sansPage}</p>
          {p.image.alt ? <p className={s.hint}>{stegaClean(p.image.alt)}</p> : null}
          {p.etat === "a-publier" ? <p className={s.hint}>{P.aPublier}</p> : null}
          {p.origine === "piece" ? <p className={s.hint}>{P.piece}</p> : p.origine === "collection" ? <p className={s.hint}>{P.collection}</p> : null}
        </div>
        {local && p.origine === "contenu" && p.etat === "a-remplacer" ? (
          <button type="button" className={s.btn} onClick={() => onReplace(p)} aria-label={`${P.remplacer}, ${name}`}>
            {P.remplacer}
          </button>
        ) : !local && p.chemin ? (
          <a className={s.btn} href={p.chemin} aria-label={`${P.ouvrir}, ${p.label}`}>
            {P.ouvrir}
          </a>
        ) : null}
      </li>
    );
  };
  return (
    <Sheet label={P.filtre} onClose={onClose}>
      <h2 className={s.sheetTitle}>{P.filtre}</h2>
      <p className={s.hint}>{P.intro}</p>
      {photos === null ? (
        <p className={s.hint}>{P.chargement}</p>
      ) : photos.length ? (
        <>
          {here.length ? (
            <section className={s.stack} aria-labelledby="ed-prov-ici">
              <h3 id="ed-prov-ici" className={s.label}>
                {P.surCettePage} · {here.length}
              </h3>
              <ul className={s.photos}>{here.map((p) => item(p, true))}</ul>
            </section>
          ) : null}
          {elsewhere.length ? (
            <section className={s.stack} aria-labelledby="ed-prov-ailleurs">
              <h3 id="ed-prov-ailleurs" className={s.label}>
                {P.ailleurs} · {elsewhere.length}
              </h3>
              <ul className={s.photos}>{elsewhere.map((p) => item(p, false))}</ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className={s.text}>{P.aucune}</p>
      )}
      <div className={s.row}>
        <button type="button" className={s.btnQuiet} onClick={onClose}>
          {P.fermer}
        </button>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------ guide

const STEPS: { title: string; text: string }[] = [
  {
    title: "Bienvenue dans l’édition",
    text: "Vous êtes sur le vrai site, et vous seule voyez ces outils. Tout ce que vous changez reste en brouillon : la page en ligne ne bouge pas tant que vous n’avez pas appuyé sur « Publier ».",
  },
  {
    title: "Changer un texte",
    text: "Cliquez sur un titre ou un paragraphe, puis écrivez directement dans la page. Le petit panneau compte les caractères et signale ce qui peut s’améliorer. Il propose, il n’impose rien.",
  },
  {
    title: "Changer une photo",
    text: "Glissez une photo depuis votre ordinateur sur l’image à remplacer, ou cliquez dessus. Un clic sur la photo choisit la partie à garder quand l’écran la recadre. Écrivez ensuite ce qu’elle montre, pour les personnes qui ne la voient pas.",
  },
  {
    title: "Remplacer les photos provisoires",
    text: "Une pastille « Provisoire » signale les visuels d’attente. « Photos provisoires » les liste tous, avec leur page. Votre photo déposée à la place n’est plus provisoire ; la case « Photo provisoire » se coche ou se décoche à la main.",
  },
  {
    title: "Composer une page",
    text: "Au survol d’une section, de petits boutons apparaissent : monter, descendre, dupliquer, supprimer, ajouter une section après. La bibliothèque ne propose que des sections dessinées pour la Maison.",
  },
  {
    title: "Vérifier, publier, revenir en arrière",
    text: "« Aperçu » montre la page sur téléphone, tablette et ordinateur. « Publier » la met en ligne, « Programmer » choisit le jour et l’heure. « Historique » garde chaque version et remet l’ancienne en ligne d’un clic.",
  },
];

export function Guide({ email, onClose }: { email: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  return (
    <Sheet label="Guide de l’édition" onClose={onClose}>
      <p className={s.label}>
        {step + 1} sur {STEPS.length}
      </p>
      <h2 className={s.sheetTitle}>{STEPS[step].title}</h2>
      <p className={s.text}>{STEPS[step].text}</p>
      {last ? <p className={s.hint}>Ce guide reste dans « Plus », puis « Aide ». Vous êtes connectée avec {email}.</p> : null}
      <div className={s.row}>
        {step > 0 ? (
          <button type="button" className={s.btnQuiet} onClick={() => setStep(step - 1)}>
            Revenir
          </button>
        ) : (
          <button type="button" className={s.btnQuiet} onClick={onClose}>
            Passer le guide
          </button>
        )}
        <button type="button" className={s.btnSolid} onClick={() => (last ? onClose() : setStep(step + 1))}>
          {last ? "Commencer" : "Suivant"}
        </button>
      </div>
    </Sheet>
  );
}
