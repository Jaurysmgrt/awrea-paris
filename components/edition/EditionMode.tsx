"use client";
/**
 * L'éditeur visuel « Édition », posé sur la vraie page du site (mode Édition seulement).
 *
 * Cliquer sur un texte le rend modifiable sur place ; un panneau suit le texte : longueur, contrôle
 * d'écriture avec ses suggestions, version anglaise à côté. Les photos se remplacent par
 * glisser-déposer. Les sections d'une page faite de blocs se déplacent, se dupliquent, se
 * suppriment, s'ajoutent depuis la bibliothèque. Rien n'est en ligne avant « Publier ».
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getAt, parsePath } from "@/lib/edition/paths";
import { stegaClean, type Source } from "@/lib/edition/stega";
import { call, postJson } from "./client";
import { editableInPlace, parseKey, scan, setEditable } from "./scan";
import { FieldPanel } from "./FieldPanel";
import { ImagePanel } from "./ImagePanel";
import { BlockTools } from "./BlockTools";
import { Guide, HistoryDialog, PreviewDialog, ScheduleDialog } from "./Dialogs";
import s from "./edition.module.css";

export interface LocaleData {
  draft: unknown;
  published: unknown;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  versions: number;
}
export interface DocData {
  info: { id: string; label: string; chemin?: string; blocs?: string } | null;
  locales: Record<"fr" | "en", LocaleData>;
  programme: { id: string; doc: string; locale: string; at: string; by: string }[];
}
export type Docs = Record<string, DocData>;

export interface FieldTarget {
  el: HTMLElement;
  src: Source;
  inline: boolean;
  /** valeur enregistrée (avec ses repères {…}) */
  raw: string;
  /** texte affiché avant la modification, pour annuler */
  shown: string;
  /** attribut modifié (texte alternatif, libellé lu par les lecteurs d'écran) au lieu du contenu */
  attr?: string;
}

export interface ImageTarget {
  el: HTMLElement;
  src: Source;
  /** photo déposée directement sur l'image de la page */
  file?: File;
}

type Dialog = "historique" | "programmer" | "apercu" | "aide" | null;

/** Valeur d'un champ dans les données chargées (brouillon s'il existe). */
export function valueOf(docs: Docs, src: Source): unknown {
  const d = docs[src.doc]?.locales[src.locale as "fr" | "en"];
  if (!d) return undefined;
  return getAt(d.draft ?? d.published, parsePath(src.path));
}

