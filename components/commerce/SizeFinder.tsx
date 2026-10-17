"use client";
/**
 * « Trouver ma taille » : trois mesures du corps, la taille conseillée pour cette pièce selon sa
 * coupe, et un geste pour la choisir. Une cliente connectée retrouve ses mesures enregistrées et
 * peut les garder dans son compte.
 */
import { useEffect, useState } from "react";
import { recommendSize, type FitAdvice, type Measures } from "@/lib/fit";
import type { Product, Size } from "@/lib/commerce/types";

const FIELDS: { key: keyof Measures; label: string }[] = [
  { key: "poitrine", label: "Tour de poitrine" },
  { key: "taille", label: "Tour de taille" },
  { key: "hanches", label: "Tour de hanches" },
];

const signedIn = () => typeof document !== "undefined" && /(?:^|; )awrea_signed_in=1/.test(document.cookie);
const sizeSlot = (p: Product): "robe" | "haut" | "bas" | null => (p.category === "robe" ? "robe" : p.category === "jupe" ? "bas" : p.category === "accessoire" ? null : "haut");

export function SizeFinder({ product, onPick }: { product: Product; onPick: (size: Size) => void }) {
  const [measures, setMeasures] = useState<Measures>({});
  const [advice, setAdvice] = useState<FitAdvice | null>(null);
  const [save, setSave] = useState(false);
  const [account, setAccount] = useState(false);
  const [saved, setSaved] = useState("");

  // cliente connectée : mesures retrouvées depuis son compte
  useEffect(() => {
    if (!signedIn()) return;
    let alive = true;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { user?: unknown; profile?: { sizes?: { mesures?: Measures } } }) => {
        if (!alive || !j.user) return;
        setAccount(true);
        if (j.profile?.sizes?.mesures) setMeasures((m) => ({ ...j.profile!.sizes!.mesures, ...m }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <form
      className="size-finder stack-s"
      onSubmit={async (e) => {
        e.preventDefault();
        const a = recommendSize(product, measures);
        setAdvice(a);
        setSaved("");
        if (a && save && account) {
          const slot = sizeSlot(product);
          const res = await fetch("/api/account/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sizes: { mesures: measures, ...(slot && a.offered ? { [slot]: a.size } : {}) } }),
          }).catch(() => null);
          setSaved(res?.ok ? "Vos mesures sont gardées dans votre compte." : "");
        }
      }}
    >
      <h3 className="t-label">Trouver ma taille</h3>
      <p className="t-note">Vos mesures, prises à même la peau, en centimètres. Une seule suffit ; trois sont plus justes.</p>
      <div className="form__row form__row--3">
        {FIELDS.map((f) => (
          <div key={f.key} className="field">
            <label className="field__label" htmlFor={`finder-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`finder-${f.key}`}
              className="field__input"
              type="number"
              inputMode="numeric"
              min={50}
              max={160}
              value={measures[f.key] ?? ""}
              onChange={(e) => setMeasures((m) => ({ ...m, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
        ))}
      </div>
      {account ? (
        <label className="check t-note">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span>Garder mes mesures dans mon compte</span>
        </label>
      ) : null}
      <button type="submit" className="btn">
        Voir ma taille
      </button>
      <div aria-live="polite" className="stack-s">
        {advice ? (
          <>
            <p className="t-body size-finder__advice">{advice.message}</p>
            {advice.offered ? (
              <button type="button" className="btn btn--solid" onClick={() => onPick(advice.size)}>
                Choisir le {advice.size}
              </button>
            ) : null}
          </>
        ) : null}
        {saved ? <p className="t-note">{saved}</p> : null}
      </div>
    </form>
  );
}
