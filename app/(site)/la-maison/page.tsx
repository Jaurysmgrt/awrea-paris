import Link from "next/link";
import { maison } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { HandwrittenLetter } from "@/components/signature/HandwrittenLetter";
import { GoldenLight } from "@/components/signature/GoldenLight";
import { roman } from "@/lib/format";

export const metadata = pageMetadata({ ...maison.seo, path: "/la-maison", image: "/media/img/creatrice" });

export default function MaisonPage() {
  return (
    <>
      <PageHeader title={maison.h1} lead={maison.lead} crumbs={[{ name: "La Maison", path: "/la-maison" }]} eyebrow={identity.name} />

      {/* Faits clés : informations factuelles, identiques partout (Google, moteurs IA) */}
      <Section theme="ivory" className="section section--flush-top" aria-label="La maison en bref">
        <div className="container grid-12 maison-intro">
          <div className="maison-intro__media" data-reveal>
            <Media
              image={{ src: "/media/img/creatrice", alt: "Portrait en satin ivoire et longs gants, lumière douce — univers de la créatrice", width: 1200, height: 1500 }}
              ratio="look"
              priority
              sizes="(min-width: 64rem) 40vw, 100vw"
            />
          </div>
          <dl className="facts maison-intro__facts" data-reveal>
            {maison.facts.map((f) => (
              <div key={f.label} className="facts__row">
                <dt className="t-label t-soft">{f.label}</dt>
                <dd className="t-h4">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {maison.story.map((s, i) => (
        <Section key={s.title} theme={i === 1 ? "ink" : "ivory"} className="section--tall story" labelledBy={`story-${i}`}>
          {i === 1 ? <GoldenLight /> : null}
          <div className="container grid-12">
            <p className="story__num step__num" aria-hidden="true">
              {roman(i + 1)}
            </p>
            <div className="story__text stack-m" data-reveal>
              <h2 id={`story-${i}`} className="t-h2">
                {s.title}
              </h2>
              <div className="prose">
                {s.text.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </div>
          </div>
        </Section>
      ))}

      <Section theme="paper" className="section--tall letter" labelledBy="letter-title">
        <div className="container-prose stack-l">
          <header className="t-center stack">
            <p className="eyebrow">{maison.letter.eyebrow}</p>
            <h2 id="letter-title" className="sr-only">
              Lettre de la créatrice
            </h2>
          </header>
          <HandwrittenLetter lines={maison.letter.lines} signature={maison.letter.signature} label="Lettre de la créatrice" />
        </div>
      </Section>

      <Section theme="ink" className="section--tall" labelledBy="manifeste-title">
        <GoldenLight />
        <div className="container">
          <header className="section-head t-center manifesto-head">
            <p className="eyebrow">Manifeste</p>
            <h2 id="manifeste-title" className="t-script t-script--xl manifesto__script">
              {maison.manifesto.title}
            </h2>
          </header>
          <ol className="principles">
            {maison.manifesto.points.map((p, i) => (
              <li key={p.title} className="principles__item stack" data-reveal>
                <span className="t-label t-accent">{roman(i + 1)}</span>
                <h3 className="t-h3">{p.title}</h3>
                <p className="t-body">{p.text}</p>
              </li>
            ))}
          </ol>
          <div className="t-center manifesto-cta">
            <Link href="/atelier" className="btn btn--gold">
              Entrer dans l’atelier
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
