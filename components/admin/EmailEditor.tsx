"use client";
/**
 * Éditeur d'e-mails de l'Atelier : composer un e-mail en blocs (glisser-déposer pour les déplacer),
 * écrire ses textes avec le contrôle d'écriture et les garde-fous de l'éditeur visuel, le voir tel
 * qu'il arrive dans Gmail, Apple Mail ou Outlook, sur ordinateur ou téléphone, en clair ou en
 * sombre, s'envoyer un essai, publier, revenir à une version précédente, l'exporter vers Brevo,
 * Klaviyo ou Shopify. Le brouillon s'enregistre tout seul ; rien ne part avant « Publier ».
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { EMAIL_BLOCKS, emailBlockDef, createEmailBlock, type EmailBlock, type EmailDoc } from "@/lib/email/blocks";
import { duplicateBlock, type FieldDef, type Img, type Lien } from "@/lib/edition/blocks";
import { guardValue, ruleFor, writingFor } from "@/lib/edition/guard";
import { fixTypography } from "@/lib/writing/rules";
import { useAtelier } from "./AtelierContext";
import s from "./email-editor.module.css";

type Client = "apple" | "gmail" | "outlook";
const CLIENTS: { id: Client; label: string }[] = [
  { id: "apple", label: "Apple Mail" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
];

interface Version {
  id: string;
  at: string;
  by: string;
  changed: string[];
}

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { cache: "no-store", ...init }).catch(() => null);
  const data = (res ? await res.json().catch(() => ({})) : { error: "Le réseau ne répond pas. Le brouillon sera enregistré au prochain essai." }) as T & { error?: string };
  return { ok: Boolean(res?.ok), data };
}
const post = <T,>(url: string, body: unknown) => api<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ------------------------------------------------------------------ champ de texte

function TextField({ path, label, value, multiline, onChange }: { path: string; label: string; value: string; multiline?: boolean; onChange: (v: string) => void }) {
  const rule = ruleFor(path);
  const issues = value && !/^\[[^\]]+\]$/.test(value.trim()) ? writingFor(path, value).filter((i) => i.severity === "erreur") : [];
  const blocked = guardValue(path, undefined, value);
  const id = `f-${path}`;
  return (
    <div className={s.field}>
      <div className={s.fieldHead}>
        <label htmlFor={id} className={s.label}>
          {label}
        </label>
        <span className={value.length > rule.max * 0.9 ? s.countNear : s.count}>
          {value.length} / {rule.max}
        </span>
      </div>
      {multiline ? (
        <textarea id={id} className={s.input} rows={5} value={value} maxLength={rule.max} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className={s.input} value={value} maxLength={rule.max} onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))} />
      )}
      {/^\[[^\]]+\]$/.test(value.trim()) ? <p className={s.hint}>Texte à écrire : tant qu’il reste entre crochets, ce bloc n’apparaît pas dans l’e-mail.</p> : null}
      {blocked && value.trim() ? <p className={s.issue}>{blocked}</p> : null}
      {issues.slice(0, 3).map((i, k) => (
        <p key={k} className={s.issue}>
          {i.message}
          {i.suggestion && !i.autofix ? <span className={s.hint}> {i.suggestion}</span> : null}
        </p>
      ))}
      {issues.some((i) => i.autofix) ? (
        <button type="button" className={s.quiet} onClick={() => onChange(fixTypography(value, "fr"))}>
          Corriger la typographie
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ photographie

function ImageField({ value, onChange }: { value: Img; onChange: (v: Img) => void }) {
  const atelier = useAtelier();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("fichier", file, file.name);
    const r = await api<{ image: Img }>(atelier.api("/edition/medias"), { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "La photo n’a pas été déposée.");
    onChange({ ...r.data.image, alt: r.data.image.alt || value.alt });
  };
  const thumb = value.src ? (value.src.startsWith("/api/") || /\.(webp|jpe?g|png)$/i.test(value.src) ? value.src : `${value.src}-480.webp`) : "";
  return (
    <div
      className={s.image}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        e.preventDefault();
        e.stopPropagation();
        void upload(f);
      }}
    >
      <div className={s.thumb}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" />
        ) : (
          <span className={s.hint}>Glissez une photographie ici</span>
        )}
      </div>
      <div className={s.stack}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" className={s.btn} onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Traitement…" : value.src ? "Changer la photographie" : "Choisir une photographie"}
        </button>
        <TextField path="image.alt" label="Ce que montre la photographie" value={value.alt} multiline onChange={(alt) => onChange({ ...value, alt })} />
        {error ? <p className={s.issue}>{error}</p> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ un bloc

function BlockFields({ block, index, doc, products, onChange }: { block: EmailBlock; index: number; doc: EmailDoc; products: { handle: string; title: string }[]; onChange: (b: EmailBlock) => void }) {
  const def = emailBlockDef(block.type);
  if (!def) return null;
  const set = (k: string, v: unknown) => onChange({ ...block, [k]: v });
  const vars = Object.keys(doc.variables);
  const field = (f: FieldDef) => {
    const path = `blocs.${index}.${f.key}`;
    switch (f.kind) {
      case "texte":
      case "texte-long":
        return <TextField key={f.key} path={path} label={f.label} value={String(block[f.key] ?? "")} multiline={f.kind === "texte-long"} onChange={(v) => set(f.key, v)} />;
      case "image":
        return <ImageField key={f.key} value={(block[f.key] as Img) ?? { src: "", alt: "", width: 1200, height: 1500 }} onChange={(v) => set(f.key, v)} />;
      case "lien": {
        const l = (block[f.key] as Lien | null) ?? { label: "", href: "" };
        return (
          <div key={f.key} className={s.pair}>
            <TextField path={`${path}.label`} label="Texte du bouton" value={l.label} onChange={(label) => set(f.key, { ...l, label })} />
            <div className={s.field}>
              <label className={s.label} htmlFor={`${path}-href`}>
                Page ouverte
              </label>
              <input id={`${path}-href`} className={s.input} value={l.href} placeholder="/boutique" onChange={(e) => set(f.key, { ...l, href: e.target.value.trim() })} />
            </div>
          </div>
        );
      }
      case "pieces":
        return (
          <div key={f.key} className={s.field}>
            <label className={s.label} htmlFor={path}>
              {f.label}
            </label>
            <select id={path} className={s.input} value={String((block[f.key] as string[] | undefined)?.[0] ?? "")} onChange={(e) => set(f.key, e.target.value ? [e.target.value] : [])}>
              <option value="">Choisir une pièce</option>
              {products.map((p) => (
                <option key={p.handle} value={p.handle}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        );
      case "choix":
        return (
          <fieldset key={f.key} className={s.choices}>
            <legend className={s.label}>{f.label}</legend>
            {f.options!.map((o) => (
              <label key={o.value} className={s.choice}>
                <input type="radio" name={`${block.id}-${f.key}`} checked={block[f.key] === o.value} onChange={() => set(f.key, o.value)} /> {o.label}
              </label>
            ))}
          </fieldset>
        );
      default:
        return null;
    }
  };
  return (
    <div className={s.stack}>
      {def.fields.map(field)}
      {def.fields.length === 0 ? <p className={s.hint}>{def.description}</p> : null}
      {vars.length && block.type !== "entete" && block.type !== "pied" ? (
        <div className={s.field}>
          <label className={s.label} htmlFor={`${block.id}-cond`}>
            Ce bloc paraît
          </label>
          <select
            id={`${block.id}-cond`}
            className={s.input}
            value={block.si ? `si:${block.si}` : block.sauf ? `sauf:${block.sauf}` : ""}
            onChange={(e) => {
              const [k, v] = e.target.value.split(":");
              const { si: _si, sauf: _sauf, ...rest } = block;
              onChange(k === "si" ? { ...rest, si: v } : k === "sauf" ? { ...rest, sauf: v } : rest);
            }}
          >
            <option value="">Toujours</option>
            {vars.map((v) => (
              <option key={`si-${v}`} value={`si:${v}`}>
                Seulement quand il y a : {doc.variables[v].description.toLowerCase()}
              </option>
            ))}
            {vars.map((v) => (
              <option key={`sauf-${v}`} value={`sauf:${v}`}>
                Seulement sans : {doc.variables[v].description.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ éditeur

export function EmailEditor({ id, initial, draftAt, publishedAt, products }: { id: string; initial: EmailDoc; draftAt: string | null; publishedAt: string | null; products: { handle: string; title: string }[] }) {
  const atelier = useAtelier();
  const [doc, setDoc] = useState<EmailDoc>(initial);
  const [open, setOpen] = useState<string | null>(initial.blocs.find((b) => b.type === "texte")?.id ?? null);
  const [status, setStatus] = useState(draftAt ? `Brouillon enregistré le ${when(draftAt)}` : publishedAt ? `En ligne depuis le ${when(publishedAt)}` : "Version d’origine");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<Client>("apple");
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [cas, setCas] = useState<Record<string, boolean>>({});
  const [html, setHtml] = useState("");
  const [subjectShown, setSubjectShown] = useState({ subject: "", preheader: "" });
  const [library, setLibrary] = useState(false);
  const [history, setHistory] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState("");
  const drag = useRef<number | null>(null);

  const change = useCallback((next: EmailDoc) => {
    setDoc(next);
    setDirty(true);
    setStatus("Modifications en cours…");
  }, []);
  const setBlock = (i: number, b: EmailBlock) => change({ ...doc, blocs: doc.blocs.map((x, k) => (k === i ? b : x)) });

  // brouillon enregistré tout seul, un instant après la dernière frappe
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(async () => {
      const r = await post<{ issues: unknown[] }>(atelier.api("/edition/email"), { id, locale: "fr", doc });
      if (!r.ok) {
        setError(r.data.error ?? "Le brouillon n’a pas été enregistré.");
        setStatus("Brouillon non enregistré");
        return;
      }
      setError("");
      setDirty(false);
      setStatus("Brouillon enregistré. Rien ne part avant « Publier ».");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [atelier, dirty, doc, id]);

  // aperçu, à chaque changement
  useEffect(() => {
    const t = window.setTimeout(async () => {
      const r = await post<{ html: string; subject: string; preheader: string }>(atelier.api("/edition/email/apercu"), { id, locale: "fr", doc, client, dark, cas });
      if (r.ok) {
        setHtml(r.data.html);
        setSubjectShown({ subject: r.data.subject, preheader: r.data.preheader });
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [atelier, cas, client, dark, doc, id]);

  const add = (type: string) => {
    const b = createEmailBlock(type);
    if (!b) return;
    const footer = doc.blocs.findIndex((x) => x.type === "pied");
    const at = footer === -1 ? doc.blocs.length : footer;
    change({ ...doc, blocs: [...doc.blocs.slice(0, at), b, ...doc.blocs.slice(at)] });
    setOpen(b.id);
    setLibrary(false);
  };

  const publish = async () => {
    setBusy("publier");
    if (dirty) await post(atelier.api("/edition/email"), { id, locale: "fr", doc });
    const r = await post(atelier.api("/edition/publier"), { docs: [id] });
    setBusy("");
    if (!r.ok) return setError(r.data.error ?? "La publication n’a pas abouti.");
    setDirty(false);
    setStatus("Publié. Les prochains envois partiront avec cette version.");
  };

  const test = async () => {
    setBusy("essai");
    if (dirty) await post(atelier.api("/edition/email"), { id, locale: "fr", doc });
    const r = await post<{ delivered: boolean; to: string }>(atelier.api("/edition/email/test"), { id, locale: "fr" });
    setBusy("");
    if (!r.ok) return setError(r.data.error ?? "L’essai n’est pas parti.");
    setStatus(r.data.delivered ? `Essai envoyé à ${r.data.to}.` : `Essai rangé dans la boîte d’envoi (aucun service d’envoi branché).`);
  };

  const loadHistory = async () => {
    const r = await api<{ versions: Version[] }>(`${atelier.api("/edition/historique")}?doc=${id}&locale=fr`);
    setHistory(r.ok ? r.data.versions : []);
  };

  const restore = async (v: Version) => {
    if (!window.confirm(`Remettre en service la version du ${when(v.at)} ? La version actuelle reste dans l’historique.`)) return;
    const r = await post(atelier.api("/edition/historique"), { doc: id, locale: "fr", version: v.id });
    if (!r.ok) return setError(r.data.error ?? "Le retour en arrière n’a pas abouti.");
    window.location.reload();
  };

  const vars = Object.entries(doc.variables);

  return (
    <div className={s.editor}>
      <div className={s.compose}>
        <div className={s.bar}>
          <p className={s.status} role="status">
            {status}
          </p>
          <div className={s.actions}>
            <button type="button" className={s.btn} onClick={test} disabled={Boolean(busy)}>
              {busy === "essai" ? "Envoi…" : "M’envoyer un essai"}
            </button>
            <button type="button" className={s.btn} onClick={loadHistory}>
              Historique
            </button>
            <button type="button" className={s.solid} onClick={publish} disabled={Boolean(busy)}>
              {busy === "publier" ? "Un instant…" : "Publier"}
            </button>
          </div>
        </div>
        {error ? (
          <p className={s.issue} role="alert">
            {error}
          </p>
        ) : null}

        <section className={s.card} aria-labelledby="enveloppe">
          <h2 id="enveloppe" className={s.cardTitle}>
            Objet et ligne d’aperçu
          </h2>
          <TextField path="sujet" label="Objet" value={doc.sujet} onChange={(sujet) => change({ ...doc, sujet })} />
          <TextField path="preheader" label="Ligne d’aperçu" value={doc.preheader} onChange={(preheader) => change({ ...doc, preheader })} />
          {vars.length ? (
            <div className={s.hint}>
              <p>Ces repères sont remplacés à l’envoi. Gardez les accolades.</p>
              <ul className={s.vars}>
                {vars.map(([k, v]) => (
                  <li key={k}>
                    <code>{`{${k}}`}</code> {v.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <ol className={s.blocks} aria-label="Blocs de l’e-mail">
          {doc.blocs.map((b, i) => {
            const def = emailBlockDef(b.type);
            const isOpen = open === b.id;
            return (
              <li
                key={b.id}
                className={s.block}
                data-open={isOpen || undefined}
                onDragOver={(e) => drag.current !== null && e.preventDefault()}
                onDrop={(e) => {
                  if (drag.current === null) return;
                  e.preventDefault();
                  change({ ...doc, blocs: move(doc.blocs, drag.current, i) });
                  drag.current = null;
                }}
              >
                <div className={s.blockHead}>
                  <span
                    className={s.handle}
                    draggable
                    onDragStart={(e) => {
                      drag.current = i;
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => (drag.current = null)}
                    aria-hidden="true"
                  >
                    ⠿
                  </span>
                  <button type="button" className={s.blockName} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}>
                    {def?.label ?? b.type}
                    {b.si ? <span className={s.cond}> · seulement avec {doc.variables[b.si]?.description.toLowerCase()}</span> : null}
                    {b.sauf ? <span className={s.cond}> · seulement sans {doc.variables[b.sauf]?.description.toLowerCase()}</span> : null}
                  </button>
                  <div className={s.tools}>
                    <button type="button" onClick={() => change({ ...doc, blocs: move(doc.blocs, i, i - 1) })} disabled={i === 0} aria-label="Monter le bloc">
                      Monter
                    </button>
                    <button type="button" onClick={() => change({ ...doc, blocs: move(doc.blocs, i, i + 1) })} disabled={i === doc.blocs.length - 1} aria-label="Descendre le bloc">
                      Descendre
                    </button>
                    <button type="button" onClick={() => change({ ...doc, blocs: [...doc.blocs.slice(0, i + 1), duplicateBlock(b), ...doc.blocs.slice(i + 1)] })}>
                      Dupliquer
                    </button>
                    <button type="button" onClick={() => window.confirm("Supprimer ce bloc ? Il reste dans l’historique.") && change({ ...doc, blocs: doc.blocs.filter((_, k) => k !== i) })}>
                      Supprimer
                    </button>
                  </div>
                </div>
                {isOpen ? (
                  <div className={s.blockBody}>
                    <BlockFields block={b} index={i} doc={doc} products={products} onChange={(nb) => setBlock(i, nb)} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {library ? (
          <ul className={s.library} aria-label="Bibliothèque de blocs">
            {EMAIL_BLOCKS.map((b) => (
              <li key={b.type}>
                <button type="button" onClick={() => add(b.type)}>
                  <span className={s.libLabel}>{b.label}</span>
                  <span className={s.hint}>{b.description}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <button type="button" className={s.btn} onClick={() => setLibrary(!library)} aria-expanded={library}>
            {library ? "Fermer la bibliothèque" : "Ajouter un bloc"}
          </button>
        </div>

        <section className={s.card} aria-labelledby="exporter">
          <h2 id="exporter" className={s.cardTitle}>
            Exporter la version publiée
          </h2>
          <p className={s.hint}>Pour un service d’envoi : le gabarit garde sa mise en page, et les repères prennent la syntaxe du service.</p>
          <div className={s.actions}>
            <a className={s.btn} href={`${atelier.api("/edition/email/export")}?id=${id}&pour=brevo`}>
              Pour Brevo
            </a>
            <a className={s.btn} href={`${atelier.api("/edition/email/export")}?id=${id}&pour=klaviyo`}>
              Pour Klaviyo
            </a>
            {doc.famille === "commande" ? (
              <a className={s.btn} href={`${atelier.api("/edition/email/export")}?id=${id}&pour=shopify`}>
                Pour Shopify
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className={s.preview}>
        <div className={s.previewBar}>
          <div className={s.segmented} role="group" aria-label="Messagerie">
            {CLIENTS.map((c) => (
              <button key={c.id} type="button" aria-pressed={client === c.id} onClick={() => setClient(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className={s.segmented} role="group" aria-label="Écran">
            <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>
              Ordinateur
            </button>
            <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>
              Téléphone
            </button>
          </div>
          <div className={s.segmented} role="group" aria-label="Thème">
            <button type="button" aria-pressed={!dark} onClick={() => setDark(false)}>
              Clair
            </button>
            <button type="button" aria-pressed={dark} onClick={() => setDark(true)}>
              Sombre
            </button>
          </div>
        </div>
        {doc.blocs.some((b) => b.si || b.sauf) ? (
          <fieldset className={s.choices}>
            <legend className={s.label}>Essayer un cas</legend>
            {vars
              .filter(([k]) => doc.blocs.some((b) => b.si === k || b.sauf === k))
              .map(([k, v]) => (
                <label key={k} className={s.choice}>
                  <input type="checkbox" checked={cas[k] !== false} onChange={(e) => setCas({ ...cas, [k]: e.target.checked })} /> {v.description}
                </label>
              ))}
          </fieldset>
        ) : null}
        <div className={s.inbox}>
          <p className={s.subject}>{subjectShown.subject}</p>
          <p className={s.hint}>{subjectShown.preheader}</p>
        </div>
        <div className={s.frameBox} data-mobile={mobile || undefined}>
          <iframe title="Aperçu de l’e-mail" className={s.frame} sandbox="" srcDoc={html} />
        </div>
        <p className={s.hint}>Les rendus suivent les règles connues de chaque messagerie. Un essai envoyé à vous-même reste la vérification finale.</p>
      </div>

      {history ? (
        <div className={s.backdrop} onClick={(e) => e.target === e.currentTarget && setHistory(null)}>
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Historique de l’e-mail" onKeyDown={(e) => e.key === "Escape" && setHistory(null)}>
            <h2 className={s.cardTitle}>Historique</h2>
            {history.length ? (
              <ol className={s.versions}>
                {history.map((v, i) => (
                  <li key={v.id}>
                    <span>
                      {when(v.at)}
                      {i === 0 ? " · en service" : ""}
                    </span>
                    {i > 0 ? (
                      <button type="button" className={s.btn} onClick={() => restore(v)}>
                        Remettre en service
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.hint}>Aucune publication pour l’instant.</p>
            )}
            <div>
              <button type="button" className={s.quiet} onClick={() => setHistory(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
