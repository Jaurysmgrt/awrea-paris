import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "@/components/ui/Link";
import { SearchResults } from "@/components/search/SearchResults";
import { buildSearchIndex } from "@/lib/search";
import { groupByKind, search, searchSuggestions } from "@/lib/search/match";

export const metadata = pageMetadata({
  title: "Recherche | Awrea Paris",
  description: "Rechercher une pièce, une matière, une collection ou une réponse sur le site Awrea Paris.",
  path: "/recherche",
  noindex: true,
});

/** Page de résultats complète : ouverte par « Entrée » dans la recherche plein écran, ou sans JavaScript. */
export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 80).trim() ?? "";
  const results = q ? search(await buildSearchIndex(), q, 60) : [];
  const groups = groupByKind(results);

  return (
    <>
      <PageHeader title="Recherche" crumbs={[{ name: "Recherche", path: "/recherche" }]}>
        <form role="search" action="/recherche" className="search-page__form">
          <label htmlFor="recherche-q" className="t-label search__label">
            Une pièce, une matière, une question
          </label>
          <input id="recherche-q" type="search" name="q" defaultValue={q} maxLength={80} className="search__input" enterKeyHint="search" />
        </form>
        {q ? (
          <p className="t-note" role="status">
            {results.length ? `${results.length} résultat${results.length > 1 ? "s" : ""} pour « ${q} »` : `Rien ne répond encore à « ${q} ».`}
          </p>
        ) : null}
      </PageHeader>
      <Section theme="ivory" className="section section--flush-top" aria-label="Résultats">
        <div className="container search__results search-page__results">
          {groups.length ? (
            <SearchResults groups={groups} maxPieces={60} maxRows={30} />
          ) : (
            <div className="search__empty stack-s">
              <p className="t-body">
                Essayez une matière, une forme ou le nom d’une collection :{" "}
                {searchSuggestions.map((s, i) => (
                  <span key={s}>
                    {i ? ", " : ""}
                    <Link href={`/recherche?q=${encodeURIComponent(s)}`} className="text-link">
                      {s.toLowerCase()}
                    </Link>
                  </span>
                ))}
                . Ou{" "}
                <Link href="/boutique" className="text-link">
                  parcourez toute la boutique
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
