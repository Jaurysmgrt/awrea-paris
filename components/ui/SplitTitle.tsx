/**
 * Titre écrit au chargement : les lettres apparaissent l'une après l'autre. Ce sont de simples
 * <span> en ligne animés en opacité seule : le crénage du caractère est conservé.
 * Les lecteurs d'écran lisent le titre entier ; les lettres animées leur sont masquées.
 * Animation CSS seule (aucun JavaScript), neutralisée si les animations sont apaisées.
 */
import { Fragment } from "react";

type Props = {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  id?: string;
};

export function SplitTitle({ text, as: Tag = "h1", className = "", id }: Props) {
  let i = 0;
  const words = text.split(" ");
  return (
    <Tag id={id} className={`split ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          // l'espace reste hors du mot insécable : la ligne peut se couper entre deux mots
          <Fragment key={w}>
            {w ? " " : null}
            <span className="split__word">
              {Array.from(word).map((ch) => (
                <span key={i} className="split__char" style={{ "--i": i++ } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
