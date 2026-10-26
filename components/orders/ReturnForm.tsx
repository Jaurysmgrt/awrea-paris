"use client";
/**
 * Retour ou échange de taille en libre-service : choisir les pièces, la raison, puis un
 * remboursement ou une autre taille. L'étiquette arrive aussitôt (page et e-mail). Textes du
 * document « suivi-commande » (clé « retour »), transmis par la page.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fill } from "@/lib/edition/fill";
import type { SuiviTexts } from "@/components/commerce/OrderStages";

export interface ReturnableLine {
  index: number;
  title: string;
  size: string;
  price: string;
  sizes: string[];
}

type Reason = keyof SuiviTexts["retour"]["raisons"];
const REASONS: Reason[] = ["trop-petite", "trop-grande", "tombe", "matiere", "autre"];

type Choice = { on: boolean; reason: string; wish: "remboursement" | "echange"; exchangeSize: string };

export function ReturnForm({ number, token, lines, returnDays, t }: { number: string; token: string; lines: ReturnableLine[]; returnDays: number; t: SuiviTexts["retour"] }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<number, Choice>>(() => Object.fromEntries(lines.map((l) => [l.index, { on: false, reason: "trop-petite", wish: "remboursement", exchangeSize: l.sizes[0] ?? "" }])));
  const [accept, setAccept] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const set = (i: number, patch: Partial<Choice>) => setChoices((c) => ({ ...c, [i]: { ...c[i], ...patch } }));
  const picked = lines.filter((l) => choices[l.index]?.on);

  return (
    <form
      className="stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!picked.length) {
          setState("error");
          setError(t.aucune);
          return;
        }
        setState("loading");
        const comment = new FormData(e.currentTarget).get("comment");
        const res = await fetch("/api/retours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number,
            t: token,
            accept,
            comment: comment || undefined,
            items: picked.map((l) => {
              const c = choices[l.index];
              return { index: l.index, reason: c.reason, wish: c.wish, exchangeSize: c.wish === "echange" ? c.exchangeSize : undefined };
            }),
          }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        if (!res?.ok) {
          setState("error");
          setError(j.error ?? t.erreur);
          return;
        }
        router.refresh();
      }}
    >
      <ul className="return-lines">
        {lines.map((l) => {
          const c = choices[l.index];
          return (
            <li key={l.index} className="return-line">
              <label className="check">
                <input type="checkbox" checked={c.on} onChange={(e) => set(l.index, { on: e.target.checked })} />
                <span>
                  <span className="t-body">{l.title}</span> <span className="t-label t-soft">{fill(t.taille, { taille: l.size })}</span> <span className="price">{l.price}</span>
                </span>
              </label>
              {c.on ? (
                <div className="return-line__choices stack-s">
                  <div className="field">
                    <label className="field__label" htmlFor={`reason-${l.index}`}>
                      {t.raison}
                    </label>
                    <select id={`reason-${l.index}`} className="field__input" value={c.reason} onChange={(e) => set(l.index, { reason: e.target.value })}>
                      {REASONS.map((v) => (
                        <option key={v} value={v}>
                          {t.raisons[v]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <fieldset className="field">
                    <legend className="field__label">{t.souhait}</legend>
                    <div className="options">
                      <label className="option">
                        <input type="radio" name={`wish-${l.index}`} checked={c.wish === "remboursement"} onChange={() => set(l.index, { wish: "remboursement" })} />
                        <span className="option__body">
                          <span className="option__title">{t.remboursement}</span>
                          <span className="t-note">{t.remboursementNote}</span>
                        </span>
                      </label>
                      {l.sizes.length ? (
                        <label className="option">
                          <input type="radio" name={`wish-${l.index}`} checked={c.wish === "echange"} onChange={() => set(l.index, { wish: "echange" })} />
                          <span className="option__body">
                            <span className="option__title">{t.echange}</span>
                            <span className="t-note">{t.echangeNote}</span>
                          </span>
                        </label>
                      ) : null}
                    </div>
                  </fieldset>
                  {c.wish === "echange" ? (
                    <div className="field">
                      <label className="field__label" htmlFor={`size-${l.index}`}>
                        {t.nouvelleTaille}
                      </label>
                      <select id={`size-${l.index}`} className="field__input" value={c.exchangeSize} onChange={(e) => set(l.index, { exchangeSize: e.target.value })}>
                        {l.sizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="field">
        <label className="field__label" htmlFor="return-comment">
          {t.mot}
        </label>
        <textarea id="return-comment" name="comment" className="field__input" maxLength={600} />
      </div>
      <label className="check t-note">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
        <span>{fill(t.engagement, { jours: returnDays })}</span>
      </label>
      {state === "error" ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn--solid" disabled={state === "loading" || !accept}>
          {state === "loading" ? t.envoi : t.envoyer}
        </button>
      </div>
    </form>
  );
}
