"use client";
/**
 * Textes d'une pièce, depuis sa fiche dans l'Atelier : nom, accroche, description (un paragraphe
 * par bloc, séparés par une ligne vide) et référencement (titre et description pour Google, avec
 * leur longueur conseillée). Seuls les textes changés sont envoyés.
 */
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAtelier } from "./AtelierContext";

export interface TextesInitiaux {
  title: string;
  tagline: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export function PieceTextes({ handle, initial }: { handle: string; initial: TextesInitiaux }) {
  const atelier = useAtelier();
  const router = useRouter();
  const id = useId();
  const [t, setT] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const change = (k: keyof TextesInitiaux) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setT((x) => ({ ...x, [k]: e.target.value }));
  const dirty = (Object.keys(t) as (keyof TextesInitiaux)[]).some((k) => t[k] !== initial[k]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setMessage("");
    const corps = {
      ...(t.title !== initial.title ? { title: t.title } : {}),
      ...(t.tagline !== initial.tagline ? { tagline: t.tagline } : {}),
      ...(t.description !== initial.description ? { description: t.description } : {}),
      ...(t.seoTitle !== initial.seoTitle || t.seoDescription !== initial.seoDescription ? { seoTitle: t.seoTitle, seoDescription: t.seoDescription } : {}),
    };
    const res = await fetch(atelier.api(`/pieces/${handle}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setState("error");
      setMessage(j.error ?? "Les textes n’ont pas pu être enregistrés.");
      return;
    }
    setState("done");
    setMessage("C’est enregistré.");
    router.refresh();
  }

  return (
    <form className="form stack-m" onSubmit={save}>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-nom`}>
          Nom
        </label>
        <input id={`${id}-nom`} className="field__input" required minLength={2} maxLength={120} value={t.title} onChange={change("title")} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-accroche`}>
          Accroche
        </label>
        <input id={`${id}-accroche`} className="field__input" maxLength={200} value={t.tagline} onChange={change("tagline")} aria-describedby={`${id}-accroche-aide`} />
        <p className="t-note" id={`${id}-accroche-aide`}>
          Une phrase, sous le nom de la pièce.
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-description`}>
          Description
        </label>
        <textarea id={`${id}-description`} className="field__input" rows={8} maxLength={6000} value={t.description} onChange={change("description")} aria-describedby={`${id}-description-aide`} />
        <p className="t-note" id={`${id}-description-aide`}>
          Laissez une ligne vide entre deux paragraphes.
        </p>
      </div>
      <fieldset className="stack-s">
        <legend className="field__label">Sur Google</legend>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-seo-titre`}>
            Titre ({t.seoTitle.length} sur 60 conseillés)
          </label>
          <input id={`${id}-seo-titre`} className="field__input" required minLength={2} maxLength={120} value={t.seoTitle} onChange={change("seoTitle")} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-seo-description`}>
            Description ({t.seoDescription.length} sur 155 conseillés)
          </label>
          <textarea id={`${id}-seo-description`} className="field__input" rows={3} maxLength={320} value={t.seoDescription} onChange={change("seoDescription")} />
        </div>
      </fieldset>
      <div>
        <button type="submit" className="btn" disabled={!dirty || state === "busy"}>
          {state === "busy" ? "Enregistrement…" : "Enregistrer les textes"}
        </button>
      </div>
      {message ? (
        <p className={state === "error" ? "field__error" : "t-note"} role={state === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
