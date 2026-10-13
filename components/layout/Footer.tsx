import Link from "@/components/ui/Link";
import { identity } from "@/content/brand/identity";
import { nav } from "@/content/fr/pages";
import { Logo } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { GoldenLight } from "@/components/signature/GoldenLight";
import { CookieSettingsButton } from "@/components/consent/ConsentProvider";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import { EcoFootprint } from "./EcoFootprint";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer scene" data-theme="ink">
      <GoldenLight intensity={0.7} />
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <Link href="/" className="site-footer__logo">
            <Logo decorative />
            <span className="sr-only">Awrea Paris — accueil</span>
          </Link>
          <p className="t-script site-footer__script">Consommer plus juste</p>
          <p className="t-note site-footer__desc">{identity.shortDescription}</p>
        </div>

        <div className="site-footer__news">
          <h2 className="t-label">Lettres de l’atelier</h2>
          <NewsletterForm source="footer" compact />
        </div>

        <nav className="site-footer__cols" aria-label="Pied de page">
          <div>
            <h2 className="t-label t-accent">La maison</h2>
            <ul>
              {nav.primary.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link link--quiet">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="t-label t-accent">Service</h2>
            <ul>
              {nav.secondary.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link link--quiet">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/compte" className="link link--quiet">
                  Mon compte
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="t-label t-accent">Informations</h2>
            <ul>
              {nav.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link link--quiet">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
          <div>
            <h2 className="t-label t-accent">Suivre</h2>
            <ul>
              <li>
                <a href={identity.social.instagram} className="link link--quiet" target="_blank" rel="noopener noreferrer me">
                  Instagram
                </a>
              </li>
              <li>
                <a href={`mailto:${identity.email}`} className="link link--quiet">
                  {identity.email}
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="site-footer__bottom">
          <p className="t-label">© {year} {identity.name}</p>
          <DisplayPrefs id="pied" withMotion />
          <p className="t-label">Fait main à Paris</p>
        </div>
        <EcoFootprint />
      </div>
    </footer>
  );
}
