import type { CSSProperties } from "react";
import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { Icon, isIconName } from "@/components/ui/Icon";
import { FriseApparition } from "./FriseApparition";
import s from "./frise.module.css";

/**
 * Les cinq étapes de confection, à comprendre en quelques secondes (cahier de la créatrice du
 * 23/11) : numérotées de 01 à 05, chacune avec sa petite icône au trait, son nom, sa phrase et son
 * texte, mot pour mot (textes officiels, data-officiel). Sur ordinateur, les cinq étapes côte à
 * côte, reliées par une ligne fine qui va d'une icône à l'autre ; sur tablette et téléphone, les
 * étapes l'une sous l'autre, la ligne descend le long des numéros. Les photographies des étapes ne
 * sont plus dans la frise : elles la suivent en une séquence en noir et blanc (SequencePhotos).
 * Apparition douce au défilement, sur cette page seulement (FriseApparition) ; rien ne bouge en
 * animations apaisées. Textes : content/site/<langue>/sur-commande.json (etapes.frise).
 */
export interface EtapeFrise {
  numero: string;
  icon?: string;
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
            {/* le repère : le numéro, l'icône et la ligne qui mène à l'étape suivante ; l'ordre est
                déjà dit par la liste numérotée */}
            <div className={s.repere} aria-hidden="true">
              <span className={s.numero}>{e.numero}</span>
              {isIconName(e.icon) ? <Icon name={e.icon} className={`icone icone--l ${s.icone}`} /> : <span className={s.icone} />}
              <span className={s.trait} />
            </div>
            <div className={s.texte} data-officiel={officiel ? "" : undefined}>
              <p className={`t-label ${s.nom}`}>{e.nom}</p>
              <h3 className="t-h4">{e.titre}</h3>
              <p className="t-note t-left">{e.texte}</p>
            </div>
          </li>
        ))}
      </ol>
      <FriseApparition id={id} />
    </>
  );
}

/**
 * Les photographies des cinq étapes, à la suite de la frise : une séquence en noir et blanc, à leurs
 * proportions, toutes à la même hauteur, chacune sous le numéro de son étape. Sur grand écran, une
 * seule rangée qui occupe la largeur ; plus petit, la rangée défile au doigt (ou au clavier, une fois
 * la séquence atteinte par la touche Tab), la photo suivante dépassant au bord pour l'annoncer.
 */
export function SequencePhotos({ etapes, label }: { etapes: EtapeFrise[]; label: string }) {
  return (
    // une liste qui défile doit pouvoir recevoir le focus pour défiler au clavier (WCAG 2.1.1)
    <ul className={s.sequence} aria-label={label} tabIndex={0}>
      {etapes.map((e) => (
        <li key={e.numero} className={s.vue} style={{ "--ratio": e.image.width / e.image.height } as CSSProperties}>
          <span className={`t-label ${s.repereVue}`} aria-hidden="true">
            {e.numero}
          </span>
          <Media image={e.image} ratio="auto" className={s.photo} sizes="(min-width: 90rem) 25vw, (min-width: 48rem) 40vw, 60vw" provisoire={e.image.provisoire} />
        </li>
      ))}
    </ul>
  );
}
