import Link from "@/components/ui/Link";
import { journalPage } from "@/content/fr/pages";
import { getArticles } from "@/lib/content/journal";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { formatDate } from "@/lib/format";

export const metadata = pageMetadata({ ...journalPage.seo, path: "/journal" });
export const revalidate = 300;

export default async function JournalPage() {
  const articles = await getArticles();
  const [first, ...rest] = articles;
  return (
    <>
      <PageHeader title={journalPage.h1} lead={journalPage.lead} crumbs={[{ name: "Journal", path: "/journal" }]} script />
      <Section theme="ivory" className="section section--flush-top" aria-label="Articles">
        <div className="container">
          {first ? (
            <article className="journal-lead grid-12" data-reveal>
              <Link href={`/journal/${first.slug}`} className="journal-lead__media" tabIndex={-1} aria-hidden="true">
                <Media image={first.cover} ratio="wide" priority sizes="(min-width: 64rem) 60vw, 100vw" className="reveal-img" />
              </Link>
              <div className="journal-lead__text stack">
                <p className="t-label t-soft">
                  {first.category} · <time dateTime={first.date}>{formatDate(first.date)}</time>
                </p>
                <h2 className="t-h2">
                  <Link href={`/journal/${first.slug}`} className="link-plain">
                    {first.title}
                  </Link>
                </h2>
                <p className="t-body">{first.excerpt}</p>
                <Link href={`/journal/${first.slug}`} className="link">
                  Lire · {first.readingMinutes} min
                </Link>
              </div>
            </article>
          ) : null}
          <ul className="journal-list">
            {rest.map((a) => (
              <li key={a.slug} data-reveal>
                <article className="journal-card stack">
                  <Link href={`/journal/${a.slug}`} tabIndex={-1} aria-hidden="true">
                    <Media image={a.cover} ratio="landscape" sizes="(min-width: 64rem) 30vw, 100vw" className="reveal-img" />
                  </Link>
                  <p className="t-label t-soft">
                    {a.category} · <time dateTime={a.date}>{formatDate(a.date)}</time>
                  </p>
                  <h2 className="t-h3">
                    <Link href={`/journal/${a.slug}`} className="link-plain">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="t-body">{a.excerpt}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
