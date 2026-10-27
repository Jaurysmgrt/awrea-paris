"use client";
/**
 * Outils des sections d'une page faite de blocs : au survol (ou au clavier) d'une section, la
 * monter, la descendre, la dupliquer, la supprimer, régler ses variantes, ou ajouter une section de
 * la bibliothèque juste après. Seules les variantes du design system sont proposées.
 */
import { useEffect, useState } from "react";
import { BLOCKS, blockDef, type Block, type FieldDef, type Lien } from "@/lib/edition/blocks";
import { stegaClean } from "@/lib/edition/stega";
import { BOUTON_MAX } from "@/lib/edition/guard";
import { call, postJson } from "./client";
import s from "./edition.module.css";

interface Hover {
  el: HTMLElement;
  doc: string;
  path: string;
  index: number;
  type: string;
  count: number;
}

export function BlockTools({ api, onChanged, flash }: { api: (p: string) => string; onChanged: () => Promise<void>; flash: (m: string) => void }) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [library, setLibrary] = useState<Hover | null>(null);
  const [settings, setSettings] = useState<Hover | null>(null);

  useEffect(() => {
    const pick = (e: Event) => {
      const t = e.target as Element;
      if (t.closest?.("[data-edition-ui]")) return;
      const el = t.closest?.<HTMLElement>("[data-ed-bloc]");
      const list = el?.closest<HTMLElement>("[data-ed-blocs]");
      if (!el || !list) return;
      const [doc, path] = list.dataset.edBlocs!.split("|");
      setHover({ el, doc, path, index: Number(el.dataset.edBloc), type: el.dataset.edType ?? "", count: list.querySelectorAll(":scope > [data-ed-bloc]").length });
      setRect(el.getBoundingClientRect());
    };
    const follow = () => setHover((h) => (h ? (setRect(h.el.getBoundingClientRect()), h) : h));
    document.addEventListener("mouseover", pick);
    document.addEventListener("focusin", pick);
    window.addEventListener("scroll", follow, { passive: true });
    return () => {
      document.removeEventListener("mouseover", pick);
      document.removeEventListener("focusin", pick);
      window.removeEventListener("scroll", follow);
    };
  }, []);

  const op = async (h: Hover, kind: "monter" | "descendre" | "dupliquer" | "supprimer" | "ajouter", type?: string) => {
    if (kind === "supprimer" && !window.confirm("Supprimer cette section ? Elle reste dans l’historique tant que la page n’est pas publiée.")) return;
    const r = await postJson(api("/blocs"), { doc: h.doc, path: h.path, op: kind, index: kind === "ajouter" ? h.index + 1 : h.index, type });
    if (!r.ok) return flash(r.data.error ?? "La section n’a pas été modifiée.");
    setHover(null);
    await onChanged();
  };

  const def = hover ? blockDef(hover.type) : undefined;
  const top = rect ? Math.max(8, rect.top + 8) : 0;

  return (
    <>
      {hover && rect && rect.bottom > 0 && rect.top < window.innerHeight ? (
        <div className={s.blockTools} style={{ top, left: Math.max(8, rect.right - 8) }} role="toolbar" aria-label={`Section ${hover.index + 1} : ${def?.label ?? "section"}`}>
          <span className={s.blockName}>{def?.label ?? "Section"}</span>
          <button type="button" onClick={() => op(hover, "monter")} disabled={hover.index === 0} aria-label="Monter la section">
            Monter
          </button>
          <button type="button" onClick={() => op(hover, "descendre")} disabled={hover.index >= hover.count - 1} aria-label="Descendre la section">
            Descendre
          </button>
          <button type="button" onClick={() => op(hover, "dupliquer")}>
            Dupliquer
          </button>
          {def?.fields.some((f) => ["choix", "lien", "pieces", "notes", "video"].includes(f.kind)) ? (
            <button type="button" onClick={() => setSettings(hover)}>
              Réglages
            </button>
          ) : null}
          <button type="button" onClick={() => op(hover, "supprimer")}>
            Supprimer
          </button>
          <button type="button" className={s.add} onClick={() => setLibrary(hover)}>
            Ajouter une section après
          </button>
        </div>
      ) : null}

      {library ? (
        <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && setLibrary(null)}>
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Bibliothèque de sections" onKeyDown={(e) => e.key === "Escape" && setLibrary(null)}>
            <h2 className={s.sheetTitle}>Ajouter une section</h2>
            <ul className={s.blockLibrary}>
              {BLOCKS.map((b) => (
                <li key={b.type}>
                  <button
                    type="button"
                    onClick={async () => {
                      const h = library;
                      setLibrary(null);
                      await op(h, "ajouter", b.type);
                    }}
                  >
                    <span className={s.blockLabel}>{b.label}</span>
                    <span className={s.hint}>{b.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={s.row}>
              <button type="button" className={s.btnQuiet} onClick={() => setLibrary(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settings ? <BlockSettings target={settings} api={api} onClose={() => setSettings(null)} onSaved={async () => (setSettings(null), await onChanged())} /> : null}
    </>
  );
}

function BlockSettings({ target, api, onClose, onSaved }: { target: Hover; api: (p: string) => string; onClose: () => void; onSaved: () => Promise<void> }) {
  const def = blockDef(target.type)!;
  const [block, setBlock] = useState<Block | null>(null);
  const [products, setProducts] = useState<{ handle: string; title: string }[]>([]);
  const [error, setError] = useState("");
  const base = `${target.path}.${target.index}`;

  useEffect(() => {
    void (async () => {
      const r = await call<{ docs: Record<string, { locales: { fr: { draft: unknown; published: unknown } } }> }>(`${api("/documents")}?ids=${target.doc}`);
      const d = r.data.docs?.[target.doc]?.locales.fr;
      const list = (d?.draft ?? d?.published) as Record<string, unknown> | undefined;
      const at = target.path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], list);
      setBlock(Array.isArray(at) ? (at[target.index] as Block) : null);
      if (def.fields.some((f) => f.kind === "pieces")) {
        const p = await call<{ products: { handle: string; title: string }[] }>("/api/products");
        setProducts(p.data.products ?? []);
      }
    })();
  }, [api, def.fields, target.doc, target.index, target.path]);

  const save = async (f: FieldDef, payload: Record<string, unknown>) => {
    const r = await postJson(api("/brouillon"), { doc: target.doc, locale: "fr", path: `${base}.${f.key}`, ...payload });
    if (!r.ok) return setError(r.data.error ?? "Réglage non enregistré."), false;
    return true;
  };

  if (!block) return null;
  return (
    <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Réglages : ${def.label}`}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          for (const f of def.fields) {
            if (f.kind === "choix" && !(await save(f, { choice: String(form.get(f.key)) }))) return;
            if (f.kind === "lien") {
              const label = String(form.get(`${f.key}-label`) ?? "").trim();
              const href = String(form.get(`${f.key}-href`) ?? "").trim();
              if (!(await save(f, { link: label && href ? { label, href } : null }))) return;
            }
            if (f.kind === "pieces" && !(await save(f, { list: form.getAll(f.key).map(String).slice(0, f.max ?? 8) }))) return;
          }
          await onSaved();
        }}
      >
        <h2 className={s.sheetTitle}>{def.label}</h2>
        {def.fields.map((f) => {
          if (f.kind === "choix")
            return (
              <fieldset key={f.key} className={s.fieldset}>
                <legend className={s.label}>{f.label}</legend>
                {f.options!.map((o) => (
                  <label key={o.value} className={s.choice}>
                    <input type="radio" name={f.key} value={o.value} defaultChecked={stegaClean(String(block[f.key] ?? "")) === o.value} /> {o.label}
                  </label>
                ))}
              </fieldset>
            );
          if (f.kind === "lien") {
            const l = (block[f.key] as Lien | null) ?? null;
            return (
              <fieldset key={f.key} className={s.fieldset}>
                <legend className={s.label}>{f.label}</legend>
                <label className={s.hint} htmlFor={`${f.key}-label`}>
                  Texte du bouton ({BOUTON_MAX} caractères au plus)
                </label>
                <input id={`${f.key}-label`} name={`${f.key}-label`} className={s.input} maxLength={BOUTON_MAX} defaultValue={l ? stegaClean(l.label) : ""} />
                <label className={s.hint} htmlFor={`${f.key}-href`}>
                  Adresse de la page (par exemple /boutique ou /rendez-vous)
                </label>
                <input id={`${f.key}-href`} name={`${f.key}-href`} className={s.input} defaultValue={l?.href ?? ""} pattern="(/[^/].*|/|https://.+|mailto:.+)" />
              </fieldset>
            );
          }
          if (f.kind === "pieces") {
            const chosen = Array.isArray(block[f.key]) ? (block[f.key] as string[]).map(stegaClean) : [];
            return (
              <fieldset key={f.key} className={s.fieldset}>
                <legend className={s.label}>
                  {f.label} ({f.max} au plus)
                </legend>
                <div className={s.checks}>
                  {products.map((p) => (
                    <label key={p.handle} className={s.choice}>
                      <input type="checkbox" name={f.key} value={p.handle} defaultChecked={chosen.includes(p.handle)} /> {p.title}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          return null;
        })}
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={s.row}>
          <button type="button" className={s.btnQuiet} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={s.btnSolid}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
