import Link from "@/components/ui/Link";
import { home } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { atelier } from "@/content/fr/pages";
import { getCurrentCollection, getLooks, getProducts, getProductsByHandles } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { LaceReveal } from "@/components/signature/LaceReveal";
import { LightHalo } from "@/components/signature/LightHalo";
import { ShopTheLook } from "@/components/signature/ShopTheLook";
import { ProductCard } from "@/components/commerce/ProductCard";
import { InstagramGrid } from "@/components/home/InstagramGrid";
import { getInstagramPosts } from "@/lib/instagram/feed";
import { formatPrice, roman } from "@/lib/format";
import { editionInfo } from "@/lib/commerce/availability";

export const metadata = pageMetadata({ ...home.seo, path: "/" });
export const revalidate = 300;

export default async function HomePage() {
  const collection = await getCurrentCollection();
  const [collectionProducts, featured, looks, posts] = await Promise.all([
    getProductsByHandles(collection?.products ?? []),
    getProducts(),
    getLooks(),
    getInstagramPosts(),
  ]);
  const look = looks[0];
  const lookProducts = look ? await getProductsByHandles(look.hotspots.map((h) => h.product)) : [];
  const highlights = featured.filter((p) => p.collection === collection?.handle).slice(0, 4);

  return (
    <>
      {/* ------------------------------------------------ OUVERTURE */}
      <Section theme="ink" className="hero" labelledBy="hero-title">
        <LaceReveal
          label="Film de la collection Lace is more : dentelle noire et satin en mouvement"
          video={{
            src: "/media/video/hero-desktop.mp4",
            mobileSrc: "/media/video/hero-mobile.mp4",
            poster: "/media/video/hero-desktop.webp",
            mobilePoster: "/media/video/hero-mobile.webp",
          }}
        >
          <div className="hero__content container">
            <h1 id="hero-title" className="t-label t-label--wide hero__h1">
              {home.hero.h1}
            </h1>
            <p className="t-giant hero__title" aria-hidden="true">
              {home.hero.title}
            </p>
            <p className="t-lead hero__lead t-center">{home.hero.lead}</p>
            <div className="hero__cta">
              <Link href={home.hero.cta.href} className="btn btn--solid">
                {home.hero.cta.label}
              </Link>
            </div>
          </div>
          <p className="hero__scroll t-label" aria-hidden="true">
            Défiler
          </p>
        </LaceReveal>
      </Section>

      {/* ------------------------------------------------ COLLECTION EN COURS */}
      {collection ? (
        <Section theme="ivory" className="section--tall" labelledBy="collection-title">
          <div className="container grid-12 home-collection">
            <div className="home-collection__media" data-reveal>
              <Link href={`/collections/${collection.handle}`} aria-label={`Collection ${collection.title}`}>
                <Media image={collection.cover} ratio="tall" sizes="(min-width: 64rem) 50vw, 100vw" className="reveal-img" />
              </Link>
            </div>
            <div className="home-collection__text stack-m" data-reveal>
              <p className="eyebrow">{home.collection.eyebrow}</p>
              <h2 id="collection-title" className="t-h2">
                {home.collection.title}
              </h2>
              <p className="t-body">{home.collection.text}</p>
              <ol className="home-collection__list">
                {collectionProducts.map((p, i) => (
                  <li key={p.handle}>
                    <Link href={`/boutique/${p.handle}`} className="home-collection__item">
                      <span className="t-label t-accent">{roman(i + 1)}</span>
                      <span className="t-h4">{p.title}</span>
                      <span className="home-collection__dots" aria-hidden="true" />
                      <span className="price">{formatPrice(p.price)}</span>
                      <span className="t-label t-soft">{editionInfo(p).unique ? "Unique" : `${editionInfo(p).total} pièces`}</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link href={home.collection.cta.href} className="link">
                {home.collection.cta.label}
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------ PIÈCES PHARES */}
      <Section theme="pearl" className="section--tall" labelledBy="featured-title">
        <div className="container">
          <header className="section-head" data-reveal>
            <p className="eyebrow">{home.featured.eyebrow}</p>
            <h2 id="featured-title" className="t-h2">
              {home.featured.title}
            </h2>
            <Link href={home.featured.cta.href} className="link section-head__link">
              {home.featured.cta.label}
            </Link>
          </header>
          <ul className="editorial-grid">
            {highlights.map((p, i) => (
              <li key={p.handle} className={`editorial-grid__item editorial-grid__item--${i % 4}`} data-reveal>
                <ProductCard product={p} sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw" />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ------------------------------------------------ MANIFESTE */}
      <Section theme="ink" className="manifesto section--tall" labelledBy="manifesto-title">
        <LightHalo />
        <div className="container-prose manifesto__inner t-center">
          <p className="eyebrow manifesto__eyebrow">{home.manifesto.eyebrow}</p>
          <h2 id="manifesto-title" className="t-display manifesto__script" data-reveal>
            {home.manifesto.script}
          </h2>
          <div className="stack-m manifesto__lines" data-reveal>
            {home.manifesto.lines.map((l) => (
              <p key={l} className="t-lead t-center">
                {l}
              </p>
            ))}
          </div>
          <span className="ornament" aria-hidden="true" />
          <blockquote className="manifesto__quote">
            <p className="t-body t-center">« {identity.founderQuote} »</p>
            <footer className="t-label">{identity.founderTitle}</footer>
          </blockquote>
          <Link href={home.manifesto.cta.href} className="btn btn--solid">
            {home.manifesto.cta.label}
          </Link>
        </div>
      </Section>

      {/* ------------------------------------------------ SHOP THE LOOK */}
      {look ? (
        <Section theme="ivory" className="section--tall" labelledBy="look-title">
          <div className="container grid-12 home-look">
            <div className="home-look__text stack-m" data-reveal>
              <p className="eyebrow">{home.look.eyebrow}</p>
              <h2 id="look-title" className="t-h2">
                {home.look.title}
              </h2>
              <p className="t-body">{home.look.text}</p>
              <Link href={home.look.cta.href} className="link">
                {home.look.cta.label}
              </Link>
            </div>
            <div className="home-look__stage" data-reveal>
              <ShopTheLook look={look} products={lookProducts} />
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------ ATELIER */}
      <Section theme="ink" className="section--tall home-atelier" labelledBy="atelier-title">
        <LightHalo intensity={0.8} />
        <div className="container grid-12">
          <div className="home-atelier__text stack-m" data-reveal>
            <p className="eyebrow">{home.atelier.eyebrow}</p>
            <h2 id="atelier-title" className="t-h2">
              {home.atelier.title}
            </h2>
            <p className="t-body">{home.atelier.text}</p>
            <Link href={home.atelier.cta.href} className="btn btn--solid">
              {home.atelier.cta.label}
            </Link>
          </div>
          <div className="home-atelier__videos">
            {atelier.videos.slice(0, 2).map((v, i) => (
              <figure key={v.src} className={`home-atelier__video home-atelier__video--${i}`} data-reveal>
                <VideoLazy src={v.src} poster={v.poster} label={v.caption} className="media media--landscape" />
                <figcaption className="t-label media__caption">{v.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ NEWSLETTER (LETTRE) */}
      <Section theme="paper" className="section--tall" labelledBy="news-title">
        <div className="container-text letter-card stack-m t-center" data-reveal>
          <p className="eyebrow">{home.newsletter.eyebrow}</p>
          <h2 id="news-title" className="t-h2">
            {home.newsletter.title}
          </h2>
          <p className="t-body">{home.newsletter.text}</p>
          <NewsletterForm source="home" />
        </div>
      </Section>

      {/* ------------------------------------------------ INSTAGRAM */}
      <Section theme="ivory" className="section" labelledBy="insta-title">
        <div className="container">
          <header className="section-head section-head--row" data-reveal>
            <p className="eyebrow">{home.instagram.eyebrow}</p>
            <h2 id="insta-title" className="t-h3">
              <a href={identity.social.instagram} target="_blank" rel="noopener noreferrer" className="link-plain">
                {home.instagram.title}
              </a>
            </h2>
          </header>
          <InstagramGrid posts={posts} />
        </div>
      </Section>
    </>
  );
}
