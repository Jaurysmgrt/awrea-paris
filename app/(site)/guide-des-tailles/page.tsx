import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { shop } from "@/content/settings";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import ed from "@/components/home/editorial.module.css";
import styles from "./guide-des-tailles.module.css";

/**
 * Guide des tailles : le tableau des réglages (content/settings.ts, shop.sizeGuide, le même que
 * sur chaque fiche et pour « Trouver ma taille »), la façon de prendre ses mesures, et le chemin
 * vers « Trouver ma taille ». Tant que la Maison n'a pas confirmé le tableau, une mention le dit.
 * Aucune mesure de pièce : seulement des mesures du corps. Textes : content/site/fr/guide-des-tailles.json.
 */
type GuideDesTailles = typeof import("@/content/site/fr/guide-des-tailles.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<GuideDesTailles>("guide-des-tailles", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/guide-des-tailles" });
}

export default async function GuideDesTaillesPage() {
  const t = await getDoc<GuideDesTailles>("guide-des-tailles");
  const guide = shop.sizeGuide;
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/guide-des-tailles" }]} />

      {/* ------------------------------------------------ LE TABLEAU */}
      <Section theme="ivory" className="section section--flush-top" labelledBy="tailles-tableau">
        <div className="container-prose">
          <h2 id="tailles-tableau" className="t-h2">
            {t.tableau.titre}
          </h2>
          {/* zone qui défile sur téléphone : atteignable au clavier, nommée par le titre du tableau */}
          <div className={`table-scroll ${styles.tableau}`} tabIndex={0} role="region" aria-labelledby="tailles-tableau">
            <table className="table">
              <caption className={`t-note ${styles.legende}`}>{t.tableau.legende}</caption>
              <thead>
                <tr>
                  {guide.headers.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) =>
                      i === 0 ? (
                        <th key={i} scope="row">
                          {c}
                        </th>
                      ) : (
                        <td key={i}>{c}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!guide.confirme ? (
            <p className={`notice ${styles.aConfirmer}`} role="note">
              {t.tableau.aConfirmer}
            </p>
          ) : null}
        </div>
      </Section>

      {/* ------------------------------------------------ PRENDRE SES MESURES */}
      <Section theme="pearl" className="section--tall" labelledBy="tailles-mesures">
        <div className="container-prose">
          <div className={ed.tete}>
            <h2 id="tailles-mesures" className="t-h2">
              {t.mesures.titre}
            </h2>
            <p className="t-body">{t.mesures.conseil}</p>
          </div>
          <dl className={`${styles.mesures} ${ed.apresTete}`}>
            {t.mesures.liste.map((m) => (
              <div key={m.titre} className={styles.mesure}>
                <dt className="t-h4">{m.titre}</dt>
                <dd>
                  <p className="t-body">{m.texte}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ------------------------------------------------ TROUVER MA TAILLE */}
      <Section theme="ivory" className="section--tall" labelledBy="tailles-trouver">
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.trouver.surtitre}</p>
            <h2 id="tailles-trouver" className="t-h2">
              {t.trouver.titre}
            </h2>
            <p className="t-body">{t.trouver.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.trouver.cta.href} className="btn">
              {t.trouver.cta.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
