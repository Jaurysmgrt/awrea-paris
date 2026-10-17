/**
 * L'ourlet : le pied de page comme le bord festonné d'une pièce de dentelle noire.
 * Le halo de lumière y révèle la dentelle cachée ; le médaillon AW en filigrane très léger.
 */
import Link from "@/components/ui/Link";
import { identity } from "@/content/brand/identity";
import { LightHalo } from "@/components/signature/LightHalo";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import { CookieSettingsButton } from "@/components/consent/ConsentProvider";
import { Medaillon } from "./Medaillon";
import { Fil } from "./Reseau";
import s from "../da-dentelle.module.css";

const COLONNES = [
  {
    titre: "La Maison",
    liens: [
      { href: "/boutique", label: "Les pièces" },
      { href: "/collections", label: "Collections" },
      { href: "/atelier", label: "L’atelier" },
      { href: "/journal", label: "Journal" },
    ],
  },
  {
    titre: "Service",
    liens: [
      { href: "/contact#rendez-vous", label: "Contact et rendez-vous" },
      { href: "/livraison-retours", label: "Livraison et retours" },
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/compte", label: "Mon compte" },
    ],
  },
  {
    titre: "Informations",
    liens: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/cgv", label: "Conditions de vente" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function Ourlet() {
  return (
    <footer className={s.ourlet} data-theme="ink">
      <LightHalo intensity={0.7} />
      <span className={s.ourletFond} aria-hidden="true">
        <Medaillon className={s.ourletFiligrane} />
      </span>
      <div className={`container ${s.grille} ${s.ourletGrille}`}>
        <p className={`${s.ourletDevise} ${s.sansJustif}`}>Consommer plus juste.</p>
        <nav aria-label="Pied de page" className={s.ourletLiens}>
          {COLONNES.map((c) => (
            <div key={c.titre}>
              <h2 className="t-label">{c.titre}</h2>
              <ul>
                {c.liens.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link link--quiet">
                      {l.label}
                    </Link>
                  </li>
                ))}
                {c.titre === "Informations" ? (
                  <li>
                    <CookieSettingsButton />
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="t-label">Suivre</h2>
            <ul>
              <li>
                <a href={identity.social.instagram} className="link link--quiet" target="_blank" rel="noopener noreferrer me">
                  {identity.social.instagramHandle}
                </a>
              </li>
            </ul>
          </div>
        </nav>
        <div className={s.ourletBas}>
          <Fil />
          <div className={s.ourletBasLigne}>
            <p className="t-label">© {new Date().getFullYear()} {identity.name}</p>
            <DisplayPrefs id="ourlet" withMotion />
            <p className="t-label">Fait main à Paris</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
