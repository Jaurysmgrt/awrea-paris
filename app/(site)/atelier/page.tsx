import Link from "@/components/ui/Link";
import { atelier } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { LightHalo } from "@/components/signature/LightHalo";
import { Sketchbook } from "@/components/atelier/Sketchbook";

export const metadata = pageMetadata({ ...atelier.seo, path: "/atelier", image: "/media/img/atelier-2" });

const stepImages = [
  { src: "/media/img/atelier-6", alt: "Mains cousant à l’aiguille un vêtement ivoire", width: 1200, height: 1500 },
  { src: "/media/img/atelier-1", alt: "Prise de mesures au mètre ruban sur une robe noire", width: 1200, height: 800 },
  { src: "/media/img/atelier-5", alt: "Motifs de dentelle ivoire découpés à la main, ciseaux à broder", width: 1200, height: 1500 },
  { src: "/media/img/atelier-3", alt: "Point invisible cousu à la main sur une toile ivoire", width: 1200, height: 800 },
  { src: "/media/img/gaia-detail", alt: "Liseré doré posé à la main sur un bustier noir", width: 1200, height: 1800 },
  { src: "/media/img/atelier-4", alt: "Finitions d’une pièce sur la table de l’atelier", width: 1200, height: 800 },
];

export default function AtelierPage() {
  return (
    <>
      <PageHeader giant title={atelier.h1} lead={atelier.lead} crumbs={[{ name: "L’Atelier", path: "/atelier" }]} eyebrow="Savoir-faire" />

      <Section theme="ivory" className="section section--flush-top" aria-label="Les étapes de fabrication">
        <ol className="container steps">
          {atelier.steps.map((s, i) => (
            <li key={s.number} className={`step ${i % 2 ? "step--flip" : ""}`}>
              <div className="step__media" data-reveal>
                <Media image={stepImages[i]} ratio={stepImages[i].width > stepImages[i].height ? "landscape" : "look"} sizes="(min-width: 64rem) 45vw, 100vw" className="reveal-img" />
              </div>
              <div className="step__text stack-m" data-reveal>
                <span className="step__num" aria-hidden="true">
                  {s.number}
                </span>
                <h2 className="t-h2">{s.title}</h2>
                <p className="t-body">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section theme="paper" className="section--tall" labelledBy="sketch-title">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">{atelier.sketches.eyebrow}</p>
            <h2 id="sketch-title" className="t-h2">
              {atelier.sketches.title}
            </h2>
          </header>
          <Sketchbook />
        </div>
      </Section>

      <Section theme="ink" className="section--tall" labelledBy="films-title">
        <LightHalo intensity={0.7} />
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">Films d’atelier</p>
            <h2 id="films-title" className="t-h2">
              Le geste, en mouvement
            </h2>
          </header>
          <ul className="films">
            {atelier.videos.map((v) => (
              <li key={v.src} data-reveal>
                <figure>
                  <VideoLazy src={v.src} poster={v.poster} label={v.caption} className="media media--landscape" />
                  <figcaption className="t-label media__caption">{v.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section theme="ivory" className="section--tall" labelledBy="rdv-title">
        <div className="container-text t-center stack-m">
          <p className="eyebrow">Sur rendez-vous</p>
          <h2 id="rdv-title" className="t-h2">
            {atelier.appointment.title}
          </h2>
          <p className="t-body t-center">{atelier.appointment.text}</p>
          <div>
            <Link href={atelier.appointment.cta.href} className="btn">
              {atelier.appointment.cta.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
