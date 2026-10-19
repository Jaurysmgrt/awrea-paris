import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { LightHalo } from "@/components/signature/LightHalo";
import { Visuel } from "@/components/home/Visuel";
import ed from "@/components/home/editorial.module.css";
import styles from "./la-maison.module.css";

/**
 * La Maison : le texte officiel « À propos » de la créatrice, en entier et dans l'ordre, marqué
 * data-officiel. Sa devise ouvre la page en très grand titre (une phrase par ligne) ; l'histoire
 * suit, à côté de son portrait. Textes : content/site/fr/la-maison.json.
 */
type LaMaison = typeof import("@/content/site/fr/la-maison.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<LaMaison>("la-maison", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/la-maison", image: t.portrait.src });
}

export default async function MaisonPage() {
  const t = await getDoc<LaMaison>("la-maison");
  return (
    <>
      {/* en-tête de page (mêmes classes que components/ui/PageHeader) : le titre est la devise officielle */}
      <Section theme="ivory" as="header" className="page-header">
        <div className="container page-head page-head--center">
          <Breadcrumbs items={[{ name: t.titre, path: "/la-maison" }]} />
          <p className="eyebrow">{t.titre}</p>
          <h1 className={`page-head__title t-display ${styles.devise}`} data-officiel>
            {t.apropos.titre.map((ligne, i) => (
              <Fragment key={ligne}>
                {i ? " " : null}
                <span className={styles.ligne}>{ligne}</span>
              </Fragment>
            ))}
          </h1>
        </div>
      </Section>

      <Section theme="ivory" className="section section--flush-top" aria-label={t.titre}>
        <div className={`container ${styles.apropos}`}>
          <Visuel image={t.portrait} legende={t.legende} priority className={styles.portrait} sizes="(min-width: 48rem) 40vw, 100vw" />
          <div className={ed.texte} data-officiel>
            {t.apropos.paragraphes.map((p) => (
              <p key={p} className="t-body">
                {p}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section theme="ink" className="section--tall" labelledBy="maison-suite">
        <LightHalo intensity={0.7} />
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.suite.surtitre}</p>
            <h2 id="maison-suite" className="t-h2">
              {t.suite.titre}
            </h2>
            <p className="t-body t-center">{t.suite.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.suite.cta.href} className="btn">
              {t.suite.cta.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
