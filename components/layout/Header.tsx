/**
 * En-tête du site (maquette EN-TÊTE DU SITE) : logo entier centré, navigation centrée dessous,
 * cinq entrées au plus (Accueil, Sur commande, Collections, Contact, Mon Panier), aucune bannière.
 * Composant serveur : il lit les entrées dans le document « navigation »
 * (content/site/fr/navigation.json, modifiable dans l'éditeur Édition) et les confie à la barre
 * interactive (HeaderBar, components/layout/Menu.tsx).
 */
import { getDoc } from "@/lib/edition/read";
import { HeaderBar, type NavigationDoc } from "./Menu";

export async function Header() {
  const nav = await getDoc<NavigationDoc>("navigation");
  return <HeaderBar nav={nav} />;
}
