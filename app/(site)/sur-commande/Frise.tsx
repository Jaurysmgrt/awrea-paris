import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { FriseApparition } from "./FriseApparition";
import s from "./frise.module.css";

/**
 * Les étapes de confection en chronologie verticale (brief de la créatrice du 09/11) : cinq étapes de
 * haut en bas, reliées par une ligne fine ; le numéro de chaque étape est posé sur la ligne, sans
 * cercle ni carte. Chaque étape : son nom en capitales espacées, sa phrase en italique, son texte, et
 * sa photographie en noir et blanc. La même chronologie sur ordinateur, tablette et téléphone ; sur
 * ordinateur, la photographie passe à droite du texte.
 * Apparition douce au défilement, sur cette page seulement (FriseApparition) : la ligne se révèle,
 * chaque étape vient en fondu ; rien ne bouge en animations apaisées. Textes :
 * content/site/fr/sur-commande.json (etapes.frise), ceux de la créatrice, mot pour mot (data-officiel).
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
        {etapes.map((e) => (
          <li key={e.numero} className={s.etape}>
            <span className={s.numero} aria-hidden="true">
              {e.numero}
            </span>
            <div className={s.contenu}>
              <div className={s.texte} data-officiel={officiel ? "" : undefined}>
                <p className={`t-label ${s.nom}`}>{e.nom}</p>
                <h3 className="t-h4">{e.titre}</h3>
                <p className="t-note t-left">{e.texte}</p>
              </div>
              <div className={s.photo}>
                <Media image={e.image} ratio="landscape" sizes="(min-width: 64rem) 40vw, 100vw" provisoire={e.image.provisoire} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <FriseApparition id={id} />
    </>
  );
}
