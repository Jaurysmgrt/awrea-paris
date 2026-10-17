/**
 * L'ours : en fin de revue, la page qui dit qui a fait le numéro. Ici, le pied de page. Le détail
 * inattendu de chaque page y est posé, pour la lectrice qui lit jusqu'au bout.
 */
import Link from "@/components/ui/Link";
import { Logo } from "@/components/brand/Logo";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import { identity } from "@/content/brand/identity";
import { FiletPicot } from "./Mise";
import { numero, ours } from "./textes";
import s from "../da-edition.module.css";

export function Ours({ detail, id }: { detail: string; id: string }) {
  return (
    <footer className={`${s.double} ${s.ours}`} data-theme="pearl" aria-label={ours.aria}>
      <div className={s.pleine}>
        <FiletPicot id={`picot-ours-${id}`} />
      </div>
      <div className={s.gauche}>
        <Logo className={s.oursLogo} title={identity.name} />
        <p className={`t-note ${s.apresTitre}`}>{ours.description}</p>
        <p className={`t-note ${s.oursDetail}`}>{detail}</p>
      </div>
      <div className={s.droite}>
        <h2 className={`t-label ${s.rubrique}`}>{ours.titre}</h2>
        <p className={`t-note ${s.apresTitre}`}>
          {numero.ligne.charAt(0).toUpperCase() + numero.ligne.slice(1)}. {ours.couture}
        </p>
        <ul className={s.oursLiens}>
          <li>
            <a href={identity.social.instagram} className="text-link" target="_blank" rel="noopener noreferrer">
              {ours.instagram} {identity.social.instagramHandle}
            </a>
          </li>
          {ours.liens.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-link">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={s.apresBloc}>
          <DisplayPrefs id={`affichage-${id}`} withMotion />
        </div>
      </div>
      <Logo variant="monogram" decorative className={s.filigrane} />
    </footer>
  );
}
