import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { Section } from "@/components/ui/Section";
import { LightHalo } from "@/components/signature/LightHalo";

type Introuvable = typeof import("@/content/site/fr/introuvable.json");

/** Page introuvable (adresse inconnue ou contenu retiré) : un seul message, la collection en cours. */
export default async function NotFound() {
  const t = await getDoc<Introuvable>("introuvable");
  return (
    <Section theme="ink" className="not-found">
      <LightHalo />
      <div className="container-text t-center stack-m not-found__inner">
        <p className="eyebrow">{t.surtitre}</p>
        <h1 className="t-giant">{t.titre}</h1>
        <p className="t-lead t-center">{t.texte}</p>
        <div className="not-found__actions">
          <Link href={t.collection.href} className="btn btn--solid">
            {t.collection.label}
          </Link>
          <Link href={t.accueil.href} className="link link--quiet">
            {t.accueil.label}
          </Link>
        </div>
      </div>
    </Section>
  );
}
