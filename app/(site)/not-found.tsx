import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { GoldenLight } from "@/components/signature/GoldenLight";

export default function NotFound() {
  return (
    <Section theme="ink" className="not-found">
      <GoldenLight />
      <div className="container-text t-center stack-m not-found__inner">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="t-script t-script--xl">Un fil s’est perdu</h1>
        <p className="t-lead t-center">La page que vous cherchez n’existe pas, ou plus. Les pièces, elles, vous attendent.</p>
        <div className="not-found__actions">
          <Link href="/boutique" className="btn btn--gold">
            La boutique
          </Link>
          <Link href="/" className="btn">
            L’accueil
          </Link>
        </div>
      </div>
    </Section>
  );
}
