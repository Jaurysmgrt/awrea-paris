import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { getProducts } from "@/lib/commerce";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { delaiDeFamille, type FamilleDelai } from "@/components/home/delais";
import ed from "@/components/home/editorial.module.css";
import styles from "./sur-commande.module.css";
import { Frise } from "./Frise";
import { Espaces } from "./Espaces";

/**
 * Les étapes de confection (« Savoir-faire » dans le menu ; briefs de la créatrice du 02/11 et du
 * 09/11) : le titre et le chapeau ; « Le parcours d'une création singulière » en chronologie
 * verticale (Frise.tsx : la sélection, la préparation, la confection, les finitions, l'expédition) ;
 * « Le temps de la création », les délais de confection lus dans le catalogue, tout centré ; puis
 * l'engagement, le suivi et le conseil en une seule composition (Espaces.tsx). Les sections suivent le
 * mode Jour ou Nuit du téléphone, comme tout le site. Cohérente avec les conditions générales de
 * vente officielles. Textes : content/site/fr/sur-commande.json (validés par la créatrice).
 */
type SurCommande = typeof import("@/content/site/fr/sur-commande.json");

const FAMILLES: FamilleDelai[] = ["hauts", "robes"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<SurCommande>("sur-commande", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/sur-commande" });
}

export default async function SurCommandePage() {
  const [t, catalogue, pieces] = await Promise.all([getDoc<SurCommande>("sur-commande"), getDoc<CatalogueTexts>("catalogue"), getProducts()]);

  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} leadCentre crumbs={[{ name: t.nom, path: "/sur-commande" }]} />

      {/* ------------------------------------------------ LES ÉTAPES DE CONFECTION, EN FRISE */}
      <Section theme="ivory" className="section section--flush-top" labelledBy="commande-etapes">
        <div className="container">
          <header className={`${ed.tete} ${ed.centre}`}>
            <p className="eyebrow">{t.etapes.surtitre}</p>
            <h2 id="commande-etapes" className="t-h2">
              {t.etapes.titre}
            </h2>
          </header>
          <Frise etapes={t.etapes.frise} officiel={t.etapes.officiel} />
        </div>
      </Section>

      {/* ------------------------------------------------ LE TEMPS DE LA CRÉATION (délais lus dans le catalogue) */}
      <Section theme="pearl" className="section--tall" labelledBy="commande-delais">
        <div className={`container-prose ${ed.centre}`}>
          <div className={ed.tete}>
            <h2 id="commande-delais" className="t-h2">
              {t.delais.titre}
            </h2>
            <p className="t-body t-center">{t.delais.texte}</p>
          </div>
          <dl className={`${styles.delais} ${ed.apresTete}`}>
            {FAMILLES.map((f) => (
              <div key={f} className={styles.delai}>
                <dt className="t-label">{t.delais.groupes[f]}</dt>
                <dd className="t-h3">{fill(t.delais.valeur, { delai: delaiText(catalogue, delaiDeFamille(pieces, f)) })}</dd>
                <dd className={`t-label ${styles.mention}`}>{t.delais.mention}</dd>
              </div>
            ))}
          </dl>
          <p className={`t-note t-center ${ed.apresTete}`}>
            {t.delais.fin.avant}
            <Link href={t.delais.fin.lien.href} className="text-link">
              {t.delais.fin.lien.label}
            </Link>
            {t.delais.fin.apres}
          </p>
        </div>
      </Section>

      {/* ------------------------------------------------ L'ENGAGEMENT, LE SUIVI, LE CONSEIL */}
      <Section theme="ivory" className="section--tall" labelledBy="commande-espaces">
        <div className="container">
          <h2 id="commande-espaces" className="sr-only">
            {t.espaces.titre}
          </h2>
          <Espaces liste={t.espaces.liste} titre={t.espaces.titre} navigation={t.espaces.navigation} officiel={t.espaces.officiel} />
        </div>
      </Section>
    </>
  );
}
