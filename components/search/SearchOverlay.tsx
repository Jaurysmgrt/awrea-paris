"use client";
/**
 * Recherche plein écran : un grand champ en Bodoni sur papier ivoire (noir en mode Nuit),
 * des résultats qui apparaissent à chaque lettre, regroupés en Pièces, Collections, Journal
 * et La maison. « Entrée » ouvre la page de résultats complète (/recherche).
 * Chargée à la demande : elle ne pèse rien tant qu'on ne l'ouvre pas.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/Link";
import { groupByKind, search, searchSuggestions, type SearchEntry } from "@/lib/search/match";
import { isolate } from "@/lib/dom/isolate";
import { loadSearchIndex } from "./load";
import { SearchResults } from "./SearchResults";

type Props = { open: boolean; onClose: () => void };

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || entries) return;
    loadSearchIndex()
      .then(setEntries)
      .catch(() => setFailed(true));
  }, [open, entries]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const release = isolate(ref.current);
    document.documentElement.classList.add("is-locked");
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    const opener = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
      document.documentElement.classList.remove("is-locked");
      lenis?.start();
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const results = useMemo(() => (entries ? search(entries, query) : []), [entries, query]);
  const groups = useMemo(() => groupByKind(results), [results]);
  const typed = query.trim().length > 0;
  const status = !typed || !entries ? "" : results.length ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Aucun résultat";

  const go = () => onClose();

  return (
    <div
      ref={ref}
      className="search"
      data-theme="ivory"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label="Recherche"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="search__inner container">
        <div className="search__bar">
          <form
            role="search"
            action="/recherche"
            className="search__form"
            onSubmit={(e) => {
              e.preventDefault();
              const value = q.trim();
              if (!value) return;
              onClose();
              router.push(`/recherche?q=${encodeURIComponent(value)}`);
            }}
          >
            <label htmlFor="search-q" className="t-label search__label">
              Rechercher
            </label>
            <input
              id="search-q"
              ref={inputRef}
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Une pièce, une matière…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-describedby="search-status"
              className="search__input"
            />
          </form>
          <button type="button" className="link link--quiet search__close" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p id="search-status" className="sr-only" aria-live="polite">
          {status}
        </p>

        {!typed ? (
          <div className="search__suggest">
            <p className="t-label t-soft">Pistes</p>
            <ul className="search__chips">
              {searchSuggestions.map((s) => (
                <li key={s}>
                  <button type="button" className="chip" onClick={() => setQ(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : !entries ? (
          failed ? (
            <p className="t-body search__empty">La recherche ne répond pas pour l’instant. Toutes les pièces restent visibles dans la boutique.</p>
          ) : (
            <div className="search__skeleton" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="search__skeleton-card">
                  <div className="skeleton skeleton--media" />
                  <div className="skeleton skeleton--line" />
                  <div className="skeleton skeleton--line skeleton--short" />
                </div>
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          <div className="search__empty stack-s">
            <p className="t-h3">Rien ne répond encore à « {query.trim()} ».</p>
            <p className="t-body t-soft">
              Essayez une matière, une forme ou le nom d’une collection. Ou{" "}
              <Link href="/boutique" className="text-link" onClick={go}>
                parcourez toute la boutique
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="search__results">
            <SearchResults groups={groups} onNavigate={go} />
            {results.length > 8 ? (
              <p>
                <Link href={`/recherche?q=${encodeURIComponent(query.trim())}`} className="link" onClick={go}>
                  Voir les {results.length} résultats
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
