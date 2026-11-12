"use client";
/**
 * Éditeur d'e-mails de l'Atelier, pensé comme Brevo ou Mailchimp (retour du 10/11 : « un truc
 * vraiment intuitif où tu peux écrire, mettre une photo, la décaler à droite, à gauche, en bas, où
 * tu veux, choisir la typo ») :
 * - l'e-mail est au centre, tel qu'il arrive dans Apple Mail, Gmail ou Outlook ; un clic sur un bloc
 *   le choisit ; une photo glissée sur un bloc photo prend sa place, ailleurs elle s'ajoute à cet
 *   endroit ;
 * - à côté, trois onglets : « Blocs » (l'ordre, glisser pour déplacer, ajouter un bloc), « Réglages »
 *   (les mots et la photo du bloc choisi, sa police, sa taille, son alignement, ses espaces, la
 *   largeur de la photo) et « Envoi » (objet, ligne d'aperçu, export) ;
 * - annuler et rétablir (boutons, ou Ctrl ou Cmd + Z hors d'un champ) ; brouillon enregistré tout
 *   seul ; rien ne part avant « Publier ».
 * L'identité reste tenue : les trois polices de la Maison, des tailles prévues, des espaces sur la
 * grille de 8 px (lib/email/blocks.ts, EmailStyle). L'aperçu est un cadre sans script : l'éditeur
 * y lit seulement les clics et les photos déposées.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ALIGNEMENTS,
  EMAIL_BLOCKS,
  ESPACE_MAX,
  HAUTEUR_MAX,
  LARGEUR_MIN,
  LIEN_TEXTE,
  POLICES,
  REGLAGES,
  STYLE_PAR_DEFAUT,
  TAILLES,
  createEmailBlock,
  emailBlockDef,
  sansLiens,
  styleOf,
  type EmailBlock,
  type EmailDoc,
} from "@/lib/email/blocks";
import { duplicateBlock, type FieldDef, type Img, type Lien } from "@/lib/edition/blocks";
import { guardValue, ruleFor, writingFor } from "@/lib/edition/guard";
import { fixTypography } from "@/lib/writing/rules";
import { useAtelier } from "./AtelierContext";
import { AtelierIcone, type NomIcone } from "./AtelierIcone";
import s from "./email-editor.module.css";

type Client = "apple" | "gmail" | "outlook";
const CLIENTS: { id: Client; label: string }[] = [
  { id: "apple", label: "Apple Mail" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
];
type Onglet = "blocs" | "reglages" | "envoi";
const ONGLETS: { id: Onglet; label: string }[] = [
  { id: "blocs", label: "Blocs" },
  { id: "reglages", label: "Réglages" },
  { id: "envoi", label: "Envoi" },
];
const ICONE_BLOC: Record<string, NomIcone> = {
  entete: "entete",
  titre: "titre",
  texte: "texte",
  image: "photos",
  "photo-texte": "photo-texte",
  "deux-photos": "deux-photos",
  produit: "produits",
  bouton: "bouton",
  commande: "commandes",
  separateur: "filet",
  espace: "espace",
  signature: "signature",
  pied: "pied",
};
const ICONE_ALIGN: Record<string, NomIcone> = { gauche: "aligner-gauche", centre: "aligner-centre", droite: "aligner-droite" };
const PHOTOS = new Set(["image", "photo-texte", "deux-photos"]);
/**
 * Largeur de la fenêtre simulée : un e-mail de 600 px avec ses marges (au-delà de 620 px, la mise en
 * page d'ordinateur) ou un téléphone de 375 px. Plus étroite, la colonne réduit l'aperçu à l'échelle
 * au lieu de basculer dans la mise en page du téléphone.
 */
