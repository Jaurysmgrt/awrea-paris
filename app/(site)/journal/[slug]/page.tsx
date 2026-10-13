import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getArticle, getArticles } from "@/lib/content/journal";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { formatDate } from "@/lib/format";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  return pageMetadata({ ...a.seo, path: `/journal/${a.slug}`, image: a.cover.src, type: "article" });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const others = (await getArticles()).filter((x) => x.slug !== a.slug).slice(0, 2);
  return (
    <article>
      <JsonLd data={articleSchema({ title: a.title, description: a.seo.description, path: `/journal/${a.slug}`, image: a.cover.src, date: a.date })} />
      <Section theme="ivory" as="header" className="article-head">
        <div className="container-prose page-head">
          <Breadcrumbs items={[{ name: "Journal", path: "/journal" }, { name: a.title, path: `/journal/${a.slug}` }]} />
          <p className="t-label t-soft">
            {a.category} · <time dateTime={a.date}>{formatDate(a.date)}</time> · {a.readingMinutes} min de lecture
          </p>
          <h1 className="t-h1">{a.title}</h1>
          <p className="t-lead">{a.excerpt}</p>
        </div>
        <div className="container">
          <Media image={a.cover} ratio="wide" priority sizes="100vw" />
        </div>
      </Section>
      <Section theme="ivory" className="section">
        <div className="container-prose prose article-body">
          {a.body.map((b, i) => {
            switch (b.type) {
              case "p":
                return <p key={i}>{b.text}</p>;
              case "h2":
                return <h2 key={i}>{b.text}</h2>;
              case "quote":
                return (
                  <blockquote key={i} className="pull-quote">
                    <p className="t-script">{b.text}</p>
                    {b.cite ? <footer className="t-label">{b.cite}</footer> : null}
                  </blockquote>
                );
              case "image":
                return (
                  <figure key={i} className="article-figure">
                    <Media image={b} ratio="auto" sizes="(min-width: 48rem) 42rem, 100vw" />
                    {b.caption ? <figcaption className="t-note media__caption">{b.caption}</figcaption> : null}
                  </figure>
                );
              case "moodboard":
                return (
                  <ul key={i} className="article-moodboard">
                    {b.images.map((im) => (
                      <li key={im.src}>
                        <Media image={im} ratio="portrait" sizes="(min-width: 48rem) 14rem, 33vw" />
                      </li>
                    ))}
                  </ul>
                );
            }
          })}
        </div>
      </Section>
      {others.length ? (
        <Section theme="pearl" className="section" labelledBy="more-title">
          <div className="container">
            <h2 id="more-title" className="t-label">
              À lire aussi
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
