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
import { delaiDeFamille } from "@/components/home/delais";
import ed from "@/components/home/editorial.module.css";
import styles from "./accueil.module.css";

/**
 * Accueil : la présentation de la Maison (texte officiel TEASING MARQUE), la collection Hypnotic
 * Lace (texte officiel TEXTE DE COLLECTION), une sélection de pièces, la création sur demande et
 * la lettre de la Maison. Un message et un appel à l'action par section ; les textes officiels de
 * la créatrice sont marqués data-officiel (seule la typographie y est contrôlée).
 * Textes : content/site/fr/accueil.json (éditeur visuel « Édition »).
 */
type Accueil = typeof import("@/content/site/fr/accueil.json");

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Accueil>("accueil", "fr", { plain: true });
  // visuel provisoire jamais envoyé aux réseaux (mention « visuel provisoire » absente des aperçus)
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/", image: t.maison.image.provisoire ? undefined : t.maison.image.src });
}

export default async function HomePage() {
  const [t, catalogue, collection, pieces] = await Promise.all([getDoc<Accueil>("accueil"), getDoc<CatalogueTexts>("catalogue"), getCurrentCollection(), getProducts()]);
  // la sélection choisie dans l'éditeur ; à défaut, les premières pièces de la collection en cours
  const choisies = (await getProductsByHandles(t.selection.pieces)).filter((p) => p.variants.length > 0);
  const selection = choisies.length ? choisies : pieces.filter((p) => !collection || p.collection === collection.handle).slice(0, 3);
  const delais = { hauts: delaiText(catalogue, delaiDeFamille(pieces, "hauts")), robes: delaiText(catalogue, delaiDeFamille(pieces, "robes")) };
  const { maison, collection: col, surDemande, lettre } = t;

  return (
    <>
      {/* ------------------------------------------------ LA MAISON (TEASING MARQUE, officiel) */}
      <Section theme="ivory" className={`section ${styles.ouverture}`} labelledBy="accueil-titre">
        <div className="container">
          <header className={`${ed.tete} ${ed.centre}`} data-officiel>
            <SplitTitle id="accueil-titre" text={maison.texte.titre} className={`t-display ${styles.titre}`} />
            <p className="t-lead t-center">{maison.texte.accroche}</p>
          </header>
          <div className={`${ed.split} ${ed.apresTete}`}>
            <Visuel image={maison.image} priority sizes="(min-width: 48rem) 45vw, 100vw" />
            <div className={ed.texte} data-officiel>
              <p className="t-body">{maison.texte.paragraphe}</p>
            </div>
          </div>
          <div className={`${ed.chute} ${ed.centre}`} data-officiel>
            {maison.texte.chute.map((ligne) => (
              <p key={ligne} className="t-lead t-center">
                {ligne}
              </p>
            ))}
          </div>
          <div className={`${ed.action} ${ed.centre}`}>
            <Link href={maison.cta.href} className="btn">
              {maison.cta.label}
            </Link>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LA COLLECTION (TEXTE DE COLLECTION, officiel) */}
      <Section theme="ink" className="section--tall" labelledBy="accueil-collection">
        <LightHalo intensity={0.8} />
        <div className={`container ${ed.split} ${ed.flip}`}>
          <Visuel image={col.image} sizes="(min-width: 48rem) 45vw, 100vw" />
          <div className={ed.texte}>
            <div className={ed.tete}>
              <p className="eyebrow">{col.surtitre}</p>
              <div className={ed.tete} data-officiel>
                <h2 id="accueil-collection" className="t-display">
                  {col.texte.titre}
                </h2>
                <p className="t-lead t-left">{col.texte.accroche}</p>
              </div>
            </div>
            <div className={ed.texte} data-officiel>
              {col.texte.paragraphes.map((p) => (
                <p key={p} className="t-body">
                  {p}
                </p>
              ))}
            </div>
            <div className={ed.action}>
              <Link href={col.cta.href} className="btn">
                {col.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ SÉLECTION DE PIÈCES */}
      {selection.length ? (
        <Section theme="ivory" className="section--tall" labelledBy="accueil-pieces">
          <div className="container">
            <header className={`${ed.tete} ${ed.centre}`}>
              <p className="eyebrow">{t.selection.surtitre}</p>
              <h2 id="accueil-pieces" className="t-h2">
                {t.selection.titre}
              </h2>
            </header>
            <ul className={`${styles.pieces} ${ed.apresTete}`}>
              {selection.map((p) => (
                <li key={p.handle}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 30vw, (min-width: 30rem) 45vw, 100vw" />
                </li>
              ))}
            </ul>
            <div className={`${ed.action} ${ed.centre}`}>
              <Link href={t.selection.cta.href} className="btn">
                {t.selection.cta.label}
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------ CRÉATION SUR DEMANDE */}
      <Section theme="pearl" className="section--tall" labelledBy="accueil-sur-demande">
        <div className={`container ${ed.split}`}>
          <Visuel image={surDemande.image} ratio="look" sizes="(min-width: 48rem) 45vw, 100vw" />
          <div className={ed.texte}>
            <div className={ed.tete}>
              <p className="eyebrow">{surDemande.surtitre}</p>
              <h2 id="accueil-sur-demande" className="t-h2">
                {surDemande.titre}
              </h2>
            </div>
            <p className="t-body">{fill(surDemande.texte, delais)}</p>
            <div className={ed.action}>
              <Link href={surDemande.cta.href} className="btn">
                {surDemande.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LA LETTRE DE LA MAISON */}
      <Section theme="paper" className="section--tall" labelledBy="accueil-lettre">
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{lettre.surtitre}</p>
            <h2 id="accueil-lettre" className="t-h2">
              {lettre.titre}
            </h2>
            <p className="t-body t-center">{lettre.texte}</p>
          </div>
          <div className={ed.formulaire}>
            <NewsletterForm source="home" />
          </div>
        </div>
      </Section>
    </>
  );
}
