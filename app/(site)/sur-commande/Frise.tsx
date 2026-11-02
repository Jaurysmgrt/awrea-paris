import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { FriseApparition } from "./FriseApparition";
import s from "./frise.module.css";

/**
 * Les étapes de confection en frise (brief de la créatrice du 02/11, capture de référence n° 1) :
 * une ligne fine traverse la page, six étapes s'y accrochent par un petit cercle et un trait,
 * alternativement au-dessus et au-dessous, chacune avec sa photographie en noir et blanc. Sur
 * tablette et téléphone, la frise devient une chronologie verticale, la ligne sur le côté.
 * Apparitions douces au défilement, sur cette page seulement (FriseApparition) ; rien ne bouge en
 * animations apaisées. Textes : content/site/fr/sur-commande.json (etapes.frise). Les textes des étapes
 * sont ceux de la créatrice, mot pour mot : marqués data-officiel, seule la typographie y est contrôlée.
 */
export interface EtapeFrise {
  numero: string;
  nom: string;
  titre: string;
  texte: string;
  image: Image;
}

export function Frise({ etapes, officiel, id = "frise-etapes", className }: { etapes: EtapeFrise[]; officiel?: boolean; id?: string; className?: string }) {
  return (
    <>
      <ol id={id} className={`${s.frise} ${className ?? ""}`}>
        {etapes.map((e, i) => (
          <li key={e.numero} className={s.etape} data-cote={i % 2 ? "bas" : "haut"}>
            <div className={s.texte} data-officiel={officiel ? "" : undefined}>
              <p className={`t-label ${s.numero}`}>
                <span aria-hidden="true">{e.numero}</span> {e.nom}
              </p>
              <h3 className="t-h4">{e.titre}</h3>
              <p className="t-note t-left">{e.texte}</p>
            </div>
            <div className={s.photo}>
              <Media image={e.image} ratio="landscape" sizes="(min-width: 64rem) 26vw, 100vw" provisoire={e.image.provisoire} />
            </div>
          </li>
        ))}
      </ol>
      <FriseApparition id={id} />
    </>
  );
}
