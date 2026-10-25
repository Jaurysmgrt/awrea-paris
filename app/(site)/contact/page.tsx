import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ContactForm } from "@/components/ui/ContactForm";
import { Visuel } from "@/components/home/Visuel";
import styles from "./contact.module.css";

/**
 * Contact (maquette FORMULAIRE CONTACT) : grand titre « Contact », la photo des sacs de la Maison à
 * gauche, le formulaire à droite ; les coordonnées réelles de la Maison sous la photo. Sur
 * téléphone : la photo, le formulaire, puis les coordonnées. Textes : content/site/fr/contact.json.
 */
type Contact = typeof import("@/content/site/fr/contact.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Contact>("contact", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/contact", image: t.image.src });
}

export default async function ContactPage() {
  const t = await getDoc<Contact>("contact");
  const c = t.coordonnees;
  return (
    <>
      <PageHeader title={t.titre} align="left" crumbs={[{ name: t.titre, path: "/contact" }]} />
      <Section theme="ivory" className="section section--flush-top" labelledBy="contact-formulaire">
        <div className={`container ${styles.contact}`}>
          <Visuel image={t.image} ratio="landscape" priority className={styles.photo} sizes="(min-width: 64rem) 50vw, 100vw" />

          <div className={styles.formulaire}>
            <h2 id="contact-formulaire" className="sr-only">
              {t.formulaire.titre}
            </h2>
            <ContactForm t={t.formulaire} email={c.email} />
          </div>

          {/* ancre « #rendez-vous » des anciens liens (/contact#rendez-vous) : le lien vers la prise de rendez-vous est ici */}
          <aside id="rendez-vous" className={styles.coordonnees} aria-labelledby="contact-coordonnees">
            <h2 id="contact-coordonnees" className="t-h4">
              {c.titre}
            </h2>
            <dl className={styles.liste}>
              <div>
                <dt className="t-label">{c.emailLabel}</dt>
                <dd>
                  <a href={`mailto:${c.email}`} className="link">
                    {c.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="t-label">{c.telephoneLabel}</dt>
                <dd>
                  <a href={`tel:${c.telephoneLien}`} className="link">
                    {c.telephone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="t-label">{c.instagramLabel}</dt>
                <dd>
                  <a href={c.instagramLien} className="link" target="_blank" rel="noopener noreferrer">
                    {c.instagram}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="t-body">{c.rendezVous}</p>
            <Link href={c.rendezVousLien.href} className="btn btn--link">
              {c.rendezVousLien.label}
            </Link>
          </aside>
        </div>
      </Section>
    </>
  );
}
