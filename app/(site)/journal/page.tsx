import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { getLocale } from "@/lib/i18n/server";
import { fill } from "@/lib/edition/fill";
import { getArticles } from "@/lib/content/journal";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import { formatDate } from "@/lib/format";

type Journal = typeof import("@/content/site/fr/journal.json");

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Journal>("journal", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/journal" });
}

export default async function JournalPage() {
  const locale = await getLocale();
  const [t, articles] = await Promise.all([getDoc<Journal>("journal"), getArticles()]);
  const [first, ...rest] = articles;
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/journal" }]} />
      <Section theme="ivory" className="section section--flush-top" aria-label={t.articles}>
        <div className="container">
          {first ? (
            <article className="journal-lead grid-12" data-reveal>
              <div className="journal-lead__media">
                <Link href={`/journal/${first.slug}`} tabIndex={-1} aria-hidden="true">
                  <Media image={first.cover} ratio="wide" priority sizes="(min-width: 64rem) 60vw, 100vw" className="reveal-img" />
                </Link>
                <ProvisionalNote image={first.cover} />
              </div>
              <div className="journal-lead__text stack">
                <p className="t-label t-soft">
                  {first.category} · <time dateTime={first.date}>{formatDate(first.date, locale)}</time>
                </p>
                <h2 className="t-h2">
                  <Link href={`/journal/${first.slug}`} className="link-plain">
                    {first.title}
                  </Link>
                </h2>
                <p className="t-body">{first.excerpt}</p>
                <Link href={`/journal/${first.slug}`} className="link">
                  {fill(t.lire, { minutes: first.readingMinutes })}
                </Link>
              </div>
            </article>
          ) : (
            <p className="t-lead">{t.vide}</p>
          )}
          {rest.length ? (
            <ul className="journal-list">
              {rest.map((a) => (
                <li key={a.slug} data-reveal>
                  <article className="journal-card stack">
                    <div>
                      <Link href={`/journal/${a.slug}`} tabIndex={-1} aria-hidden="true">
                        <Media image={a.cover} ratio="landscape" sizes="(min-width: 64rem) 30vw, 100vw" className="reveal-img" />
                      </Link>
                      <ProvisionalNote image={a.cover} />
                    </div>
                    <p className="t-label t-soft">
                      {a.category} · <time dateTime={a.date}>{formatDate(a.date, locale)}</time>
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
          ) : null}
        </div>
      </Section>
    </>
  );
}
