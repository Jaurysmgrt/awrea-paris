import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { getCurrentCollection, getProducts, getProductsByHandles } from "@/lib/commerce";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import { pageMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/ui/Section";
import { SplitTitle } from "@/components/ui/SplitTitle";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { LightHalo } from "@/components/signature/LightHalo";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Visuel } from "@/components/home/Visuel";
import { Parallaxe } from "@/components/home/Parallaxe";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import { delaiDeFamille } from "@/components/home/delais";
import ed from "@/components/home/editorial.module.css";
import styles from "./accueil.module.css";

/**
 * Accueil : une ouverture (le titre et deux pièces en grand, sous le logo), la présentation de la
 * Maison (texte officiel TEASING MARQUE), la collection Hypnotic Lace (texte officiel TEXTE DE
 * COLLECTION), une sélection de pièces, la création sur demande et la lettre de la Maison. Un
 * message et un appel à l'action par section ; les textes officiels de la créatrice sont marqués
 * data-officiel (seule la typographie y est contrôlée).
 * Textes : content/site/fr/accueil.json (éditeur visuel « Édition »).
 */
type Accueil = typeof import("@/content/site/fr/accueil.json");

export const revalidate = 300;

/** Rang d'un bloc dans l'apparition de sa section (décalage de --dur-stagger, accueil.module.css). */
const rang = (i: number) => ({ "--i": i }) as React.CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Accueil>("accueil", { plain: true });
  // visuel provisoire jamais envoyé aux réseaux (mention « visuel provisoire » absente des aperçus)
  const premiere = t.ouverture.photos[0]?.image;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/", image: !premiere || premiere.provisoire ? undefined : premiere.src });
}

