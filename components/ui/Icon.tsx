/**
 * Icônes au fil : un seul trait fin (1 px, quelle que soit la taille), sans remplissage, à la couleur
 * du texte (noir, taupe, ivoire en mode Nuit : rien à régler). C'est le seul jeu d'icônes du site
 * public, sans bibliothèque : celles de l'interface (fermer, menu, panier…) et, depuis le cahier de
 * la créatrice du 23/11, une petite famille de couture, employée seulement là où elle aide à
 * comprendre (étapes de confection, délais, bloc « Créée pour vous » de la fiche, guide des tailles,
 * livraison, contact), jamais une icône par ligne. Taille : classe `.icone` (20 px) ou `.icone--l`
 * (24 px), styles/components.css.
 * Décorative par défaut (aria-hidden) : le texte voisin porte le sens ; `title` en fait une image
 * nommée, quand l'icône est seule.
 */
import { paths, ROUND, type IconName } from "./icones";

export { isIconName, type IconName } from "./icones";

export function Icon({ name, className, title }: { name: IconName; className?: string; title?: string }) {
  const round = ROUND.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap={round ? "round" : "square"}
      strokeLinejoin={round ? "round" : undefined}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={paths[name]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
