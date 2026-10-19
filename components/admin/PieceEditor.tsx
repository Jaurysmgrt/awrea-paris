"use client";
/**
 * Réglages d'une pièce dans le tableau de bord (page Catalogue) : prix, délai de fabrication et
 * indicateurs « provisoire » et « nouveau ». Chaque pièce est créée sur demande : il n'y a aucun
 * stock à tenir. Une ligne du tableau par pièce ; Entrée ou « Enregistrer » envoie la ligne.
 */
import Link from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export interface PieceRow {
  handle: string;
  title: string;
  image: string;
  /** centimes */
  price: number;
  /** tailles à des prix différents dans Shopify : le prix se règle alors dans Shopify */
  priceVaries: boolean;
  priceProvisional: boolean;
  leadTime: { min: number; max: number };
  leadTimeProvisional: boolean;
  isNew: boolean;
  sizes: string[];
}

const euros = (cents: number) => (cents / 100).toFixed(2);

export function PieceEditor({ piece, bounds }: { piece: PieceRow; bounds: { min: number; max: number } }) {
  const { api } = useAtelier();
  const router = useRouter();
  const id = `piece-${piece.handle}`;
  const [price, setPrice] = useState(euros(piece.price));
  const [priceProvisional, setPriceProvisional] = useState(piece.priceProvisional);
  const [min, setMin] = useState(piece.leadTime.min);
  const [max, setMax] = useState(piece.leadTime.max);
  const [leadTimeProvisional, setLeadTimeProvisional] = useState(piece.leadTimeProvisional);
  const [isNew, setIsNew] = useState(piece.isNew);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const priceValue = Number(price.replace(",", "."));
  // seuls les réglages modifiés sont envoyés : décocher « provisoire » ne réécrit jamais le prix
  const changes = {
    ...(!piece.priceVaries && Math.round(priceValue * 100) !== piece.price ? { priceEuros: priceValue } : {}),
    ...(priceProvisional !== piece.priceProvisional ? { priceProvisional } : {}),
    ...(min !== piece.leadTime.min || max !== piece.leadTime.max ? { leadTime: { min, max } } : {}),
    ...(leadTimeProvisional !== piece.leadTimeProvisional ? { leadTimeProvisional } : {}),
    ...(isNew !== piece.isNew ? { isNew } : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!piece.priceVaries && (!Number.isFinite(priceValue) || priceValue <= 0)) {
      setState("error");
      setMessage("Le prix doit être un montant positif.");
      return;
    }
    if (min > max) {
      setState("error");
      setMessage("Le délai le plus court vient d’abord.");
      return;
    }
    setState("busy");
    setMessage("");
    const res = await fetch(api("/catalogue/piece"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: piece.handle, ...changes }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setState("error");
      setMessage(j.error ?? "La pièce n’a pas pu être mise à jour.");
      return;
    }
    setState("done");
    setMessage("C’est enregistré.");
    router.refresh();
  }

  const weeks = (value: number, set: (n: number) => void, label: string, suffix: string) => (
    <>
      <label className="sr-only" htmlFor={`${id}-${suffix}`}>
        {label}
      </label>
      <input
        id={`${id}-${suffix}`}
        form={id}
        type="number"
        min={bounds.min}
        max={bounds.max}
        step={1}
        required
        className="field__input stock-input"
        value={value}
        onChange={(e) => set(Number(e.target.value))}
      />
    </>
  );

  return (
    <tr>
      <td>
        <Link href={`/boutique/${piece.handle}`} className="catalogue-table__piece">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={piece.image} alt="" width={40} height={60} />
          <span>{piece.title}</span>
        </Link>
        <span className="t-note">{piece.sizes.join(" · ")}</span>
      </td>
      <td>
        {piece.priceVaries ? (
          <p className="t-note" id={`${id}-prix`}>
            À partir de {euros(piece.price).replace(".", ",")} €. Les tailles n’ont pas toutes le même prix : réglez-les dans Shopify.
          </p>
        ) : (
          <span className="stock-editor">
            <label className="sr-only" htmlFor={`${id}-prix`}>
              {piece.title}, prix en euros
            </label>
            <input id={`${id}-prix`} form={id} type="number" min={0.01} step={0.01} required inputMode="decimal" className="field__input stock-input" value={price} onChange={(e) => setPrice(e.target.value)} />
            <span aria-hidden="true">€</span>
          </span>
        )}
        <label className="check t-note">
          <input type="checkbox" form={id} checked={priceProvisional} onChange={(e) => setPriceProvisional(e.target.checked)} />
          <span>
            <span className="sr-only">{piece.title}, prix </span>provisoire
          </span>
        </label>
      </td>
      <td>
        <span className="stock-editor">
          {weeks(min, setMin, `${piece.title}, délai le plus court en semaines`, "min")}
          <span>à</span>
          {weeks(max, setMax, `${piece.title}, délai le plus long en semaines`, "max")}
          <span>semaines</span>
        </span>
        <label className="check t-note">
          <input type="checkbox" form={id} checked={leadTimeProvisional} onChange={(e) => setLeadTimeProvisional(e.target.checked)} />
          <span>
            <span className="sr-only">{piece.title}, délai </span>provisoire
          </span>
        </label>
      </td>
      <td>
        <label className="check t-note">
          <input type="checkbox" form={id} checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
          <span>
            <span className="sr-only">{piece.title}, pastille </span>Nouveau
          </span>
        </label>
      </td>
      <td>
        <form id={id} onSubmit={save}>
          <button type="submit" className="btn" disabled={!dirty || state === "busy"}>
            {state === "busy" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
        {message ? (
          <p className={state === "error" ? "field__error" : "t-note"} role={state === "error" ? "alert" : "status"}>
            {message}
          </p>
        ) : null}
      </td>
    </tr>
  );
}