export default async function HomePage() {
  const [t, catalogue, collection, pieces] = await Promise.all([getDoc<Accueil>("accueil"), getDoc<CatalogueTexts>("catalogue"), getCurrentCollection(), getProducts()]);
  // la sélection choisie dans l'éditeur ; à défaut, les premières pièces de la collection en cours
  const choisies = (await getProductsByHandles(t.selection.pieces)).filter((p) => p.variants.length > 0);
  const selection = choisies.length ? choisies : pieces.filter((p) => !collection || p.collection === collection.handle).slice(0, 3);
  const delais = { hauts: delaiText(catalogue, delaiDeFamille(pieces, "hauts")), robes: delaiText(catalogue, delaiDeFamille(pieces, "robes")) };
  const { ouverture, maison, collection: col, surDemande, lettre } = t;

  return (
    <>
      {/* ------------------------------------------------ OUVERTURE : le titre et deux pièces en grand,
          dès l'arrivée, juste sous le logo (retour du 01/11 : « voir le logo, que ça donne envie ») */}
      <Section theme="ivory" className={`${styles.ouverture} ${styles.anime}`} labelledBy="accueil-titre">
        <div className={`container ${styles.scene}`}>
          <header className={styles.tete} data-officiel>
            <SplitTitle id="accueil-titre" text={maison.texte.titre} className={`t-display ${styles.titre}`} />
            <p className={`t-lead ${styles.accroche}`}>{maison.texte.accroche}</p>
          </header>
          <ul className={styles.photos}>
            {ouverture.photos.map((p, i) => (
              <li key={p.id} className={styles.photo}>
                <Media image={p.image} ratio="portrait" priority={i === 0} sizes="(min-width: 64rem) 28vw, (min-width: 48rem) 46vw, 100vw" />
                <p className={styles.legende}>
                  <Link href={p.href} className={`link link--quiet ${styles.lien}`}>
                    {p.piece}
                  </Link>
                  <ProvisionalNote image={p.image} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ------------------------------------------------ LA MAISON (TEASING MARQUE, officiel) : le
          texte seul, centré, comme sur la maquette, après les photos de l'ouverture */}
      <Section theme="ivory" className={`section ${styles.maison} ${styles.anime}`}>
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.texte} data-officiel data-reveal>
            <p className="t-body">{maison.texte.paragraphe}</p>
          </div>
          <div className={ed.chute} data-officiel data-reveal style={rang(1)}>
            {maison.texte.chute.map((ligne) => (
              <p key={ligne} className="t-lead t-center">
                {ligne}
              </p>
            ))}
          </div>
          <div className={ed.action} data-reveal style={rang(2)}>
            <Link href={maison.cta.href} className="btn">
              {maison.cta.label}
            </Link>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LA COLLECTION (TEXTE DE COLLECTION, officiel) */}
      <Section theme="ink" className={`section--tall ${styles.anime}`} labelledBy="accueil-collection">
        <LightHalo intensity={0.8} />
        <div className={`container ${ed.split} ${ed.flip}`}>
          <Visuel image={col.image} sizes="(min-width: 48rem) 45vw, 100vw" className={`reveal-img ${styles.masque} ${styles.parallaxe}`} />
          <div className={ed.texte}>
            <div className={ed.tete}>
              <div className={ed.tete} data-officiel>
                <h2 id="accueil-collection" className="t-display" data-reveal="titre">
                  {col.texte.titre}
                </h2>
                <p className="t-lead t-left" data-reveal style={rang(1)}>
                  {col.texte.accroche}
                </p>
              </div>
            </div>
            <div className={ed.texte} data-officiel data-reveal style={rang(2)}>
              {col.texte.paragraphes.map((p) => (
                <p key={p} className="t-body">
                  {p}
                </p>
              ))}
            </div>
            <div className={ed.action} data-reveal style={rang(3)}>
              <Link href={col.cta.href} className="btn">
                {col.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ SÉLECTION DE PIÈCES */}
      {selection.length ? (
        <Section theme="ivory" className={`section--tall ${styles.anime}`} labelledBy="accueil-pieces">
          <div className="container">
            <header className={`${ed.tete} ${ed.centre}`}>
              <h2 id="accueil-pieces" className="t-h2" data-reveal="titre">
                {t.selection.titre}
              </h2>
            </header>
            <ul className={`${styles.pieces} ${ed.apresTete}`}>
              {selection.map((p, i) => (
                <li key={p.handle} data-reveal style={rang(i + 1)}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 30vw, (min-width: 30rem) 45vw, 100vw" />
                </li>
              ))}
            </ul>
            <div className={`${ed.action} ${ed.centre}`} data-reveal style={rang(1)}>
              <Link href={t.selection.cta.href} className="btn">
                {t.selection.cta.label}
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------ CRÉATION SUR DEMANDE */}
      <Section theme="pearl" className={`section--tall ${styles.anime}`} labelledBy="accueil-sur-demande">
        <div className={`container ${ed.split}`}>
          <Visuel image={surDemande.image} ratio="look" sizes="(min-width: 48rem) 45vw, 100vw" className={`reveal-img ${styles.masque} ${styles.parallaxe}`} />
          <div className={ed.texte}>
            <div className={ed.tete}>
              <h2 id="accueil-sur-demande" className="t-h2" data-reveal="titre">
                {surDemande.titre}
              </h2>
            </div>
            <p className="t-body" data-reveal style={rang(1)}>
              {fill(surDemande.texte, delais)}
            </p>
            <div className={ed.action} data-reveal style={rang(2)}>
              <Link href={surDemande.cta.href} className="btn">
                {surDemande.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LA LETTRE DE LA MAISON */}
      <Section theme="paper" className={`section--tall ${styles.anime}`} labelledBy="accueil-lettre">
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <h2 id="accueil-lettre" className="t-h2" data-reveal="titre">
              {lettre.titre}
            </h2>
            <p className="t-body t-center" data-reveal style={rang(1)}>
              {lettre.texte}
            </p>
          </div>
          <div className={ed.formulaire} data-reveal style={rang(2)}>
            <NewsletterForm source="home" />
          </div>
        </div>
      </Section>
      <Parallaxe selecteur={`.${styles.parallaxe}`} />
    </>
  );
}
