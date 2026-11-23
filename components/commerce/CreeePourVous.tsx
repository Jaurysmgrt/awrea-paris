import Link from "@/components/ui/Link";
import { Icon, isIconName } from "@/components/ui/Icon";
import s from "./CreeePourVous.module.css";

/**
 * « Créée pour vous » : la pièce faite sur demande, expliquée sur sa fiche, juste sous le bouton
 * d'ajout au panier (cahier de la créatrice du 23/11). Un titre court, une phrase, trois repères
 * (faite après votre commande, confectionnée avec soin, vérifiée avant son départ), chacun avec sa
 * petite icône au trait ; puis le délai de confection de la pièce, dit une seule fois sur la fiche
 * (`data-delai`) et jamais présenté comme le délai total ; enfin un lien discret vers les étapes de
 * la page Savoir-faire (/sur-commande#etapes). Compact : rien n'y est replié, rien n'y est ajouté.
 * Textes : documents « fiche-piece » (pourVous, surDemande.lien) et « catalogue » (surDemande.fiche).
 */
export interface TextesCreeePourVous {
  titre: string;
  texte: string;
  points: { icon: string; texte: string }[];
}

export function CreeePourVous({ t, delai, lien }: { t: TextesCreeePourVous; delai: string; lien: string }) {
  return (
    <div className={s.bloc}>
      <h2 className={`t-h4 ${s.titre}`}>{t.titre}</h2>
      <p className="t-note t-left">{t.texte}</p>
      <ul className={s.points}>
        {t.points.map((p) => (
          <li key={p.texte} className={s.point}>
            {isIconName(p.icon) ? <Icon name={p.icon} className="icone" /> : null}
            <span>{p.texte}</span>
          </li>
        ))}
      </ul>
      <p className={`t-note t-left ${s.delai}`} data-delai>
        <Icon name="horloge" className="icone" />
        <span>{delai}</span>
      </p>
      <p className={s.lien}>
        <Link href="/sur-commande#etapes" className="link">
          {lien}
        </Link>
      </p>
    </div>
  );
}
