"use client";
/**
 * Panneau d'un texte en cours de modification : il suit le texte dans la page. Longueur restante,
 * contrôle d'écriture en direct (signalements et suggestions, jamais bloquant), version anglaise
 * à côté, enregistrement du brouillon. Entrée enregistre un texte d'une ligne, Échap annule.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fixTypography, type WritingIssue } from "@/lib/writing/rules";
import { guardValue, ruleFor, writingFor } from "@/lib/edition/guard";
import { stegaClean } from "@/lib/edition/stega";
import { formatPath, parsePath } from "@/lib/edition/paths";
import { isProvisional, TEXTES_PROVISOIRES as P } from "@/lib/edition/provisoires";
import { postJson } from "./client";
import { valueOf, type Docs, type FieldTarget } from "./EditionMode";
import { setPageText } from "./scan";
import s from "./edition.module.css";

function usePlacement(el: HTMLElement) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean }>({ top: 0, left: 0, below: true });
  useLayoutEffect(() => {
    const place = () => {
      const r = el.getBoundingClientRect();
      const below = r.bottom + 320 < window.innerHeight || r.top < 320;
      setPos({ top: below ? r.bottom + 8 : r.top - 8, left: Math.max(16, Math.min(r.left, window.innerWidth - Math.min(480, window.innerWidth - 32) - 16)), below });
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [el]);
  return pos;
}

export function FieldPanel({ target, docs, api, onClose, onSaved }: { target: FieldTarget; docs: Docs; api: (p: string) => string; onClose: () => void; onSaved: (message?: string) => void }) {
  const { el, src, inline, raw, shown, attr } = target;
  const rule = ruleFor(src.path);
  const pos = usePlacement(el);
  const [value, setValue] = useState(raw);
  const [issues, setIssues] = useState<WritingIssue[]>(() => writingFor(src.path, raw, src.locale === "en" ? "en" : "fr"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const other = src.locale === "en" ? "fr" : "en";
  const otherRaw = valueOf(docs, { ...src, locale: other });
  const [translation, setTranslation] = useState(typeof otherRaw === "string" ? stegaClean(otherRaw) : "");
  const textarea = useRef<HTMLTextAreaElement>(null);
  // texte d'une photo provisoire (sa description, sa légende) : la pastille la rappelle
  const segments = parsePath(src.path);
  const parentValue = valueOf(docs, { ...src, path: formatPath(segments.slice(0, -1)) });
  const ofProvisional = isProvisional(parentValue) || (/^(legende|caption)$/i.test(String(segments[segments.length - 1] ?? "")) && isProvisional((parentValue as { image?: unknown } | undefined)?.image));

  // le texte modifié sur place est lu au fil de la frappe
  useEffect(() => {
    if (!inline) {
      textarea.current?.focus();
      return;
    }
    const onInput = () => {
      const v = stegaClean(el.textContent ?? "");
      setValue(v);
      setIssues(writingFor(src.path, v, src.locale === "en" ? "en" : "fr"));
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [el, inline, src.path, src.locale]);

  const cancel = () => {
    if (inline) setPageText(el, shown);
    onClose();
  };

  const save = async () => {
    const blocked = guardValue(src.path, raw, value);
    if (blocked) return setError(blocked);
    setBusy(true);
    setError("");
    const r = await postJson<{ issues: WritingIssue[] }>(api("/brouillon"), { doc: src.doc, locale: src.locale, path: src.path, value });
    if (r.ok && translation !== (typeof otherRaw === "string" ? stegaClean(otherRaw) : "") && translation.trim()) {
      const t = await postJson(api("/brouillon"), { doc: src.doc, locale: other, path: src.path, value: translation });
      if (!t.ok) {
        setBusy(false);
        return setError(`Version ${other === "en" ? "anglaise" : "française"} : ${t.data.error ?? "non enregistrée"}`);
      }
    }
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Le texte n’a pas été enregistré.");
    onSaved(r.data.issues?.length ? "Enregistré en brouillon. Le contrôle d’écriture signale encore un point : vous gardez le dernier mot." : "Enregistré en brouillon. Rien n’est en ligne avant « Publier ».");
  };

  const keep = async () => {
    await postJson(api("/acceptes"), { texte: value, raison: issues.map((i) => i.rule).join(", ") });
    setIssues([]);
  };

  const applyFix = () => {
    const fixed = fixTypography(value, src.locale === "en" ? "en" : "fr");
    setValue(fixed);
    if (inline) setPageText(el, fixed);
    setIssues(writingFor(src.path, fixed, src.locale === "en" ? "en" : "fr"));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Enter" && ((!rule.multiline && document.activeElement === el) || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void save();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  });

  const count = value.length;
  const near = count > rule.max * 0.9;
  const fixable = issues.some((i) => i.autofix);

  return (
    <div className={s.panel} style={{ top: pos.top, left: pos.left, transform: pos.below ? undefined : "translateY(-100%)" }} role="dialog" aria-label={`Modifier : ${rule.label}`}>
      <div className={s.panelHead}>
        <span className={s.label}>{attr ? (attr === "alt" ? "Description de l’image" : "Texte lu par les lecteurs d’écran") : rule.label}</span>
        <span className={near ? s.countNear : s.count} aria-live="polite">
          {count} / {rule.max}
        </span>
      </div>
      {ofProvisional ? (
        <p className={s.hint}>
          <span className={s.pastille}>{P.pastille}</span> {P.photoDuTexte}
        </p>
      ) : null}
      {inline ? (
        <p className={s.hint}>Écrivez directement dans la page. {rule.multiline ? "Ctrl et Entrée pour enregistrer." : "Entrée pour enregistrer."}</p>
      ) : (
        <textarea
          ref={textarea}
          className={s.input}
          value={value}
          rows={rule.multiline ? 6 : 2}
          aria-label={rule.label}
          onChange={(e) => {
            setValue(e.target.value);
            setIssues(writingFor(src.path, e.target.value, src.locale === "en" ? "en" : "fr"));
          }}
        />
      )}
      {/\{[a-zA-Z]/.test(raw) ? <p className={s.hint}>Les mots entre accolades, comme {raw.match(/\{[a-zA-Z]\w*\}/)?.[0]}, sont remplacés automatiquement : gardez-les.</p> : null}

      {issues.length ? (
        <div className={s.issues} role="status">
          {issues.slice(0, 4).map((i, k) => (
            <p key={k} className={i.severity === "erreur" ? s.issue : s.tip}>
              {i.message}
              {i.suggestion && !i.autofix ? <span className={s.suggestion}> {i.suggestion}</span> : null}
            </p>
          ))}
          <div className={s.row}>
            {fixable ? (
              <button type="button" className={s.btn} onClick={applyFix}>
                Corriger la typographie
              </button>
            ) : null}
            <button type="button" className={s.btnQuiet} onClick={keep}>
              Garder tel quel
            </button>
          </div>
        </div>
      ) : null}

      <label className={s.label} htmlFor="ed-traduction">
        {other === "en" ? "Version anglaise" : "Version française"}
      </label>
      <textarea id="ed-traduction" className={s.input} value={translation} rows={rule.multiline ? 4 : 2} placeholder={other === "en" ? "Pas encore traduit : le français s’affiche à la place." : ""} onChange={(e) => setTranslation(e.target.value)} />

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={s.row}>
        <button type="button" className={s.btnQuiet} onClick={cancel}>
          Annuler
        </button>
        <button type="button" className={s.btnSolid} onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
