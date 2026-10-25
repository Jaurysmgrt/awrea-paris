/**
 * Pied de page (maquette BAS DE PAGE) : la lettre de la Maison en version compacte, un filet fin
 * centré, quatre colonnes aux intitulés en capitales (La marque, Service client, Légal, Nous
 * suivre ; Instagram dans une pastille noire), « © Awrea Paris 2026 » centré dessous. Le mode
 * sombre et les animations apaisées suivent le réglage de l'appareil (lib/prefs.ts).
 * Liens : document « navigation » (partie « pied ») ; libellés : document « site » (partie « pied »).
 */
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { NewsletterBlock } from "@/components/ui/NewsletterForm";
import { CookiesButton, type NavigationDoc, type NavLink } from "./Menu";

type SiteTexts = typeof import("@/content/site/fr/site.json");

/** Glyphe d'Instagram, d'un trait, à la couleur du texte de la pastille. */
function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="site-footer__social-icon" aria-hidden="true" focusable="false">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export async function Footer() {
  const [nav, site] = await Promise.all([getDoc<NavigationDoc>("navigation"), getDoc<SiteTexts>("site")]);
  const t = site.pied;

  const lien = (l: NavLink) => {
    if (l.type === "cookies") return <CookiesButton label={l.label} className="link site-footer__link" />;
    if (!l.href) return null;
    if (l.type === "instagram") {
      return (
        <a href={l.href} className="site-footer__social" target="_blank" rel="noopener noreferrer me" aria-label={fill(t.lienExterne, { libelle: l.label })}>
          <InstagramGlyph />
        </a>
      );
    }
    if (/^https?:/.test(l.href)) {
      return (
        <a href={l.href} className="link site-footer__link" target="_blank" rel="noopener noreferrer" aria-label={fill(t.lienExterne, { libelle: l.label })}>
          {l.label}
        </a>
      );
    }
    return (
      <Link href={l.href} className="link site-footer__link">
        {l.label}
      </Link>
    );
  };

  return (
    <footer className="site-footer scene" data-theme="ivory">
      <div className="container site-footer__inner">
        <section className="site-footer__news" aria-labelledby="pied-lettre-titre">
          <NewsletterBlock source="footer" compact titleId="pied-lettre-titre" />
        </section>

        <hr className="rule rule--center site-footer__rule" />

        <nav className="site-footer__cols" aria-label={t.navigation}>
          {nav.pied.map((col, i) => (
            <div key={i} className="site-footer__col">
              <h2 className="t-label site-footer__title">{col.titre}</h2>
              <ul className="site-footer__links">
                {col.liens.map((l, j) => (
                  <li key={j}>{lien(l)}</li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="t-center site-footer__copy">{t.copyright}</p>

      </div>
    </footer>
  );
}
