/**
 * Chevron des menus déroulants (« Collections ⌄ », maquette EN-TÊTE DU SITE) : le signe n'existe
 * dans aucune des deux polices officielles, il est donc dessiné d'un trait fin, à la couleur du
 * texte. Purement décoratif : l'état ouvert ou fermé est porté par aria-expanded sur le bouton.
 * Taille et rotation : classe .chevron (styles/layout.css).
 */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${className ?? ""}`} aria-hidden="true" focusable="false">
      <path d="M3.5 6l4.5 4.5L12.5 6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
