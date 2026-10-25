/**
 * Assistante clientes : fenêtre de discussion discrète, au design de la Maison. Une pièce, sa
 * taille, son délai de fabrication, la livraison, les retours, l'étape d'une commande, l'histoire de
 * la Maison, et la transmission à la créatrice quand une personne est préférable.
 *
 * Composant serveur : il transmet les textes de la fenêtre (document de contenu « assistante »,
 * modifiable dans l'éditeur Édition) au bouton d'ouverture et à la fenêtre, composants du navigateur.
 */
import { TextsRoot } from "@/components/content/TextsRoot";
import { AssistantLauncher } from "./AssistantLauncher";

export function Assistant() {
  return (
    <TextsRoot ids={["assistante"]}>
      <AssistantLauncher />
    </TextsRoot>
  );
}
