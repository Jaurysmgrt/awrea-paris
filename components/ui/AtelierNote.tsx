/**
 * « Dans l'atelier » : un geste filmé et une légende, comme on accroche une photographie
 * dans une galerie. Un seul message, un seul lien.
 */
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { VideoLazy } from "@/components/ui/VideoLazy";
import type { AtelierMoment } from "@/content/fr/coulisses";

export function AtelierNote({ moment, theme = "paper", link = true }: { moment: AtelierMoment; theme?: "paper" | "ivory" | "pearl" | "ink"; link?: boolean }) {
  const id = `atelier-${moment.key}`;
  return (
    <Section theme={theme} className="section atelier-note" labelledBy={id}>
      <div className="container atelier-note__grid">
        <figure className="atelier-note__media">
          <VideoLazy src={moment.video.src} poster={moment.video.poster} label={`Dans l’atelier : ${moment.caption.toLowerCase()}`} className="media media--landscape" />
          <figcaption className="t-label t-soft atelier-note__caption">{moment.caption}</figcaption>
        </figure>
        <div className="atelier-note__text stack-s">
          <p className="eyebrow">Dans l’atelier</p>
          <h2 id={id} className="t-h3">
            {moment.title}
          </h2>
          <p className="t-body">{moment.text}</p>
          {link ? (
            <p>
              <Link href="/atelier" className="link">
                Entrer dans l’atelier
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
