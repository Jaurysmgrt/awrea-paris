"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export function StockEditor({ handle, size, quantity }: { handle: string; size: string; quantity: number }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [value, setValue] = useState(quantity);
  const [busy, setBusy] = useState(false);
  const dirty = value !== quantity;
  return (
    <span className="stock-editor">
      <label className="sr-only" htmlFor={`st-${handle}-${size}`}>
        Stock {size}
      </label>
      <input id={`st-${handle}-${size}`} type="number" min={0} max={100} className="field__input stock-input" value={value} onChange={(e) => setValue(Number(e.target.value))} />
      {dirty ? (
        <button
          type="button"
          className="link link--quiet"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch(api("/stock"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, size, quantity: value }) });
            setBusy(false);
            router.refresh();
          }}
        >
          OK
        </button>
      ) : null}
    </span>
  );
}
