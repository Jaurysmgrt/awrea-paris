/**
 * Laboratoire de design, direction « atelier » (DA 2) : la page d'accueil.
 * La page se lit comme une table de coupe, en quatre temps : la pièce épinglée (le trait),
 * le registre des éditions (la coupe), l'atelier (le point), le manifeste (le numéro).
 * Vraies photographies seulement ; les signes du patron sont des traits du design system.
 * Textes : _components/textes.ts (futurs documents de l'éditeur Édition).
 */
import type { CSSProperties } from "react";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { getCurrentCollection, getProduct, getProductsByHandles } from "@/lib/commerce";
import type { Product } from "@/lib/commerce/types";
import { identity } from "@/content/brand/identity";
import { AtelierHeader } from "./_components/AtelierHeader";
import { AtelierFooter } from "./_components/AtelierFooter";
import { Stitch } from "./_components/Stitch";
import { PatronPhoto } from "./_components/PatronPhoto";
import { EditionSerie } from "./_components/EditionSerie";
import { Registre } from "./_components/Registre";
import { HaloDesktop } from "./_components/HaloDesktop";
import { Cote, Feston, Monogramme } from "./_components/Traits";
import { MONOGRAM_CURSOR } from "./_components/cursor";
import { accueil as T } from "./_components/textes";
import { fr } from "./_components/typo";
import styles from "./da-atelier.module.css";

export const revalidate = 300;

const FICHE = "/lab/da-atelier/piece";
/** la fiche du laboratoire pour Odessa, la fiche du site pour les autres pièces */
const hrefOf = (p: Product) => (p.handle === "robe-odessa" ? FICHE : `/boutique/${p.handle}`);
/** pièces de test laissées par les essais automatiques : jamais montrées */
const real = (p: Product) => !/test/i.test(p.title);

