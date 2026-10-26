import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { stegaClean } from "@/lib/edition/stega";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "@/components/ui/Link";
import { SearchResults } from "@/components/search/SearchResults";
import { buildSearchIndex } from "@/lib/search";
import { groupByKind, search } from "@/lib/search/match";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";

type Recherche = typeof import("@/content/site/fr/recherche.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Recherche>("recherche", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/recherche", noindex: true });
}

/** Page de résultats complète : ouverte par « Entrée » dans la recherche plein écran, ou sans JavaScript. */
export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 80).trim() ?? "";
  const locale = await getLocale();
  const [t, results] = await Promise.all([getDoc<Recherche>("recherche"), q ? buildSearchIndex(locale).then((index) => search(index, q, 60)) : []]);
  const groups = groupByKind(results);
  const count = results.length === 1 ? t.resultats.un : t.resultats.plusieurs;

  return (
    <>
      <PageHeader title={t.titre} crumbs={[{ name: t.titre, path: "/recherche" }]}>
        <form role="search" action={localizePath("/recherche", locale)} className="search-page__form">
          <label htmlFor="recherche-q" className="t-label search__label">
            {t.champ}
          </label>
          <input id="recherche-q" type="search" name="q" defaultValue={q} maxLength={80} className="search__input" enterKeyHint="search" />
        </form>
        {q ? (
          <p className="t-note" role="status">
            {results.length ? fill(count, { n: results.length, q }) : fill(t.aucun, { q })}
          </p>
        ) : null}
      </PageHeader>
      <Section theme="ivory" className="section section--flush-top" aria-label={t.zone}>
        <div className="container search__results search-page__results">
          {groups.length ? (
            <SearchResults groups={groups} maxPieces={60} maxRows={30} />
          ) : (
            <div className="search__empty stack-s">
              <p className="t-body">
                {t.essayez}{" "}
                {t.suggestions.map((s, i) => (
                  <span key={i}>
                    {i ? ", " : ""}
                    <Link href={`/recherche?q=${encodeURIComponent(stegaClean(s))}`} className="text-link">
                      {s}
                    </Link>
                  </span>
                ))}
                .
              </p>
              <div>
                <Link href={t.toutes.href} className="link">
                  {t.toutes.label}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
