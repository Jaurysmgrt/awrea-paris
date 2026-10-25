"use client";
/**
 * Atelier : annoncer ou modifier une avant-première. La créatrice écrit le nom de la collection, son
 * texte, choisit ses images et ses pièces, fixe l'avant-première et le dévoilement (heure de
 * Paris), décide d'écrire aux inscrites à la lettre, ou fait de la collection une présentation
 * privée protégée par un mot de passe. Textes transmis par la page (avant-premieres.json, atelier).
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

type Piece = { handle: string; title: string };
type Erreur = "dates" | "motDePasse" | "donnees" | "generale";
export type DropDraft = {
  slug: string;
  title: string;
  teaser: string;
  images: string[];
  products: string[];
  earlyAccessAt: string;
  publicAt: string;
  privateSale: boolean;
  notifyLetters: boolean;
  hasPassword?: boolean;
};
export type DropEditorTexts = {
  nom: string;
  adresse: string;
  texte: string;
  texteAide: string;
  images: string;
  imagesAide: string;
  avantPremiere: string;
  presentation: string;
  devoilement: string;
  pieces: string;
  piecesAide: string;
  lettre: string;
  privee: string;
  motDePasse: string;
  nouveauMotDePasse: string;
  creer: string;
  enregistrer: string;
  envoi: string;
  fait: string;
  erreurs: Record<Erreur, string>;
};

const CODES: Erreur[] = ["dates", "motDePasse", "donnees"];

/** « 2026-10-20T18:00 » (heure de Paris) → ISO UTC, et l'inverse */
function parisToIso(local: string): string {
  const [d, t] = local.split("T");
  const guess = new Date(`${d}T${t}:00Z`);
  const offset = (new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) / 60_000;
  return new Date(guess.getTime() - offset * 60_000).toISOString();
}
function isoToParis(iso: string): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}
const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export function DropEditor({ pieces, drop, t }: { pieces: Piece[]; drop?: DropDraft; t: DropEditorTexts }) {
  const { api } = useAtelier();
  const router = useRouter();
  const id = useId();
  const [privateSale, setPrivateSale] = useState(Boolean(drop?.privateSale));
  const [state, setState] = useState<{ busy: boolean; done: boolean; error: Erreur | null }>({ busy: false, done: false, error: null });
  const f = (name: string) => `${id}-${name}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.busy) return;
    const form = new FormData(e.currentTarget);
    setState({ busy: true, done: false, error: null });
    const res = await fetch(api("/drops"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.get("slug"),
        title: form.get("title"),
        teaser: form.get("teaser"),
        images: lines(form.get("images")),
        products: form.getAll("products"),
        earlyAccessAt: parisToIso(String(form.get("earlyAccessAt"))),
        publicAt: parisToIso(String(form.get("publicAt"))),
        privateSale,
        notifyLetters: !privateSale && form.get("notifyLetters") === "on",
        password: privateSale && form.get("password") ? form.get("password") : null,
      }),
    }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: unknown }) : {};
    const error: Erreur | null = res?.ok ? null : CODES.includes(j.error as Erreur) ? (j.error as Erreur) : "generale";
    setState({ busy: false, done: !error, error });
    if (res?.ok) router.refresh();
  }

  return (
    <form className="stack-m" onSubmit={onSubmit}>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor={f("title")}>
            {t.nom}
          </label>
          <input id={f("title")} name="title" className="field__input" required minLength={2} maxLength={80} defaultValue={drop?.title} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={f("slug")}>
            {t.adresse}
          </label>
          <input id={f("slug")} name="slug" className="field__input" required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={drop?.slug} readOnly={Boolean(drop)} />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={f("teaser")}>
          {t.texte}
        </label>
        <textarea id={f("teaser")} name="teaser" className="field__input" required minLength={2} maxLength={2400} rows={8} defaultValue={drop?.teaser} aria-describedby={f("teaser-aide")} />
        <p id={f("teaser-aide")} className="field__hint">
          {t.texteAide}
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={f("images")}>
          {t.images}
        </label>
        <textarea id={f("images")} name="images" className="field__input" rows={3} defaultValue={drop?.images.join("\n")} aria-describedby={f("images-aide")} spellCheck={false} />
        <p id={f("images-aide")} className="field__hint">
          {t.imagesAide}
        </p>
      </div>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor={f("early")}>
            {privateSale ? t.presentation : t.avantPremiere}
          </label>
          <input id={f("early")} name="earlyAccessAt" type="datetime-local" className="field__input" required defaultValue={isoToParis(drop?.earlyAccessAt ?? "")} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={f("public")}>
            {t.devoilement}
          </label>
          <input id={f("public")} name="publicAt" type="datetime-local" className="field__input" required defaultValue={isoToParis(drop?.publicAt ?? "")} />
        </div>
      </div>
      <fieldset className="stack-s" aria-describedby={f("pieces-aide")}>
        <legend className="field__label">{t.pieces}</legend>
        <p id={f("pieces-aide")} className="field__hint">
          {t.piecesAide}
        </p>
        {pieces.map((p) => (
          <label key={p.handle} className="check">
            <input type="checkbox" name="products" value={p.handle} defaultChecked={drop?.products.includes(p.handle)} />
            <span>{p.title}</span>
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={privateSale} onChange={(e) => setPrivateSale(e.target.checked)} />
        <span>{t.privee}</span>
      </label>
      {privateSale ? (
        <div className="field">
          <label className="field__label" htmlFor={f("password")}>
            {drop?.hasPassword ? t.nouveauMotDePasse : t.motDePasse}
          </label>
          <input id={f("password")} name="password" type="text" className="field__input" minLength={6} maxLength={120} autoComplete="off" required={!drop?.hasPassword} />
        </div>
      ) : (
        <label className="check">
          <input type="checkbox" name="notifyLetters" defaultChecked={drop?.notifyLetters} />
          <span>{t.lettre}</span>
        </label>
      )}
      <div>
        <button type="submit" className="btn" disabled={state.busy} aria-busy={state.busy || undefined}>
          {state.busy ? t.envoi : drop ? t.enregistrer : t.creer}
        </button>
      </div>
      <p className={state.error ? "field__error" : "t-note"} role="status">
        {state.error ? t.erreurs[state.error] : state.done ? t.fait : ""}
      </p>
    </form>
  );
}
