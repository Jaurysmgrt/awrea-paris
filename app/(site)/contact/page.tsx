import { contact } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ContactForm } from "@/components/ui/ContactForm";
import { GoldenLight } from "@/components/signature/GoldenLight";

export const metadata = pageMetadata({ ...contact.seo, path: "/contact" });

export default function ContactPage() {
  return (
    <>
      <PageHeader title={contact.h1} lead={contact.lead} crumbs={[{ name: "Contact", path: "/contact" }]} />
      <Section theme="ivory" className="section section--flush-top" labelledBy="write-title">
        <div className="container grid-12 contact">
          <div className="contact__form stack-m">
            <h2 id="write-title" className="t-h2">
              Écrire à l’atelier
            </h2>
            <ContactForm kind="contact" />
          </div>
          <aside className="contact__aside stack-m" aria-label="Coordonnées">
            <div className="stack">
              <h2 className="t-label">E-mail</h2>
              <p>
                <a href={`mailto:${identity.email}`} className="link">
                  {identity.email}
                </a>
              </p>
            </div>
            <div className="stack">
              <h2 className="t-label">Instagram</h2>
              <p>
                <a href={identity.social.instagram} className="link" target="_blank" rel="noopener noreferrer">
                  {identity.social.instagramHandle}
                </a>
              </p>
            </div>
            <div className="stack">
              <h2 className="t-label">L’atelier</h2>
              <p className="t-body">
                {identity.address.streetAddress}
                <br />
                {identity.address.postalCode} {identity.address.addressLocality}
              </p>
            </div>
          </aside>
        </div>
      </Section>
      <Section theme="ink" className="section--tall" id="rendez-vous" labelledBy="rdv-title">
        <GoldenLight intensity={0.6} />
        <div className="container-prose stack-m">
          <p className="eyebrow">Sur rendez-vous</p>
          <h2 id="rdv-title" className="t-h2">
            Essayage, sur mesure, retouche
          </h2>
          <p className="t-body">
            L’atelier vous reçoit à Paris pour essayer les pièces disponibles, ajuster une taille ou imaginer une pièce à vos mesures. Indiquez-nous vos préférences : la
            créatrice vous propose un créneau par e-mail.
          </p>
          <ContactForm kind="rendez-vous" />
        </div>
      </Section>
    </>
  );
}
