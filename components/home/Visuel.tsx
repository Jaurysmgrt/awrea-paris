import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import styles from "./editorial.module.css";

/**
 * Grande photo d'une page de la Maison, avec sa légende discrète : un crédit s'il y en a un, et la
 * mention « visuel provisoire » quand l'image est générée en attendant les photographies de la
 * Maison (RESSOURCES.md). Les grandes photos restent droites ; seules les cartes sont arrondies.
 */
export function Visuel({
  image,
  sizes,
  ratio = "portrait",
  priority,
  legende,
  className,
}: {
  image: Image;
  sizes: string;
  ratio?: "portrait" | "tall" | "look" | "landscape" | "wide";
  priority?: boolean;
  legende?: string;
  className?: string;
}) {
  return (
    <figure className={`${styles.visuel} ${className ?? ""}`}>
      <Media image={image} ratio={ratio} sizes={sizes} priority={priority} />
      {legende || image.provisoire ? (
        <figcaption className={styles.legende}>
          {legende ? <span className="t-note">{legende}</span> : null}
          <ProvisionalNote image={image} />
        </figcaption>
      ) : null}
    </figure>
  );
}
