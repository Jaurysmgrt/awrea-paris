import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { getProducts } from "@/lib/commerce";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import ed from "@/components/home/editorial.module.css";
import styles from "./sur-commande.module.css";
import { Frise, SequencePhotos } from "./Frise";
import { Delais } from "./Delais";
import { Espaces } from "./Espaces";

/**
 * Les étapes de confection (« Savoir-faire » dans le menu ; briefs de la créatrice du 02/11 et du
 * 09/11, cahier du 23/11 « Made to Order ») : le titre et le chapeau ; puis, sous l'ancre #etapes
 * (lien « Voir comment votre pièce est faite » des fiches), « Le parcours d'une création
 * singulière » : une introduction, les cinq étapes numérotées avec leur icône (Frise.tsx : la
 * sélection, la préparation, la confection, les finitions, l'expédition, textes officiels mot pour
 * mot) et leurs photographies en séquence ; « Le temps de la création », trois temps bien séparés
 * (confection, préparation et expédition, livraison : Delais.tsx) ; puis l'engagement, le suivi et le
 * conseil en une seule composition (Espaces.tsx). Les sections suivent le mode Jour ou Nuit du
 * téléphone, comme tout le site. Cohérente avec les conditions générales de vente. Textes :
 * content/site/<langue>/sur-commande.json.
 */
type SurCommande = typeof import("@/content/site/fr/sur-commande.json");

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
      <Section id="etapes" theme="ivory" className={`section section--flush-top ${styles.ancre}`} labelledBy="commande-etapes">
        <div className="container">
          <header className={`${ed.tete} ${ed.centre}`}>
            <p className="eyebrow">{t.etapes.surtitre}</p>
            <h2 id="commande-etapes" className="t-h2">
              {t.etapes.titre}
            </h2>
            <p className="t-body t-center">{t.parcours.intro}</p>
          </header>
          <Frise etapes={t.etapes.frise} officiel={t.etapes.officiel} />
          <SequencePhotos etapes={t.etapes.frise} label={t.parcours.photos} />
        </div>
      </Section>

      {/* ------------------------------------------------ LE TEMPS DE LA CRÉATION (confection, expédition, livraison) */}
      <Section id="delais" theme="pearl" className={`section--tall ${styles.ancre}`} labelledBy="commande-delais">
        <div className={`container-prose ${ed.centre}`}>
          <div className={ed.tete}>
            <h2 id="commande-delais" className="t-h2">
              {t.delais.titre}
            </h2>
            <p className="t-body t-center">{t.delais.texte}</p>
          </div>
          <div className={ed.apresTete}>
            <Delais t={t.delais} catalogue={catalogue} pieces={pieces} />
          </div>
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
