import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { LightHalo } from "@/components/signature/LightHalo";

export default function NotFound() {
  return (
    <Section theme="ink" className="not-found">
      <LightHalo />
      <div className="container-text t-center stack-m not-found__inner">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="t-giant ">Un fil s’est perdu</h1>
        <p className="t-lead t-center">La page que vous cherchez n’existe pas, ou plus. Les pièces, elles, vous attendent.</p>
        <div className="not-found__actions">
          <Link href="/boutique" className="btn btn--solid">
            La boutique
          </Link>
          <Link href="/" className="link link--quiet">
            L’accueil
          </Link>
        </div>
      </div>
    </Section>
  );
}
