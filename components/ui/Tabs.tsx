"use client";
/**
 * Onglets accessibles (motif ARIA « tabs ») : flèches gauche/droite, Début/Fin,
 * un seul onglet dans l'ordre de tabulation. Sur mobile, la rangée défile horizontalement.
 */
import { useId, useRef } from "react";

export function Tabs<T extends string>({ label, items, value, onChange, children }: { label: string; items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; children: React.ReactNode }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusAt = (i: number) => {
    const n = (i + items.length) % items.length;
    refs.current[n]?.focus();
    onChange(items[n].id);
  };
  return (
    <div className="tabs-wrap">
      <div role="tablist" aria-label={label} className="tabs">
        {items.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${t.id}`}
            aria-selected={value === t.id}
            aria-controls={`${base}-panel`}
            tabIndex={value === t.id ? 0 : -1}
            className="tab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") focusAt(i + 1);
              else if (e.key === "ArrowLeft") focusAt(i - 1);
              else if (e.key === "Home") focusAt(0);
              else if (e.key === "End") focusAt(items.length - 1);
              else return;
              e.preventDefault();
            }}
          >
            {t.label}
            {t.count ? <span className="tab__count">{t.count}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`} className="tabs__panel" tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
