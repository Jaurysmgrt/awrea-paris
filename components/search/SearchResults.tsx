/**
 * Résultats de recherche regroupés (Pièces, Collections, Journal, La maison) : partagés par la
 * recherche plein écran et la page /recherche.
 */
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { formatPrice } from "@/lib/format";
import type { SearchEntry, SearchKind } from "@/lib/search/match";

type Group = { kind: SearchKind; label: string; items: SearchEntry[] };

export function SearchResults({ groups, onNavigate, maxPieces = 8, maxRows = 6 }: { groups: Group[]; onNavigate?: () => void; maxPieces?: number; maxRows?: number }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.kind} className={`search__group search__group--${g.kind}`} aria-labelledby={`resultats-${g.kind}`}>
          <h2 id={`resultats-${g.kind}`} className="t-label t-accent search__group-title">
            {g.label} <span className="t-soft">{g.items.length}</span>
          </h2>
          {g.kind === "piece" ? (
            <ul className="search__pieces">
              {g.items.slice(0, maxPieces).map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="search__piece" onClick={onNavigate}>
                    {r.image ? <Media image={r.image} ratio="portrait" sizes="(min-width: 64rem) 22vw, 45vw" decorative /> : null}
                    <span className="search__piece-title">{r.title}</span>
                    <span className="t-note">{r.note}</span>
                    {typeof r.price === "number" ? <span className="price search__price">{formatPrice(r.price)}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="search__list">
              {g.items.slice(0, maxRows).map((r) => (
                <li key={`${r.href}-${r.title}`}>
                  <Link href={r.href} className="search__row" onClick={onNavigate}>
                    <span className="search__row-title">{r.title}</span>
                    <span className="t-note">{r.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
