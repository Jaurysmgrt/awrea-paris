import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PriseDeRendezVous } from "@/components/appointments/PriseDeRendezVous";
import styles from "./rendez-vous.module.css";

/**
 * Prendre rendez-vous (dossier de la créatrice du 02/11) : une grande photographie pleine largeur
 * sous la navigation, puis une section noire centrée, le titre, le texte, un seul bouton
 * « Prendre rendez-vous » et sa petite phrase. La réservation s'ouvre derrière le bouton
 * (components/appointments/PriseDeRendezVous.tsx). La section reste noire en mode Nuit, avec son
 * bouton ivoire (data-nuit="noir", styles/tokens.css). Textes : content/site/fr/rendez-vous.json.
 */
type RendezVous = typeof import("@/content/site/fr/rendez-vous.json");
const TYPES = ["visio", "sur-mesure"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<RendezVous>("rendez-vous", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/rendez-vous" });
}

export default async function RendezVousPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const t = await getDoc<RendezVous>("rendez-vous");
  const { type } = await searchParams;
  const initial = TYPES.find((x) => x === type);
  const a = t.accroche;
  return (
    <Section theme="ink" className={styles.page} labelledBy="rdv-titre" data-nuit="noir">
      <figure className={styles.photo}>
        <Media image={a.image} ratio="auto" sizes="100vw" priority className={styles.media} />
      </figure>
      <div className={`container ${styles.texte}`}>
        <Breadcrumbs items={[{ name: t.titre, path: "/rendez-vous" }]} />
        <h1 id="rdv-titre" className="t-display">
          {a.titre}
        </h1>
        <p className="t-lead">{a.texte}</p>
        <PriseDeRendezVous t={t} bouton={a.bouton} note={a.note} initialType={initial} className={styles.suite} />
      </div>
    </Section>
  );
}
