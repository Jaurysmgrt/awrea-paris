"use client";
/**
 * Recherche plein écran : un grand champ sur fond blanc cassé (noir en mode Nuit), des
 * résultats qui apparaissent à chaque lettre, regroupés en Pièces, Collections, Journal et
 * La Maison. « Entrée » ouvre la page de résultats complète (/recherche). Textes du document
 * « site » (clé « recherche »). Chargée à la demande : elle ne pèse rien tant qu'on ne l'ouvre pas.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalize } from "@/components/providers/LocaleProvider";
import Link from "@/components/ui/Link";
import { groupByKind, search, type SearchEntry } from "@/lib/search/match";
import { useTexts } from "@/components/content/Texts";
import { fill } from "@/lib/edition/fill";
import { isolate } from "@/lib/dom/isolate";
import { loadSearchIndex } from "./load";
import { SearchResults } from "./SearchResults";

type Props = { open: boolean; onClose: () => void };
type SiteTexts = typeof import("@/content/site/fr/site.json");

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const localize = useLocalize();
  const t = useTexts<SiteTexts>("site").recherche;
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
  const status = !typed || !entries ? "" : results.length > 1 ? fill(t.resultats, { n: results.length }) : results.length ? t.unResultat : t.aucunResultat;

  const go = () => onClose();

  return (
    <div
      ref={ref}
      className="search"
      data-theme="ivory"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label={t.nom}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="search__inner container">
        <div className="search__bar">
          <form
            role="search"
            action={localize("/recherche")}
            className="search__form"
            onSubmit={(e) => {
              e.preventDefault();
              const value = q.trim();
              if (!value) return;
              onClose();
              router.push(localize(`/recherche?q=${encodeURIComponent(value)}`));
            }}
          >
            <label htmlFor="search-q" className="t-label search__label">
              {t.label}
            </label>
            <input
              id="search-q"
              ref={inputRef}
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.champ}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-describedby="search-status"
              className="search__input"
            />
          </form>
          <button type="button" className="link link--quiet search__close" onClick={onClose}>
            {t.fermer}
          </button>
        </div>

        <p id="search-status" className="sr-only" aria-live="polite">
          {status}
        </p>

        {!typed ? (
          <div className="search__suggest">
            <p className="t-label t-soft">{t.pistes}</p>
            <ul className="search__chips">
              {t.suggestions.map((s) => (
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
            <p className="t-body search__empty">{t.indisponible}</p>
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
            <p className="t-h3">{fill(t.aucun, { q: query.trim() })}</p>
            <p className="t-body t-soft">{t.essayez}</p>
            <p>
              <Link href={t.toutes.href} className="text-link" onClick={go}>
                {t.toutes.label}
              </Link>
            </p>
          </div>
        ) : (
          <div className="search__results">
            <SearchResults groups={groups} onNavigate={go} />
            {results.length > 8 ? (
              <p>
                <Link href={`/recherche?q=${encodeURIComponent(query.trim())}`} className="link" onClick={go}>
                  {fill(t.voirTout, { n: results.length })}
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
