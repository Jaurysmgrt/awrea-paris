/**
 * « Dans l'atelier » : un geste filmé et une légende, comme on accroche une photographie
 * dans une galerie. Un seul message, un seul lien. Textes et vidéos du document « coulisses »
 * (content/site/fr/coulisses.json), lus par la page. Les vidéos sont provisoires (animées à partir
 * des photographies de l'ancien site), à remplacer par des images des artisans de la Maison ; les
 * légendes disent ce qu'on y voit, sans prêter aux artisans un geste qu'ils n'ont pas confirmé.
 */
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { fill } from "@/lib/edition/fill";

export type CoulissesTexts = typeof import("@/content/site/fr/coulisses.json");
export type AtelierMomentKey = keyof CoulissesTexts["moments"];

export function AtelierNote({ t, moment, theme = "paper", link = true }: { t: CoulissesTexts; moment: AtelierMomentKey; theme?: "paper" | "ivory" | "pearl" | "ink"; link?: boolean }) {
  const m = t.moments[moment];
  const id = `atelier-${moment}`;
  return (
    <Section theme={theme} className="section atelier-note" labelledBy={id}>
      <div className="container atelier-note__grid">
        <figure className="atelier-note__media">
          <VideoLazy src={m.video.src} poster={m.video.poster} label={fill(t.videoLabel, { legende: m.legende.toLowerCase() })} className="media media--landscape" />
          <figcaption className="t-label t-soft atelier-note__caption">{m.legende}</figcaption>
        </figure>
        <div className="atelier-note__text stack-s">
          <p className="eyebrow">{t.surtitre}</p>
          <h2 id={id} className="t-h3">
            {m.titre}
          </h2>
          <p className="t-body">{m.texte}</p>
          {link ? (
            <p>
              <Link href={t.lien.href} className="link">
                {t.lien.label}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
