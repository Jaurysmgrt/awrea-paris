/**
 * Pied de page « atelier » : le bord festonné d'une dentelle, le monogramme en filigrane très
 * léger, la légende des signes du patron (le site se lit comme une feuille de patronage), les
 * liens utiles et les réglages d'affichage (Jour, Nuit, animations apaisées).
 * `chute` : le détail inattendu de l'accueil, un reste de dentelle tombé de la table de coupe.
 */
import type { CSSProperties } from "react";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import type { Image } from "@/lib/commerce/types";
import { identity } from "@/content/brand/identity";
import { Feston, Monogramme } from "./Traits";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

const T = commun.pied;

/** Contour d'une chute de dentelle, découpée motif par motif (polygone en %). */
function contourChute(): string {
  const pts: string[] = [];
  const n = 72;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const r = 0.84 + 0.07 * Math.sin(5 * t + 0.6) + 0.05 * Math.sin(11 * t + 1.9) + 0.03 * Math.sin(23 * t);
    const x = 50 + 50 * r * Math.cos(t) * 0.98;
    const y = 50 + 50 * r * Math.sin(t) * 0.94;
    pts.push(`${Math.round(x * 10) / 10}% ${Math.round(y * 10) / 10}%`);
  }
  return `polygon(${pts.join(", ")})`;
}
const CHUTE = contourChute();

export function AtelierFooter({ chute }: { chute?: Image }) {
  return (
    <Section as="footer" theme="paper" className={styles.footer}>
      <Feston />
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.footerBrand}>
          <p className={`t-label ${styles.footerSign}`}>{T.nom}</p>
          <p className={`t-note t-left ${styles.footerLine}`}>{T.devise}</p>
          <a href={identity.social.instagram} target="_blank" rel="noopener noreferrer" className="link link--quiet">
            {identity.social.instagramHandle}
          </a>
        </div>
        <nav aria-label={T.liens} className={styles.footerNav}>
          {T.colonnes.map((c) => (
            <div key={c.titre} className={styles.footerCol}>
              <p className="t-label t-soft">{c.titre}</p>
              <ul>
                {c.liens.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={styles.footerLink}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={styles.legende}>
          <p className="t-label t-soft">{T.legendeTitre}</p>
          <dl>
            {T.signes.map((l) => (
              <div key={l.signe} className={styles.legendeRow}>
                <dt>
                  <span className={styles.signe} data-signe={l.signe} aria-hidden="true" />
                  <span className="t-label">{l.titre}</span>
                </dt>
                <dd className="t-note">{l.texte}</dd>
              </div>
            ))}
          </dl>
        </div>
        <DisplayPrefs id="da-atelier-affichage" withMotion className={styles.prefs} />
        {chute ? (
          <figure className={styles.chute}>
            <span className={styles.chuteCut} style={{ clipPath: CHUTE } as CSSProperties} data-curseur>
              <Media image={chute} ratio="auto" sizes="10rem" imgClassName={styles.chuteImg} alt={T.chute.alt} />
            </span>
            <figcaption className={`t-note ${styles.chuteNote}`}>{T.chute.texte}</figcaption>
          </figure>
        ) : null}
        <Monogramme className={styles.filigrane} />
      </div>
    </Section>
  );
}
