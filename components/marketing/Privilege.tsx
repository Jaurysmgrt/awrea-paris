/**
 * Fenêtre « Profitez de votre privilège » : composant serveur qui transmet les textes du document
 * « privilege » (modifiable dans l'éditeur Édition) à la fenêtre, composant du navigateur.
 */
import { TextsRoot } from "@/components/content/TextsRoot";
import { FenetrePrivilege } from "./FenetrePrivilege";

export function Privilege() {
  return (
    <TextsRoot ids={["privilege"]}>
      <FenetrePrivilege />
    </TextsRoot>
  );
}
