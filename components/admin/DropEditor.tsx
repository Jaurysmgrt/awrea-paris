"use client";
/** Créer ou modifier un drop : dates (heure de Paris), pièces, vente privée. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

type Piece = { handle: string; title: string };
export type DropDraft = { slug: string; title: string; teaser: string; image?: string; products: string[]; earlyAccessAt: string; publicAt: string; privateSale: boolean; hasPassword?: boolean };

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

export function DropEditor({ pieces, drop }: { pieces: Piece[]; drop?: DropDraft }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [privateSale, setPrivateSale] = useState(Boolean(drop?.privateSale));
  const [state, setState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: "", error: false });
  return (
    <form
      className="stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState({ busy: true, message: "", error: false });
        const res = await fetch(api("/drops"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: f.get("slug"),
            title: f.get("title"),
            teaser: f.get("teaser"),
            image: f.get("image") || undefined,
            products: f.getAll("products"),
            earlyAccessAt: parisToIso(String(f.get("earlyAccessAt"))),
            publicAt: parisToIso(String(f.get("publicAt"))),
            privateSale,
            password: privateSale && f.get("password") ? f.get("password") : null,
          }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setState({ busy: false, message: res?.ok ? "Le drop est enregistré." : (j.error ?? "L’enregistrement n’a pas abouti."), error: !res?.ok });
        if (res?.ok) router.refresh();
      }}
    >
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="drop-title">Nom de la série</label>
          <input id="drop-title" name="title" className="field__input" required maxLength={80} defaultValue={drop?.title} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="drop-slug">Adresse (lettres, chiffres, tirets)</label>
          <input id="drop-slug" name="slug" className="field__input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={drop?.slug} readOnly={Boolean(drop)} />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="drop-teaser">Texte d’annonce</label>
        <textarea id="drop-teaser" name="teaser" className="field__input" required maxLength={400} defaultValue={drop?.teaser} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="drop-image">Image (chemin, facultatif)</label>
        <input id="drop-image" name="image" className="field__input" placeholder="/media/img/odessa-1" defaultValue={drop?.image} />
      </div>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="drop-early">Accès anticipé (heure de Paris)</label>
          <input id="drop-early" name="earlyAccessAt" type="datetime-local" className="field__input" required defaultValue={isoToParis(drop?.earlyAccessAt ?? "")} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="drop-public">Ouverture à toutes (heure de Paris)</label>
          <input id="drop-public" name="publicAt" type="datetime-local" className="field__input" required defaultValue={isoToParis(drop?.publicAt ?? "")} />
        </div>
      </div>
      <fieldset className="stack-s">
        <legend className="field__label">Pièces de la série</legend>
        {pieces.map((p) => (
          <label key={p.handle} className="check t-note">
            <input type="checkbox" name="products" value={p.handle} defaultChecked={drop?.products.includes(p.handle)} />
            <span>{p.title}</span>
          </label>
        ))}
      </fieldset>
      <label className="check t-note">
        <input type="checkbox" checked={privateSale} onChange={(e) => setPrivateSale(e.target.checked)} />
        <span>Vente privée : jusqu’à l’ouverture à toutes, réservée aux personnes qui ont le mot de passe</span>
      </label>
      {privateSale ? (
        <div className="field">
          <label className="field__label" htmlFor="drop-password">{drop?.hasPassword ? "Nouveau mot de passe (laisser vide pour garder l’actuel)" : "Mot de passe de la vente privée"}</label>
          <input id="drop-password" name="password" type="text" className="field__input" minLength={6} maxLength={120} autoComplete="off" required={!drop?.hasPassword} />
        </div>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={state.busy}>
          {state.busy ? "Enregistrement…" : drop ? "Enregistrer les modifications" : "Créer le drop"}
        </button>
      </div>
      <p className={state.error ? "field__error" : "t-note"} role="status">
        {state.message}
      </p>
    </form>
  );
}
