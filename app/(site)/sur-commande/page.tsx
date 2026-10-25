import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { getProducts } from "@/lib/commerce";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import type { OrderStage } from "@/lib/commerce/types";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { LightHalo } from "@/components/signature/LightHalo";
import { delaiDeFamille, type FamilleDelai } from "@/components/home/delais";
import ed from "@/components/home/editorial.module.css";
import styles from "./sur-commande.module.css";

/**
 * La commande sur demande : les étapes d'une commande (le choix, puis les cinq étapes de la frise :
 * « Commande reçue », « En confection », « Prête », « Expédiée », « Livrée »), les délais de
 * fabrication lus dans le catalogue, le suivi, le rendez-vous et l'éthique de production.
 * Cohérente avec les conditions générales de vente officielles (paiement en une fois à la
 * commande, confirmation par e-mail, suivi sur le site). Textes : content/site/fr/sur-commande.json.
 */
type SurCommande = typeof import("@/content/site/fr/sur-commande.json");

const FAMILLES: FamilleDelai[] = ["hauts", "robes"];
/** Les cinq étapes de la frise d'une commande, dans l'ordre (OrderStage, lib/commerce/types.ts). */
const ETAPES: readonly OrderStage[] = ["paid", "in_production", "ready", "shipped", "delivered"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<SurCommande>("sur-commande", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/sur-commande" });
}

export default async function SurCommandePage() {
  const [t, catalogue, pieces] = await Promise.all([getDoc<SurCommande>("sur-commande"), getDoc<CatalogueTexts>("catalogue"), getProducts()]);
  const etapes = [t.etapes.choix, ...ETAPES.map((stage) => t.etapes.statuts[stage])];

  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/sur-commande" }]} />

      {/* ------------------------------------------------ LES ÉTAPES */}
      <Section theme="ivory" className="section section--flush-top" labelledBy="commande-etapes">
        <div className="container">
          <header className={`${ed.tete} ${ed.centre}`}>
            <p className="eyebrow">{t.etapes.surtitre}</p>
            <h2 id="commande-etapes" className="t-h2">
              {t.etapes.titre}
            </h2>
          </header>
          <ol className={`${styles.etapes} ${ed.apresTete}`}>
            {etapes.map((e) => (
              <li key={e.titre} className={styles.etape}>
                <h3 className="t-h4">{e.titre}</h3>
                <p className="t-body">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ------------------------------------------------ LES DÉLAIS (lus dans le catalogue) */}
      <Section theme="pearl" className="section--tall" labelledBy="commande-delais">
        <div className={`container-prose ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.delais.surtitre}</p>
            <h2 id="commande-delais" className="t-h2">
              {t.delais.titre}
            </h2>
            <p className="t-body">{t.delais.texte}</p>
          </div>
          <dl className={`${styles.delais} ${ed.apresTete}`}>
            {FAMILLES.map((f) => (
              <div key={f} className={styles.delai}>
                <dt className="t-label">{t.delais.groupes[f]}</dt>
                <dd className="t-h3">{fill(t.delais.valeur, { delai: delaiText(catalogue, delaiDeFamille(pieces, f)) })}</dd>
              </div>
            ))}
          </dl>
          <p className={`t-note t-center ${ed.apresTete}`}>{t.delais.note}</p>
          <div className={ed.action}>
            <Link href={t.delais.cta.href} className="btn">
              {t.delais.cta.label}
            </Link>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LE SUIVI */}
      <Section theme="ivory" className="section--tall" labelledBy="commande-suivi">
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.suivi.surtitre}</p>
            <h2 id="commande-suivi" className="t-h2">
              {t.suivi.titre}
            </h2>
            <p className="t-body">{t.suivi.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.suivi.cta.href} className="btn">
              {t.suivi.cta.label}
            </Link>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ LE RENDEZ-VOUS */}
      <Section theme="pearl" className="section--tall" labelledBy="commande-rendez-vous">
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.rendezVous.surtitre}</p>
            <h2 id="commande-rendez-vous" className="t-h2">
              {t.rendezVous.titre}
            </h2>
            <p className="t-body">{t.rendezVous.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.rendezVous.cta.href} className="btn">
              {t.rendezVous.cta.label}
            </Link>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ L'ÉTHIQUE */}
      <Section theme="ink" className="section--tall" labelledBy="commande-ethique">
        <LightHalo intensity={0.7} />
        <div className={`container-text ${ed.centre}`}>
          <div className={ed.tete}>
            <p className="eyebrow">{t.ethique.surtitre}</p>
            <h2 id="commande-ethique" className="t-h2">
              {t.ethique.titre}
            </h2>
          </div>
          <div className={`${ed.texte} ${ed.apresTete}`}>
            <blockquote className={ed.citation} data-officiel>
              <p className="t-lead">{t.ethique.citation.texte}</p>
            </blockquote>
            <p className="t-body">{t.ethique.texte}</p>
          </div>
          <div className={ed.action}>
            <Link href={t.ethique.cta.href} className="btn">
              {t.ethique.cta.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