export default async function AtelierAccueil() {
  const collection = await getCurrentCollection();
  const pieces = (await getProductsByHandles(collection?.products ?? [])).filter(real);
  const odessa = pieces.find((p) => p.handle === "robe-odessa") ?? (await getProduct("robe-odessa"));
  const exemplaires = pieces.reduce((n, p) => n + p.edition.total, 0);
  const heures = (odessa?.trace?.steps ?? []).map((s) => s.hours ?? 0);
  const total = heures.reduce((a, b) => a + b, 0);
  const [dessin = 0, coupe = 0, montage = 0] = heures;
  const lacage = odessa?.details.find((d) => /laçage/i.test(d));
  const traine = odessa?.details.find((d) => /traîne/i.test(d));
  const matiere = odessa?.materials[0]?.name.toLowerCase();

  return (
    <div className={styles.page} style={{ "--da-curseur": MONOGRAM_CURSOR } as CSSProperties}>
      <AtelierHeader contentId="ouvrage" />

      {/* I. LE TRAIT : la pièce épinglée sur la table */}
      <Section theme="paper" id="ouvrage" className={styles.ouverture} labelledBy="ouverture-titre">
        <div className={`container ${styles.grid}`}>
          <div className={styles.ouvertureTexte}>
            <h1 id="ouverture-titre" className={styles.h1}>
              <span className={`t-label ${styles.kicker}`}>{T.ouverture.kicker}</span>
              <span className={styles.h1Phrase}>
                <Stitch text={T.ouverture.titre} />
              </span>
            </h1>
            <p className={`t-body ${styles.ouvertureLead}`}>{T.ouverture.texte}</p>
            {odessa ? (
              <div className={styles.ouvertureCta}>
                <Link href={FICHE} className="btn btn--solid">
                  {T.ouverture.cta}
                </Link>
              </div>
            ) : null}
          </div>
          {odessa ? (
            <>
              <PatronPhoto
                className={styles.ouverturePiece}
                image={odessa.images[0]}
                priority
                sizes="(min-width: 64rem) 30vw, 100vw"
                vue="dos"
                droitFil
                reperes={lacage ? [{ lettre: "A", x: 56, y: 38, texte: fr(lacage) }] : []}
                cote={traine ? { from: 84, to: 97, texte: fr(traine) } : undefined}
                legende={fr(`${odessa.title}, ${T.ouverture.vue}, ${matiere}`)}
              />
              <div className={styles.ouvertureEdition}>
                <EditionSerie product={odessa} />
              </div>
            </>
          ) : null}
        </div>
      </Section>

      {/* II. LA COUPE : le registre des éditions */}
      {collection ? (
        <Section theme="ivory" className={styles.registreSection} labelledBy="registre-titre">
          <Feston />
          <div className={`container ${styles.grid} ${styles.registreHead}`}>
            <div className={styles.registreTitre}>
              <p className="eyebrow">{T.registre.eyebrow}</p>
              <h2 id="registre-titre" className={styles.h2Grand}>
                {collection.title}
              </h2>
            </div>
            <div className={styles.registreIntro}>
              <p className="t-body">{T.registre.texte}</p>
              <p className={`t-label t-soft ${styles.registreMeta}`}>{T.registre.compte(pieces.length, exemplaires)}</p>
            </div>
          </div>
          <div className="container">
            <Registre pieces={pieces} hrefOf={hrefOf} />
          </div>
          <div className={`container ${styles.grid}`}>
            <div className={`${styles.sectionCta} ${styles.registreCta}`}>
              <Link href={`/collections/${collection.handle}`} className="link">
                {T.registre.cta}
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* III. LE POINT : l'atelier, le temps de façon */}
      <Section theme="ink" className={styles.atelier} labelledBy="atelier-titre">
        <HaloDesktop intensity={0.8} />
        <div className={`container ${styles.grid}`}>
          <figure className={styles.atelierMedia}>
            <Media image={{ src: "/media/img/atelier-1", alt: T.atelier.alt, width: 1200, height: 800 }} ratio="landscape" sizes="(min-width: 64rem) 50vw, 100vw" />
            <figcaption className="t-label t-soft">{T.atelier.legende}</figcaption>
          </figure>
          <div className={styles.atelierTexte}>
            <p className="eyebrow">{T.atelier.eyebrow}</p>
            <h2 id="atelier-titre" className="t-h2">
              {T.atelier.titre}
            </h2>
            {total ? (
              <div className={styles.mesure}>
                <p className={`t-left ${styles.mesureGeante}`}>
                  <span aria-hidden="true">
                    {total}
                    <span className={styles.mesureUnite}>h</span>
                  </span>
                  <span className="sr-only">{T.atelier.heures(total)}</span>
                </p>
                <Cote className={styles.mesureCote}>{T.atelier.cote}</Cote>
              </div>
            ) : null}
            {total ? <p className="t-body">{T.atelier.texte(dessin, coupe, montage)}</p> : null}
            <div className={styles.sectionCta}>
              <Link href="/atelier" className="link">
                {T.atelier.cta}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* IV. LE NUMÉRO : le manifeste, signé */}
      <Section theme="paper" className={styles.manifeste} labelledBy="manifeste-titre">
        <Feston />
        <div className={`container ${styles.grid}`}>
          <div className={styles.manifesteTexte}>
            <p className="eyebrow">{T.manifeste.eyebrow}</p>
            <h2 id="manifeste-titre" className={styles.h2Grand}>
              {T.manifeste.titre}
            </h2>
            <div className={styles.manifesteCorps}>
              <p className="t-body">{T.manifeste.texte}</p>
            </div>
            <figure className={styles.citation}>
              <blockquote>
                <p className="t-left">{`«\u00a0${identity.founderQuote}\u00a0»`}</p>
              </blockquote>
              <figcaption className={styles.signature}>
                <Monogramme className={styles.signatureMark} />
                <span className="t-label">{identity.founderTitle}</span>
              </figcaption>
            </figure>
            <div className={styles.sectionCta}>
              <Link href="/la-maison" className="link">
                {T.manifeste.cta}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* LETTRES DE L'ATELIER */}
      <Section theme="pearl" className={styles.lettres} labelledBy="lettres-titre">
        <div className={`container ${styles.grid}`}>
          <div className={styles.lettresTexte}>
            <p className="eyebrow">{T.lettres.eyebrow}</p>
            <h2 id="lettres-titre" className="t-h2">
              {T.lettres.titre}
            </h2>
            <p className="t-body">{T.lettres.texte}</p>
            <NewsletterForm source="lab-da-atelier" />
          </div>
        </div>
      </Section>

      <AtelierFooter chute={odessa?.detailImage} />
    </div>
  );
}
