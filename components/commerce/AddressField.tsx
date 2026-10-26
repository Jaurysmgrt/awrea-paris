"use client";
/**
 * Champ d'adresse avec suggestions pendant la saisie (France) — motif « combobox » ARIA :
 * flèches pour parcourir, Entrée pour choisir, Échap pour fermer. La saisie libre reste possible.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useTexts } from "@/components/content/Texts";
import type { CommerceTexts } from "@/lib/commerce/texts";

export interface PickedAddress {
  line1: string;
  postalCode: string;
  city: string;
}

type Suggestion = PickedAddress & { label: string };

export function AddressField({
  id,
  name,
  defaultValue,
  country,
  onPick,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  country: string;
  onPick: (a: PickedAddress) => void;
}) {
  const listId = useId();
  const champs = useTexts<CommerceTexts>("commerce").commande.champs;
  const [value, setValue] = useState(defaultValue ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const picked = useRef(false);

  useEffect(() => {
    if (picked.current || country !== "FR" || value.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/adresse?q=${encodeURIComponent(value)}&country=${country}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => {
          setItems(j.suggestions ?? []);
          setOpen((j.suggestions ?? []).length > 0);
          setActive(-1);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, country]);

  const choose = (s: Suggestion) => {
    picked.current = true;
    setValue(s.line1);
    setOpen(false);
    setItems([]);
    onPick(s);
  };

  return (
    <div className="combo">
      <input
        className="field__input"
        id={id}
        name={name}
        required
        autoComplete="address-line1"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(e) => {
          picked.current = false;
          setValue(e.target.value);
          if (e.target.value.trim().length < 3) setOpen(false);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <ul id={listId} role="listbox" className="combo__list" hidden={!open} aria-label={champs.adressesSuggerees}>
        {items.map((s, i) => (
          <li
            key={s.label}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className="combo__option"
            onMouseDown={(e) => {
              e.preventDefault();
              choose(s);
            }}
          >
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
