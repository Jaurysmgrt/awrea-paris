/**
 * Icônes du menu de l'Atelier (retour de la créatrice du 09/11 : « que ce soit intuitif, même dans
 * la barre de menu et sur téléphone ») : un trait simple et arrondi, sans remplissage, à la couleur
 * du texte. Réservées à l'Atelier ; le site garde ses icônes au fil (components/ui/Icon.tsx).
 * Toujours décoratives : le mot de l'entrée est à côté.
 */
const traces = {
  accueil: "M4 11l8-7 8 7M6 9.5V20h4.5v-5.5h3V20H18V9.5",
  produits: "M10 6.5a2 2 0 114 0c0 1.2-2 1.6-2 3.2M12 9.7L3.5 16.5h17L12 9.7z",
  commandes: "M4 8l8-4 8 4v8.5L12 20.5 4 16.5V8zM4 8l8 4 8-4M12 12v8.5",
  clientes: "M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c.6-3.4 3.2-5.5 6.5-5.5S15.4 16.6 16 20M15.5 4.3a3.5 3.5 0 010 6.4M18 14.8c1.7.8 2.7 2.6 3 5.2",
  pages: "M6.5 3.5h8l4 4v13h-12v-17zM14.5 3.5v4h4M9 12.5h6.5M9 16h6.5",
  photos: "M4 5.5h16v13H4v-13zM4 15.5l4.5-4.5 4 4 3-3 4.5 4.5M15.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  emails: "M3.5 6h17v12h-17V6zM3.5 6.5l8.5 6.5 8.5-6.5",
  instagram: "M8 4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM16.8 7.2h.01",
  rendezvous: "M4 6h16v14H4V6zM4 10.5h16M8.5 3.5v4M15.5 3.5v4",
  messages: "M4 5h16v11H9.5L4 20V5z",
  rapports: "M4 20h16M7.5 16.5v-5M12 16.5V7M16.5 16.5v-8",
  valider: "M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17zM8.5 12.2l2.5 2.5 4.6-5.2",
  agents: "M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9L12 3.5z",
  reglages: "M4 7.5h9M17 7.5h3M15 5.5v4M4 16.5h3M11 16.5h9M9 14.5v4",
  menu: "M4 7h16M4 12h16M4 17h16",
  fermer: "M6 6l12 12M18 6L6 18",
} as const;

export type NomIcone = keyof typeof traces;

export function AtelierIcone({ nom, className }: { nom: NomIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className ? `atelier-icone ${className}` : "atelier-icone"} aria-hidden="true" focusable="false">
      <path d={traces[nom]} />
    </svg>
  );
}
