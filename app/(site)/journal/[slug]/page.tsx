import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { getLocale } from "@/lib/i18n/server";
import { fill } from "@/lib/edition/fill";
import { getArticle, getArticles } from "@/lib/content/journal";
import { pageMetadata, siteDefaults } from "@/lib/seo/metadata";
import { articleSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import { formatDate } from "@/lib/format";

type Journal = typeof import("@/content/site/fr/journal.json");

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  // un visuel provisoire (image générée) n'est jamais transmis aux réseaux ni aux moteurs, qui ne
  // montrent pas la mention « visuel provisoire » : l'image de partage par défaut le remplace
  return pageMetadata({ ...a.seo, path: `/journal/${a.slug}`, image: a.cover.provisoire ? undefined : a.cover.src, type: "article" });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale();
  // article écrit en français (content/fr/journal.ts) : signalé comme tel sous /en
  const fr = locale !== "fr" ? "fr" : undefined;
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const [t, all] = await Promise.all([getDoc<Journal>("journal"), getArticles()]);
  const others = all.filter((x) => x.slug !== a.slug).slice(0, 2);
  const shareImage = a.cover.provisoire ? siteDefaults.image.url : a.cover.src;
  return (
    <article>
      <JsonLd data={articleSchema({ title: a.title, description: a.seo.description, path: `/journal/${a.slug}`, image: shareImage, date: a.date })} />
      <Section theme="ivory" as="header" className="article-head">
        <div className="container-prose page-head">
          <Breadcrumbs items={[{ name: t.titre, path: "/journal" }, { name: a.title, path: `/journal/${a.slug}` }]} />
          <p className="t-label t-soft">
            {a.category} · <time dateTime={a.date}>{formatDate(a.date, locale)}</time> · {fill(t.lecture, { minutes: a.readingMinutes })}
          </p>
          <h1 className="t-h1" lang={fr}>
            {a.title}
          </h1>
          <p className="t-lead" lang={fr}>
            {a.excerpt}
          </p>
        </div>
        <div className="container">
          <Media image={a.cover} ratio="wide" priority sizes="100vw" />
          <ProvisionalNote image={a.cover} />
        </div>
      </Section>
      <Section theme="ivory" className="section">
        <div className="container-prose prose article-body" lang={fr}>
          {a.body.map((b, i) => {
            switch (b.type) {
              case "p":
                return <p key={i}>{b.text}</p>;
              case "h2":
                return <h2 key={i}>{b.text}</h2>;
              case "quote":
                return (
                  <blockquote key={i} className="pull-quote" data-officiel={b.officiel ? "" : undefined}>
                    <p className="t-h2">{b.text}</p>
                    {b.cite ? <footer className="t-label">{b.cite}</footer> : null}
                  </blockquote>
                );
              case "image":
                return (
                  <figure key={i} className="article-figure">
                    <Media image={b} ratio="auto" sizes="(min-width: 48rem) 42rem, 100vw" />
                    {b.caption ? <figcaption className="t-note media__caption">{b.caption}</figcaption> : null}
                    <ProvisionalNote image={b} />
                  </figure>
                );
              case "moodboard":
                return (
                  <div key={i}>
                    <ul className="article-moodboard">
                      {b.images.map((im) => (
                        <li key={im.src}>
                          <Media image={im} ratio="portrait" sizes="(min-width: 48rem) 14rem, 33vw" />
                        </li>
                      ))}
                    </ul>
                    <ProvisionalNote image={{ provisoire: b.images.some((im) => im.provisoire) }} />
                  </div>
                );
            }
          })}
        </div>
      </Section>
      {others.length ? (
        <Section theme="pearl" className="section" labelledBy="more-title">
          <div className="container">
            <h2 id="more-title" className="t-label">
              {t.aLireAussi}
            </h2>
            <ul className="journal-more">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/journal/${o.slug}`} className="journal-more__link">
                    <span className="t-label t-soft">{o.category}</span>
                    <span className="t-h3">{o.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </article>
  );
}