export function EditionMode({ base, email, guideDone }: { base: string; email: string; guideDone: boolean }) {
  const router = useRouter();
  const [docs, setDocs] = useState<Docs>({});
  const [mode, setMode] = useState<"modifier" | "naviguer">("modifier");
  const [field, setField] = useState<FieldTarget | null>(null);
  const [image, setImage] = useState<ImageTarget | null>(null);
  const [dialog, setDialog] = useState<Dialog>(guideDone ? null : "aide");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = useRef<string[]>([]);
  const api = useCallback((p: string) => `${base}/api/edition${p}`, [base]);

  const load = useCallback(async () => {
    if (!ids.current.length) return;
    const r = await call<{ docs: Docs }>(`${api("/documents")}?ids=${ids.current.join(",")}`);
    if (r.ok) setDocs(r.data.docs);
  }, [api]);

  // repérage des textes et images de la page, à chaque rendu
  useEffect(() => {
    let timer = 0;
    const run = () => {
      const found = scan();
      const next = [...found.docs].sort();
      if (next.join() !== ids.current.join()) {
        ids.current = next;
        void load();
      }
    };
    run();
    const mo = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 150);
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["alt", "aria-label"] });
    document.documentElement.dataset.edition = "1";
    return () => {
      mo.disconnect();
      delete document.documentElement.dataset.edition;
    };
  }, [load]);

  useEffect(() => {
    document.documentElement.dataset.editionMode = mode;
  }, [mode]);

  const flash = useCallback((m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice((x) => (x === m ? "" : x)), 6000);
  }, []);

  const refresh = useCallback(async () => {
    await load();
    router.refresh();
  }, [load, router]);

  // un clic sur un texte ou une photo l'ouvre ; en mode « modifier », les liens ne partent pas
  useEffect(() => {
    const open = (target: Element, e: Event) => {
      if (target.closest("[data-edition-ui]")) return false;
      const imgEl = target.closest<HTMLElement>("[data-ed-img]");
      if (imgEl) {
        setField(null);
        setImage({ el: imgEl, src: parseKey(imgEl.dataset.edImg!) });
        return true;
      }
      const el = target.closest<HTMLElement>("[data-ed-src]");
      if (el) {
        const src = parseKey(el.dataset.edSrc!);
        const raw = valueOf(docs, src);
        const shown = el.textContent ?? "";
        const rawText = typeof raw === "string" ? raw : stegaClean(shown);
        const inline = editableInPlace(el) && stegaClean(shown).trim() === rawText.trim() && !/\{[a-zA-Z]/.test(rawText);
        setImage(null);
        setField({ el, src, inline, raw: rawText, shown });
        if (inline && e instanceof MouseEvent) {
          setEditable(el, true);
          el.focus();
          const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
          if (pos) {
            const sel = window.getSelection();
            sel?.collapse(pos.offsetNode, pos.offset);
          }
        }
        return true;
      }
      const attrEl = target.closest<HTMLElement>("[data-ed-attr]");
      if (attrEl) {
        const [attr, k] = attrEl.dataset.edAttr!.split("~");
        const src = parseKey(k);
        const raw = valueOf(docs, src);
        setImage(null);
        setField({ el: attrEl, src, inline: false, raw: typeof raw === "string" ? raw : stegaClean(attrEl.getAttribute(attr) ?? ""), shown: attrEl.getAttribute(attr) ?? "", attr });
        return true;
      }
      return false;
    };
    const onClick = (e: MouseEvent) => {
      if (mode !== "modifier") return;
      const t = e.target as Element;
      if (t.closest("[data-edition-ui]")) return;
      if (t.closest("[contenteditable='plaintext-only']")) return;
      if (open(t, e)) {
        e.preventDefault();
        e.stopPropagation();
      } else if (t.closest("a[href], button, [role=button]")) {
        e.preventDefault();
        e.stopPropagation();
        flash("Pour suivre un lien ou ouvrir un menu, passez en mode « Naviguer ».");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "modifier" || e.key !== "Enter") return;
      const t = e.target as Element;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      if (t.matches?.("[data-ed-src], [data-ed-img]") && open(t, e)) e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [docs, mode, flash]);

  // déposer une photo directement sur une image de la page
  useEffect(() => {
    const over = (e: DragEvent) => {
      const el = (e.target as Element).closest?.("[data-ed-img]");
      if (!el || !e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      el.setAttribute("data-ed-drop", "1");
    };
    const leave = (e: DragEvent) => (e.target as Element).closest?.("[data-ed-img]")?.removeAttribute("data-ed-drop");
    const drop = (e: DragEvent) => {
      const el = (e.target as Element).closest?.<HTMLElement>("[data-ed-img]");
      if (!el) return;
      e.preventDefault();
      el.removeAttribute("data-ed-drop");
      const file = e.dataTransfer?.files?.[0];
      if (file) setImage({ el, src: parseKey(el.dataset.edImg!), file });
    };
    document.addEventListener("dragover", over);
    document.addEventListener("dragleave", leave);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragover", over);
      document.removeEventListener("dragleave", leave);
      document.removeEventListener("drop", drop);
    };
  }, []);

  const pageDocs = Object.keys(docs);
  const pending = pageDocs.filter((id) => docs[id].locales.fr.draft || docs[id].locales.en.draft);
  const programme = pageDocs.flatMap((id) => docs[id].programme);

  const publish = async () => {
    setBusy(true);
    const r = await postJson(api("/publier"), { docs: pageDocs });
    setBusy(false);
    if (!r.ok) return flash(r.data.error ?? "La publication n’a pas abouti.");
    flash("C’est en ligne. Le site public montre maintenant cette version.");
    await refresh();
  };

  const discard = async () => {
    if (!window.confirm("Effacer toutes les modifications non publiées de cette page ? La version en ligne ne change pas.")) return;
    setBusy(true);
    for (const id of pending) for (const locale of ["fr", "en"] as const) if (docs[id].locales[locale].draft) await postJson(api("/brouillon"), { doc: id, locale, abandon: true });
    setBusy(false);
    flash("Modifications effacées. La page est revenue à la version en ligne.");
    await refresh();
  };

  const leave = async () => {
    await postJson(api("/sortir"), {});
    window.location.href = window.location.pathname + window.location.search;
  };

  const status = programme.length
    ? `Publication programmée le ${new Date(programme[0].at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`
    : pending.length
      ? "Modifiée, pas encore en ligne"
      : "Identique à la version en ligne";

  return createPortal(
    <div data-edition-ui="" className={s.root}>
      {mode === "modifier" ? <BlockTools api={api} onChanged={refresh} flash={flash} /> : null}
      {field ? (
        <FieldPanel
          key={`${field.src.doc}|${field.src.path}|${field.attr ?? ""}`}
          target={field}
          docs={docs}
          api={api}
          onClose={() => {
            if (field.inline) setEditable(field.el, false);
            setField(null);
          }}
          onSaved={async (m) => {
            if (field.inline) setEditable(field.el, false);
            setField(null);
            if (m) flash(m);
            await refresh();
          }}
        />
      ) : null}
      {image ? (
        <ImagePanel
          key={`${image.src.doc}|${image.src.path}`}
          target={image}
          docs={docs}
          api={api}
          onClose={() => setImage(null)}
          onSaved={async (m) => {
            setImage(null);
            if (m) flash(m);
            await refresh();
          }}
        />
      ) : null}

      <div className={s.dock} role="region" aria-label="Édition de la page">
        <div className={s.dockState}>
          <span className={s.dockTitle}>Édition</span>
          <span className={s.dockStatus} role="status">
            {status}
          </span>
        </div>
        <div className={s.dockActions}>
          <div className={s.segmented} role="group" aria-label="Que fait un clic">
            <button type="button" aria-pressed={mode === "modifier"} onClick={() => setMode("modifier")}>
              Modifier
            </button>
            <button type="button" aria-pressed={mode === "naviguer"} onClick={() => setMode("naviguer")}>
              Naviguer
            </button>
          </div>
          <button type="button" className={s.btn} onClick={() => setDialog("apercu")}>
            Aperçu
          </button>
          <button type="button" className={s.btn} onClick={() => setDialog("historique")} disabled={!pageDocs.length}>
            Historique
          </button>
          <button type="button" className={s.btn} onClick={() => setDialog("programmer")} disabled={!pending.length}>
            Programmer
          </button>
          <button type="button" className={s.btnSolid} onClick={publish} disabled={busy || !pending.length}>
            {busy ? "Un instant…" : "Publier"}
          </button>
          <details className={s.more}>
            <summary className={s.btn}>Plus</summary>
            <div className={s.menu}>
              <button type="button" onClick={discard} disabled={!pending.length}>
                Effacer les modifications
              </button>
              <button type="button" onClick={() => setDialog("aide")}>
                Aide
              </button>
              <a href={base}>Retour à l’Atelier</a>
              <button type="button" onClick={leave}>
                Quitter l’édition
              </button>
            </div>
          </details>
        </div>
        {notice ? (
          <p className={s.notice} role="alert">
            {notice}
          </p>
        ) : null}
      </div>

      {dialog === "apercu" ? <PreviewDialog onClose={() => setDialog(null)} /> : null}
      {dialog === "historique" ? <HistoryDialog docs={docs} api={api} onClose={() => setDialog(null)} onRestored={async () => (setDialog(null), flash("La version choisie est de nouveau en ligne."), await refresh())} /> : null}
      {dialog === "programmer" ? (
        <ScheduleDialog
          docs={docs}
          api={api}
          onClose={() => setDialog(null)}
          onDone={async (m) => {
            setDialog(null);
            flash(m);
            await refresh();
          }}
        />
      ) : null}
      {dialog === "aide" ? (
        <Guide
          email={email}
          onClose={() => {
            setDialog(null);
            if (!guideDone) void postJson(api("/guide"), {});
          }}
        />
      ) : null}
    </div>,
    document.body,
  );
}