const FENETRE = { ordinateur: 680, telephone: 375 } as const;
const MAX_BLOCS = 30;

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
const isTodoText = (v: string) => /^\[[^\]]+\]$/.test(v.trim());
/** adresses permises pour un lien : une page du site, une adresse https, un e-mail */
const adresseOk = (a: string) => /^(https:\/\/[^\s()<>"{}]+|\/(?!\/)[^\s()<>"{}]*|mailto:[^\s()<>"{}]+)$/.test(a);

async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { cache: "no-store", ...init }).catch(() => null);
  const data = (res ? await res.json().catch(() => ({})) : { error: "Le réseau ne répond pas. Le brouillon sera enregistré au prochain essai." }) as T & { error?: string };
  return { ok: Boolean(res?.ok), data };
}
const post = <T,>(url: string, body: unknown) => api<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Dépôt d'une photo dans la médiathèque de l'Atelier (même traitement que l'éditeur du site). */
function useUpload() {
  const atelier = useAtelier();
  return useCallback(
    async (file: File): Promise<{ image?: Img; error?: string }> => {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return { error: "Choisissez une photo en JPEG, PNG, WebP ou AVIF." };
      const body = new FormData();
      body.append("fichier", file, file.name);
      const r = await api<{ image: Img }>(atelier.api("/edition/medias"), { method: "POST", body });
      return r.ok ? { image: r.data.image } : { error: r.data.error ?? "La photo n’a pas été déposée." };
    },
    [atelier],
  );
}

/** Aperçu de l'éditeur : le bloc choisi porte un filet (règles de lib/email/render.ts). */
function marquer(d: Document, id: string | null, defiler: boolean) {
  d.querySelectorAll("[data-choisi]").forEach((el) => el.removeAttribute("data-choisi"));
  const el = id ? d.querySelector(`tbody[data-bloc="${CSS.escape(id)}"]`) : null;
  el?.setAttribute("data-choisi", "");
  if (defiler && el) el.querySelector("td")?.scrollIntoView({ block: "nearest" });
}

// ------------------------------------------------------------------ petits contrôles

/** Un choix parmi quelques valeurs, en boutons côte à côte. */
function Choix<T extends string>({ label, value, options, icones, onChange }: { label: string; value: T; options: { value: T; label: string }[]; icones?: Record<string, NomIcone>; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="field">
      <span className="field__label" id={id}>
        {label}
      </span>
      <div className={s.segmented} role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {icones?.[o.value] ? <AtelierIcone nom={icones[o.value]} /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Un curseur (espaces, largeur de la photo), avec sa valeur en clair. */
function Curseur({ label, value, min, max, step, unite, onChange }: { label: string; value: number; min: number; max: number; step: number; unite: string; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="field">
      <div className={s.fieldHead}>
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        <output htmlFor={id} className={s.count}>
          {value} {unite}
        </output>
      </div>
      <input id={id} className={s.range} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// ------------------------------------------------------------------ champ de texte

function TextField({ path, label, value, multiline, liens, onChange }: { path: string; label: string; value: string; multiline?: boolean; liens?: boolean; onChange: (v: string) => void }) {
  const rule = ruleFor(path);
  const plain = sansLiens(value);
  const issues = value && !isTodoText(value) ? writingFor(path, plain).filter((i) => i.severity === "erreur") : [];
  const blocked = guardValue(path, undefined, value);
  const id = `f-${path}`;
  const area = useRef<HTMLTextAreaElement>(null);
  const [lien, setLien] = useState<{ mots: string; adresse: string; from: number; to: number } | null>(null);
  const presents = liens ? [...value.matchAll(LIEN_TEXTE)] : [];

  const ouvrirLien = () => {
    const el = area.current;
    const from = el?.selectionStart ?? value.length;
    const to = el?.selectionEnd ?? value.length;
    setLien({ mots: value.slice(from, to).trim(), adresse: "", from, to });
  };
  const inserer = () => {
    if (!lien || !lien.mots.trim() || !adresseOk(lien.adresse.trim())) return;
    const md = `[${lien.mots.trim().replace(/[[\]\n]/g, " ")}](${lien.adresse.trim()})`;
    onChange(value.slice(0, lien.from) + md + value.slice(lien.to));
    setLien(null);
  };

  return (
    <div className="field">
      <div className={s.fieldHead}>
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        <span className={value.length > rule.max * 0.9 ? s.countNear : s.count}>
          {value.length} / {rule.max}
        </span>
      </div>
      {multiline ? (
        <textarea ref={area} id={id} className="field__input" rows={6} value={value} maxLength={rule.max} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="field__input" value={value} maxLength={rule.max} onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))} />
      )}
      {liens ? (
        <div className={s.toolbar}>
          <button type="button" className={s.tool} onClick={ouvrirLien} aria-expanded={Boolean(lien)}>
            <AtelierIcone nom="lien" />
            Ajouter un lien
          </button>
          <span className={s.hint}>Sélectionnez des mots puis « Ajouter un lien ».</span>
        </div>
      ) : null}
      {lien ? (
        <div className={s.linkForm}>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-mots`}>
              Mots du lien
            </label>
            <input id={`${id}-mots`} className="field__input" value={lien.mots} maxLength={80} onChange={(e) => setLien({ ...lien, mots: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-adresse`}>
              Adresse
            </label>
            <input id={`${id}-adresse`} className="field__input" value={lien.adresse} placeholder="/boutique ou https://…" inputMode="url" onChange={(e) => setLien({ ...lien, adresse: e.target.value })} />
            {lien.adresse && !adresseOk(lien.adresse.trim()) ? <p className={s.issue}>Une page du site (« /boutique »), une adresse en https ou un e-mail en mailto.</p> : null}
          </div>
          <div className={s.actions}>
            <button type="button" className="btn" onClick={inserer} disabled={!lien.mots.trim() || !adresseOk(lien.adresse.trim())}>
              Insérer le lien
            </button>
            <button type="button" className="btn btn--link" onClick={() => setLien(null)}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}
      {presents.length ? (
        <ul className={s.links} aria-label="Liens du texte">
          {presents.map((m, k) => (
            <li key={`${m.index}-${k}`}>
              <span>
                « {m[1]} » vers {m[2]}
              </span>
              <button type="button" className="btn btn--link" onClick={() => onChange(value.slice(0, m.index) + m[1] + value.slice((m.index ?? 0) + m[0].length))}>
                Retirer le lien
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isTodoText(value) ? <p className={s.hint}>Texte à écrire : tant qu’il reste entre crochets, ce bloc ne part pas dans l’e-mail.</p> : null}
      {blocked && value.trim() ? <p className={s.issue}>{blocked}</p> : null}
      {issues.slice(0, 3).map((i, k) => (
        <p key={k} className={s.issue}>
          {i.message}
          {i.suggestion && !i.autofix ? <span className={s.hint}> {i.suggestion}</span> : null}
        </p>
      ))}
      {issues.some((i) => i.autofix) ? (
        <button type="button" className={`btn btn--link ${s.start}`} onClick={() => onChange(fixTypography(value, "fr"))}>
          Corriger la typographie
        </button>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ photographie

function ImageField({ path, label, value, onChange }: { path: string; label: string; value: Img; onChange: (v: Img) => void }) {
  const upload = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [survol, setSurvol] = useState(false);
  const send = async (file: File) => {
    setBusy(true);
    setError("");
    const r = await upload(file);
    setBusy(false);
    if (!r.image) return setError(r.error ?? "La photo n’a pas été déposée.");
    onChange({ ...r.image, alt: r.image.alt || value.alt });
  };
  const thumb = value.src ? (value.src.startsWith("/api/") || /\.(webp|jpe?g|png)$/i.test(value.src) ? value.src : `${value.src}-480.webp`) : "";
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div
        className={s.drop}
        data-survol={survol || undefined}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          setSurvol(false);
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          e.preventDefault();
          e.stopPropagation();
          void send(f);
        }}
      >
        <div className={s.thumb}>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" />
          ) : (
            <AtelierIcone nom="photos" />
          )}
        </div>
        <div className={s.stack}>
          <p className={s.hint}>{busy ? "Traitement de la photo…" : "Glissez une photo ici, ou choisissez-la."}</p>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
          <div className={s.actions}>
            <button type="button" className="btn btn--outline" onClick={() => input.current?.click()} disabled={busy}>
              {value.src ? "Changer la photo" : "Choisir une photo"}
            </button>
            {value.src ? (
              <button type="button" className="btn btn--link" onClick={() => onChange({ ...value, src: "" })}>
                Retirer la photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? <p className={s.issue}>{error}</p> : null}
      <TextField path={`${path}.alt`} label="Ce que montre la photo" value={value.alt} onChange={(alt) => onChange({ ...value, alt })} />
    </div>
  );
}

// ------------------------------------------------------------------ réglages du bloc choisi

type Regrouper = string | undefined;

function Reglages({
  block,
  index,
  count,
  doc,
  products,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  block: EmailBlock;
  index: number;
  count: number;
  doc: EmailDoc;
  products: { handle: string; title: string }[];
  onChange: (b: EmailBlock, regrouper?: Regrouper) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const def = emailBlockDef(block.type);
  if (!def) return null;
  const reglages = REGLAGES[block.type] ?? [];
  const st = styleOf(block);
  const set = (patch: Record<string, unknown>, regrouper?: Regrouper) => onChange({ ...block, ...patch } as EmailBlock, regrouper);
  const vars = Object.keys(doc.variables);
  const modifie = Object.keys(STYLE_PAR_DEFAUT[block.type] ?? {}).some((k) => block[k] !== undefined && k !== "hauteur" && k !== "cote");
  const origine = () => {
    const next: Record<string, unknown> = { ...block };
    for (const k of Object.keys(STYLE_PAR_DEFAUT[block.type] ?? {})) if (k !== "hauteur" && k !== "cote") delete next[k];
    onChange(next as EmailBlock);
  };

  const field = (f: FieldDef) => {
    const path = `blocs.${index}.${f.key}`;
    switch (f.kind) {
      case "texte":
      case "texte-long":
        return <TextField key={f.key} path={path} label={f.label} value={String(block[f.key] ?? "")} multiline={f.kind === "texte-long"} liens={f.key === "texte" && block.type !== "signature"} onChange={(v) => set({ [f.key]: v }, path)} />;
      case "image":
        return <ImageField key={f.key} path={path} label={f.label} value={(block[f.key] as Img) ?? { src: "", alt: "", width: 1200, height: 1500 }} onChange={(v) => set({ [f.key]: v }, `${path}.alt`)} />;
      case "lien": {
        const l = (block[f.key] as Lien | null) ?? { label: "", href: "" };
        return (
          <div key={f.key} className={s.pair}>
            <TextField path={`${path}.label`} label={block.type === "bouton" ? "Texte du bouton" : "Texte du lien"} value={l.label} onChange={(label) => set({ [f.key]: { ...l, label } }, `${path}.label`)} />
            <div className="field">
              <label className="field__label" htmlFor={`${path}-href`}>
                Page ouverte
              </label>
              <input id={`${path}-href`} className="field__input" value={l.href} placeholder="/boutique" onChange={(e) => set({ [f.key]: { ...l, href: e.target.value.trim() } }, `${path}.href`)} />
              {l.href && !adresseOk(l.href) && !l.href.startsWith("atelier:/") ? <p className={s.issue}>Une page du site (« /boutique »), une adresse en https ou un e-mail en mailto.</p> : null}
            </div>
          </div>
        );
      }
      case "pieces":
        return (
          <div key={f.key} className="field">
            <label className="field__label" htmlFor={path}>
              {f.label}
            </label>
            <select id={path} className="field__input" value={String((block[f.key] as string[] | undefined)?.[0] ?? "")} onChange={(e) => set({ [f.key]: e.target.value ? [e.target.value] : [] })}>
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
        return <Choix key={f.key} label={f.label} value={String(block[f.key] ?? "")} options={f.options!} onChange={(v) => set({ [f.key]: v })} />;
      default:
        return null;
    }
  };

  return (
    <div className={s.stack}>
      <header className={s.blocHead}>
        <span className={s.blocName}>
          <AtelierIcone nom={ICONE_BLOC[block.type] ?? "texte"} />
          {def.label}
        </span>
        <div className={s.tools} role="group" aria-label="Actions sur le bloc">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}>
            <AtelierIcone nom="monter" />
            Monter
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1}>
            <AtelierIcone nom="descendre" />
            Descendre
          </button>
          <button type="button" onClick={onDuplicate} disabled={count >= MAX_BLOCS}>
            <AtelierIcone nom="dupliquer" />
            Dupliquer
          </button>
          <button type="button" onClick={onDelete}>
            <AtelierIcone nom="supprimer" />
            Supprimer
          </button>
        </div>
      </header>

      {def.fields.length ? (
        <section className={s.section} aria-label="Contenu du bloc">
          {def.fields.map(field)}
        </section>
      ) : (
        <p className={s.hint}>{def.description}</p>
      )}

      {reglages.length ? (
        <section className={s.section} aria-labelledby={`${block.id}-forme`}>
          <h3 id={`${block.id}-forme`} className={s.sectionTitle}>
            Mise en forme
          </h3>
          {reglages.includes("police") ? (
            <fieldset className={s.polices}>
              <legend className="field__label">Police</legend>
              {POLICES.map((p) => (
                <label key={p.value} className={s.police} data-police={p.value}>
                  <input type="radio" name={`${block.id}-police`} checked={st.police === p.value} onChange={() => set({ police: p.value })} />
                  <span className={s.policeEchantillon} aria-hidden="true">
                    Awrea
                  </span>
                  <span className={s.policeNom}>
                    {p.label}
                    <span className={s.hint}>{p.usage}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {reglages.includes("taille") ? <Choix label="Taille" value={st.taille ?? "normale"} options={TAILLES} onChange={(taille) => set({ taille })} /> : null}
          {reglages.includes("align") ? <Choix label="Alignement" value={st.align ?? "gauche"} options={ALIGNEMENTS} icones={ICONE_ALIGN} onChange={(align) => set({ align })} /> : null}
          {reglages.includes("cote") ? (
            <Choix
              label="Place de la photo"
              value={st.cote ?? "gauche"}
              options={[
                { value: "gauche", label: "À gauche du texte" },
                { value: "droite", label: "À droite du texte" },
              ]}
              onChange={(cote) => set({ cote })}
            />
          ) : null}
          {reglages.includes("largeur") ? <Curseur label="Largeur de la photo" value={st.largeur ?? 100} min={LARGEUR_MIN} max={100} step={5} unite="%" onChange={(largeur) => set({ largeur }, `${block.id}.largeur`)} /> : null}
          {reglages.includes("style") ? (
            <Choix
              label="Bouton"
              value={st.style ?? "plein"}
              options={[
                { value: "plein", label: "Noir plein" },
                { value: "contour", label: "Au filet" },
              ]}
              onChange={(style) => set({ style })}
            />
          ) : null}
          {reglages.includes("espace") ? (
            <div className={s.pair}>
              <Curseur label="Espace au-dessus" value={st.avant ?? 0} min={0} max={ESPACE_MAX} step={8} unite="px" onChange={(avant) => set({ avant }, `${block.id}.avant`)} />
              <Curseur label="Espace au-dessous" value={st.apres ?? 32} min={0} max={ESPACE_MAX} step={8} unite="px" onChange={(apres) => set({ apres }, `${block.id}.apres`)} />
            </div>
          ) : null}
          {reglages.includes("hauteur") ? <Curseur label="Hauteur de l’espace" value={st.hauteur ?? 32} min={8} max={HAUTEUR_MAX} step={8} unite="px" onChange={(hauteur) => set({ hauteur }, `${block.id}.hauteur`)} /> : null}
          {modifie ? (
            <button type="button" className={`btn btn--link ${s.start}`} onClick={origine}>
              Revenir à l’allure d’origine
            </button>
          ) : null}
        </section>
      ) : null}

      {vars.length && block.type !== "entete" && block.type !== "pied" ? (
        <section className={s.section} aria-label="Quand ce bloc paraît">
          <div className="field">
            <label className="field__label" htmlFor={`${block.id}-cond`}>
              Ce bloc paraît
            </label>
            <select
              id={`${block.id}-cond`}
              className="field__input"
              value={block.si ? `si:${block.si}` : block.sauf ? `sauf:${block.sauf}` : ""}
              onChange={(e) => {
                const [k, v] = e.target.value.split(":");
                const { si: _si, sauf: _sauf, ...rest } = block;
                onChange((k === "si" ? { ...rest, si: v } : k === "sauf" ? { ...rest, sauf: v } : rest) as EmailBlock);
              }}
            >
              <option value="">Toujours</option>
              {vars.map((v) => (
                <option key={`si-${v}`} value={`si:${v}`}>
                  Seulement quand il y a : {doc.variables[v].description.toLowerCase()}
                </option>
              ))}
              {vars.map((v) => (
                <option key={`sauf-${v}`} value={`sauf:${v}`}>
                  Seulement sans : {doc.variables[v].description.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ éditeur

interface Etat {
  doc: EmailDoc;
  /** versions précédentes et suivantes, pour annuler et rétablir (50 pas au plus) */
  past: EmailDoc[];
  future: EmailDoc[];
}

export function EmailEditor({ id, initial, draftAt, publishedAt, products }: { id: string; initial: EmailDoc; draftAt: string | null; publishedAt: string | null; products: { handle: string; title: string }[] }) {
  const atelier = useAtelier();
  const upload = useUpload();
  const [etat, setEtat] = useState<Etat>({ doc: initial, past: [], future: [] });
  const doc = etat.doc;
  const [selected, setSelected] = useState<string | null>(initial.blocs.find((b) => b.type === "texte")?.id ?? initial.blocs[0]?.id ?? null);
  const [onglet, setOnglet] = useState<Onglet>("reglages");
  const [status, setStatus] = useState(draftAt ? `Brouillon enregistré le ${when(draftAt)}` : publishedAt ? `En ligne depuis le ${when(publishedAt)}` : "Version d’origine");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<Client>("apple");
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [cas, setCas] = useState<Record<string, boolean>>({});
  const [html, setHtml] = useState("");
  const [subjectShown, setSubjectShown] = useState({ subject: "", preheader: "" });
  const [history, setHistory] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState("");
  const drag = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);
  const choisi = useRef<string | null>(selected);
  const defiler = useRef(false);
  const dernier = useRef({ cle: "", at: 0 });
  const boite = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ w: 0, h: 0 });

  // la boîte de l'aperçu mesure sa place ; l'e-mail y est posé à sa vraie largeur, réduit au besoin
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTaille({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const largeur = mobile ? FENETRE.telephone : FENETRE.ordinateur;
  const echelle = taille.w && taille.w < largeur ? taille.w / largeur : 1;

  /** Toute modification passe ici : un pas d'annulation, sauf la frappe continue dans un même champ. */
  const change = useCallback((fn: (d: EmailDoc) => EmailDoc, regrouper?: Regrouper) => {
    const now = Date.now();
    const merge = Boolean(regrouper) && regrouper === dernier.current.cle && now - dernier.current.at < 1000;
    dernier.current = { cle: regrouper ?? "", at: now };
    setEtat((e) => ({ doc: fn(e.doc), past: merge ? e.past : [...e.past.slice(-49), e.doc], future: merge ? e.future : [] }));
    setDirty(true);
    setStatus("Modifications en cours…");
  }, []);

  const annuler = useCallback(() => {
    dernier.current = { cle: "", at: 0 };
    setEtat((e) => (e.past.length ? { doc: e.past[e.past.length - 1], past: e.past.slice(0, -1), future: [e.doc, ...e.future] } : e));
    setDirty(true);
    setStatus("Modification annulée.");
  }, []);
  const retablir = useCallback(() => {
    dernier.current = { cle: "", at: 0 };
    setEtat((e) => (e.future.length ? { doc: e.future[0], past: [...e.past, e.doc], future: e.future.slice(1) } : e));
    setDirty(true);
    setStatus("Modification rétablie.");
  }, []);

  /** Choisir un bloc ; depuis le panneau, l'aperçu défile jusqu'à lui. */
  const choisir = useCallback((blocId: string | null, depuisPanneau: boolean) => {
    defiler.current = depuisPanneau;
    setSelected(blocId);
    if (!depuisPanneau && blocId) setOnglet("reglages");
  }, []);

  // Ctrl ou Cmd + Z : annuler ; avec Maj, ou Ctrl + Y : rétablir (hors d'un champ, où la saisie garde les siennes)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(e.metaKey || e.ctrlKey) || (k !== "z" && k !== "y")) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) retablir();
      else annuler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [annuler, retablir]);

  // brouillon enregistré tout seul, un instant après la dernière modification
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
      setStatus("Brouillon enregistré. Rien ne part avant « Publier ».");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [atelier, dirty, doc, id]);

  // aperçu, à chaque changement (la position dans l'e-mail est gardée)
  useEffect(() => {
    const t = window.setTimeout(async () => {
      const r = await post<{ html: string; subject: string; preheader: string }>(atelier.api("/edition/email/apercu"), { id, locale: "fr", doc, client, dark, cas, marks: true });
      if (r.ok) {
        scrollY.current = frame.current?.contentWindow?.scrollY ?? scrollY.current;
        setHtml(r.data.html);
        setSubjectShown({ subject: r.data.subject, preheader: r.data.preheader });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [atelier, cas, client, dark, doc, id]);

  // le bloc choisi porte un filet dans l'aperçu
  useEffect(() => {
    choisi.current = selected;
    const d = frame.current?.contentDocument;
    if (d) marquer(d, selected, defiler.current);
    defiler.current = false;
  }, [selected]);

  /** Une photo déposée dans l'aperçu : sur un bloc photo, elle prend sa place ; ailleurs, elle s'ajoute à cet endroit. */
  const deposer = useCallback(
    async (file: File, blocId: string | null, champ: string | null) => {
      setStatus("Photo en cours de traitement…");
      const r = await upload(file);
      if (!r.image) {
        setError(r.error ?? "La photo n’a pas été déposée.");
        return;
      }
      const img = r.image;
      setError("");
      const neuf = createEmailBlock("image");
      let cibleId: string | null = null;
      change((d) => {
        const i = blocId ? d.blocs.findIndex((b) => b.id === blocId) : -1;
        const cible = i >= 0 ? d.blocs[i] : null;
        if (cible && PHOTOS.has(cible.type)) {
          const key = champ === "image2" && cible.type === "deux-photos" ? "image2" : "image";
          const old = cible[key] as Img | undefined;
          cibleId = cible.id;
          return { ...d, blocs: d.blocs.map((b, k) => (k === i ? { ...b, [key]: { ...img, alt: img.alt || old?.alt || "" } } : b)) };
        }
        if (!neuf || d.blocs.length >= MAX_BLOCS) return d;
        const nb = { ...neuf, image: { ...img, alt: img.alt || (neuf.image as Img).alt } };
        const footer = d.blocs.findIndex((b) => b.type === "pied");
        let at = i >= 0 ? i + 1 : footer === -1 ? d.blocs.length : footer;
        if (footer !== -1 && at > footer) at = footer;
        cibleId = nb.id;
        return { ...d, blocs: [...d.blocs.slice(0, at), nb, ...d.blocs.slice(at)] };
      });
      // le bloc qui a reçu la photo est choisi : sa description est à écrire dans « Réglages »
      window.setTimeout(() => cibleId && choisir(cibleId, false), 0);
    },
    [change, choisir, upload],
  );

  /** À chaque nouvel aperçu : position gardée, bloc choisi marqué, clics et photos déposées écoutés. */
  const brancher = () => {
    const f = frame.current;
    const d = f?.contentDocument;
    if (!f || !d) return;
    f.contentWindow?.scrollTo(0, scrollY.current);
    marquer(d, choisi.current, false);
    d.addEventListener("click", (e) => {
      const t = e.target as Element | null;
      // les liens de l'e-mail ne s'ouvrent pas dans l'aperçu
      if (t?.closest("a")) e.preventDefault();
      const bloc = t?.closest("tbody[data-bloc]");
      if (bloc) choisir(bloc.getAttribute("data-bloc"), false);
    });
    d.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    d.addEventListener("drop", (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      e.preventDefault();
      const t = e.target as Element | null;
      void deposer(file, t?.closest("tbody[data-bloc]")?.getAttribute("data-bloc") ?? null, t?.closest("[data-champ]")?.getAttribute("data-champ") ?? null);
    });
  };

  const index = doc.blocs.findIndex((b) => b.id === selected);
  const block = index >= 0 ? doc.blocs[index] : null;

  const ajouter = (type: string) => {
    const b = createEmailBlock(type);
    if (!b || doc.blocs.length >= MAX_BLOCS) return;
    change((d) => {
      const i = selected ? d.blocs.findIndex((x) => x.id === selected) : -1;
      const footer = d.blocs.findIndex((x) => x.type === "pied");
      let at = i >= 0 ? i + 1 : footer === -1 ? d.blocs.length : footer;
      // jamais sous le pied de page légal
      if (footer !== -1 && at > footer) at = footer;
      return { ...d, blocs: [...d.blocs.slice(0, at), b, ...d.blocs.slice(at)] };
    });
    choisir(b.id, true);
    setOnglet("reglages");
  };
  const deplacer = (blocId: string, delta: number) =>
    change((d) => {
      const i = d.blocs.findIndex((b) => b.id === blocId);
      const to = i + delta;
      return i < 0 || to < 0 || to >= d.blocs.length ? d : { ...d, blocs: move(d.blocs, i, to) };
    });
  const dupliquer = (b: EmailBlock) => {
    const copie = duplicateBlock(b) as EmailBlock;
    change((d) => {
      const i = d.blocs.findIndex((x) => x.id === b.id);
      return { ...d, blocs: [...d.blocs.slice(0, i + 1), copie, ...d.blocs.slice(i + 1)] };
    });
    choisir(copie.id, true);
  };
  const supprimer = (b: EmailBlock) => {
    if (!window.confirm("Supprimer ce bloc ? « Annuler » le remet en place.")) return;
    const i = doc.blocs.findIndex((x) => x.id === b.id);
    const voisin = doc.blocs[i + 1]?.id ?? doc.blocs[i - 1]?.id ?? null;
    change((d) => ({ ...d, blocs: d.blocs.filter((x) => x.id !== b.id) }));
    choisir(voisin, true);
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
      <div className={s.bar}>
        <p className={s.status} role="status">
          {status}
        </p>
        <div className={s.actions}>
          <div className={s.tools} role="group" aria-label="Annuler ou rétablir">
            <button type="button" onClick={annuler} disabled={!etat.past.length}>
              <AtelierIcone nom="annuler" />
              Annuler
            </button>
            <button type="button" onClick={retablir} disabled={!etat.future.length}>
              <AtelierIcone nom="retablir" />
              Rétablir
            </button>
          </div>
          <button type="button" className="btn btn--outline" onClick={test} disabled={Boolean(busy)}>
            {busy === "essai" ? "Envoi…" : "M’envoyer un essai"}
          </button>
          <button type="button" className="btn btn--outline" onClick={loadHistory}>
            Historique
          </button>
          <button type="button" className="btn" onClick={publish} disabled={Boolean(busy)}>
            {busy === "publier" ? "Un instant…" : "Publier"}
          </button>
        </div>
      </div>
      {error ? (
        <p className={s.issue} role="alert">
          {error}
        </p>
      ) : null}

      <div className={s.layout}>
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
          <div className={s.inbox}>
            <p className={s.subject}>{subjectShown.subject}</p>
            <p className={s.hint}>{subjectShown.preheader}</p>
          </div>
          <div className={s.frameBox}>
            <div ref={boite} className={s.frameZone}>
              {/* cadre sans script (« allow-same-origin » seul) : l'éditeur y lit les clics et les photos déposées */}
              <iframe
                ref={frame}
                title="Aperçu de l’e-mail"
                className={s.frame}
                sandbox="allow-same-origin"
                srcDoc={html}
                onLoad={brancher}
                style={{ width: `${largeur}px`, height: `${taille.h / echelle}px`, left: `${Math.max(0, (taille.w - largeur * echelle) / 2)}px`, transform: `scale(${echelle})` }}
              />
            </div>
          </div>
          {doc.blocs.some((b) => b.si || b.sauf) ? (
            <fieldset className={s.choices}>
              <legend className="field__label">Essayer un cas</legend>
              {vars
                .filter(([k]) => doc.blocs.some((b) => b.si === k || b.sauf === k))
                .map(([k, v]) => (
                  <label key={k} className={s.choice}>
                    <input type="checkbox" checked={cas[k] !== false} onChange={(e) => setCas({ ...cas, [k]: e.target.checked })} /> {v.description}
                  </label>
                ))}
            </fieldset>
          ) : null}
          <p className={s.hint}>Cliquez sur un bloc pour le modifier ; glissez une photo sur l’e-mail pour la placer. Un essai envoyé à vous-même reste la vérification finale.</p>
        </div>

        <aside className={s.panel} aria-label="Modifier l’e-mail">
          <div className={s.tabs} role="group" aria-label="Panneau">
            {ONGLETS.map((o) => (
              <button key={o.id} type="button" aria-pressed={onglet === o.id} onClick={() => setOnglet(o.id)}>
                {o.label}
              </button>
            ))}
          </div>

          {onglet === "blocs" ? (
            <div className={s.stack}>
              <ol className={s.layers} aria-label="Blocs de l’e-mail, dans l’ordre">
                {doc.blocs.map((b, i) => {
                  const def = emailBlockDef(b.type);
                  const texte = String(b.titre ?? b.texte ?? (b.lien as Lien | undefined)?.label ?? "");
                  return (
                    <li
                      key={b.id}
                      className={s.layer}
                      data-choisi={selected === b.id || undefined}
                      onDragOver={(e) => drag.current !== null && e.preventDefault()}
                      onDrop={(e) => {
                        if (drag.current === null) return;
                        e.preventDefault();
                        const from = drag.current;
                        drag.current = null;
                        change((d) => ({ ...d, blocs: move(d.blocs, from, i) }));
                      }}
                    >
                      <span
                        className={s.handle}
                        draggable
                        onDragStart={(e) => {
                          drag.current = i;
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => (drag.current = null)}
                        title="Glisser pour déplacer"
                        aria-hidden="true"
                      >
                        <AtelierIcone nom="menu" />
                      </span>
                      <button type="button" className={s.layerName} aria-current={selected === b.id || undefined} onClick={() => choisir(b.id, true)}>
                        <AtelierIcone nom={ICONE_BLOC[b.type] ?? "texte"} />
                        <span>
                          {def?.label ?? b.type}
                          {texte && !isTodoText(texte) ? <span className={s.extrait}>{sansLiens(texte).slice(0, 48)}</span> : null}
                          {b.si ? <span className={s.extrait}>seulement avec {doc.variables[b.si]?.description.toLowerCase()}</span> : null}
                          {b.sauf ? <span className={s.extrait}>seulement sans {doc.variables[b.sauf]?.description.toLowerCase()}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <h3 className={s.sectionTitle}>Ajouter un bloc</h3>
              <p className={s.hint}>{selected ? "Il se place sous le bloc choisi." : "Il se place avant le pied de page."}</p>
              {doc.blocs.length >= MAX_BLOCS ? <p className={s.issue}>Trente blocs au plus : retirez-en un pour en ajouter un autre.</p> : null}
              <ul className={s.library} aria-label="Bibliothèque de blocs">
                {EMAIL_BLOCKS.map((b) => (
                  <li key={b.type}>
                    <button type="button" onClick={() => ajouter(b.type)} disabled={doc.blocs.length >= MAX_BLOCS}>
                      <AtelierIcone nom={ICONE_BLOC[b.type] ?? "texte"} />
                      <span className={s.libLabel}>{b.label}</span>
                      <span className={s.hint}>{b.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {onglet === "reglages" ? (
            block ? (
              <Reglages
                key={block.id}
                block={block}
                index={index}
                count={doc.blocs.length}
                doc={doc}
                products={products}
                onChange={(nb, regrouper) => change((d) => ({ ...d, blocs: d.blocs.map((x) => (x.id === nb.id ? nb : x)) }), regrouper)}
                onMove={(delta) => deplacer(block.id, delta)}
                onDuplicate={() => dupliquer(block)}
                onDelete={() => supprimer(block)}
              />
            ) : (
              <p className={s.hint}>Cliquez sur un bloc dans l’e-mail, ou choisissez-le dans « Blocs », pour le modifier.</p>
            )
          ) : null}

          {onglet === "envoi" ? (
            <div className={s.stack}>
              <section className={s.section} aria-labelledby="enveloppe">
                <h3 id="enveloppe" className={s.sectionTitle}>
                  Objet et ligne d’aperçu
                </h3>
                <TextField path="sujet" label="Objet" value={doc.sujet} onChange={(sujet) => change((d) => ({ ...d, sujet }), "sujet")} />
                <TextField path="preheader" label="Ligne d’aperçu" value={doc.preheader} onChange={(preheader) => change((d) => ({ ...d, preheader }), "preheader")} />
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
              <section className={s.section} aria-labelledby="exporter">
                <h3 id="exporter" className={s.sectionTitle}>
                  Exporter la version publiée
                </h3>
                <p className={s.hint}>Pour un service d’envoi : le gabarit garde sa mise en page, et les repères prennent la syntaxe du service.</p>
                <div className={s.actions}>
                  <a className="btn btn--outline" href={`${atelier.api("/edition/email/export")}?id=${id}&pour=brevo`}>
                    Pour Brevo
                  </a>
                  <a className="btn btn--outline" href={`${atelier.api("/edition/email/export")}?id=${id}&pour=klaviyo`}>
                    Pour Klaviyo
                  </a>
                </div>
              </section>
            </div>
          ) : null}
        </aside>
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
                      <button type="button" className="btn btn--outline" onClick={() => restore(v)}>
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
              <button type="button" className={`btn btn--link ${s.start}`} onClick={() => setHistory(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
