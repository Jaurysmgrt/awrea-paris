import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { LightHalo } from "@/components/signature/LightHalo";
import { Visuel } from "@/components/home/Visuel";
import ed from "@/components/home/editorial.module.css";
import styles from "./atelier.module.css";

/**
 * L'Atelier : le texte officiel TEASING MARQUE décliné en quatre chapitres (création sur demande,
 * artisans français, conditions de travail, environnement). Chaque chapitre cite la phrase
 * officielle de la créatrice (data-officiel), puis la prolonge dans sa voix, sans aucun fait
 * inventé : ni lieu, ni nombre d'artisans, ni chiffre. Textes : content/site/fr/atelier.json.
 */
type Atelier = typeof import("@/content/site/fr/atelier.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Atelier>("atelier", { plain: true });
  // visuel provisoire jamais envoyé aux réseaux (mention « visuel provisoire » absente des aperçus)
  const image = t.chapitres[0]?.image;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/atelier", image: image && !image.provisoire ? image.src : undefined });
}

export default async function AtelierPage() {
  const t = await getDoc<Atelier>("atelier");
  return (
    <>
      <PageHeader giant title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/atelier" }]} />

      <Section theme="ivory" className="section section--flush-top" aria-label={t.titre}>
        <ol className={`container ${styles.chapitres}`}>
          {t.chapitres.map((c, i) => (
            <li key={c.titre} className={`${ed.split} ${i % 2 ? ed.flip : ""}`}>
              <Visuel image={c.image} ratio="look" sizes="(min-width: 48rem) 45vw, 100vw" />
              <div className={ed.texte}>
                <div className={ed.tete}>
                  <p className="eyebrow">{c.surtitre}</p>
                  <h2 id={`atelier-chapitre-${i}`} className="t-h2">
                    {c.titre}
                  </h2>
                </div>
                <blockquote className={ed.citation} data-officiel>
                  <p className="t-lead">{c.citation.texte}</p>
                </blockquote>
                <p className="t-body">{c.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section theme="ink" className="section--tall" labelledBy="atelier-fin">
        <LightHalo intensity={0.7} />
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.fin.surtitre}</p>
            <h2 id="atelier-fin" className="t-h2">
              {t.fin.titre}
            </h2>
            <p className="t-body t-center">{t.fin.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.fin.cta.href} className="btn">
              {t.fin.cta.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
