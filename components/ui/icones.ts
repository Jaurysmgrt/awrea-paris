/**
 * Tracés des icônes au fil (components/ui/Icon.tsx), dans une grille de 24 × 24 : un seul trait, sans
 * remplissage. Module pur, sans JSX : lu aussi par les tests unitaires (noms d'icônes choisis dans
 * les documents de contenu).
 */
export const paths = {
  close: "M5 5l14 14M19 5L5 19",
  menu: "M3 8h18M3 16h18",
  bag: "M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrow: "M4 12h16m-5-5l5 5-5 5",
  arrowLeft: "M20 12H4m5-5l-5 5 5 5",
  diamond: "M12 3l7 9-7 9-7-9 7-9z",
  search: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM15.5 15.5L21 21",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  play: "M8 5l11 7-11 7V5z",
  pause: "M8 5v14M16 5v14",
  chat: "M4 5h16v11H9l-5 4V5z",
  sound: "M4 9h4l5-4v14l-5-4H4V9z",
  // famille de couture (cahier du 23/11) : traits arrondis, formes simples
  ciseaux: "M8.5 7a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0zM8.5 17a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0zM8.1 15.6L20 7.5M8.1 8.4L20 16.5",
  horloge: "M20.5 12a8.5 8.5 0 1 1-17 0a8.5 8.5 0 1 1 17 0zM12 7v5l3.5 2",
  colis: "M12 3.5l8 4.25v8.5L12 20.5l-8-4.25v-8.5L12 3.5zM4 7.75L12 12l8-4.25M12 12v8.5",
  coche: "M5 12.5l4.5 4.5L19 7.5",
  etoffe: "M4 7.5a2.5 2.5 0 0 1 5 0v9a2.5 2.5 0 0 1-5 0zM6.5 5H20v10c-1.8 1.2-3.7 1.2-5.5 0S10.8 13.8 9 15",
  regle: "M3 8.5h18v7H3zM6.5 8.5v3M10 8.5v2M13.5 8.5v3M17 8.5v2",
  enveloppe: "M3.5 6h17v12h-17zM3.5 6.5L12 13l8.5-6.5",
  cintre: "M10 6a2 2 0 1 1 2 2v2M12 10l-8.5 7h17z",
  aiguille: "M4.5 19.5L17 7M17 7l1.6-1.6a1.4 1.4 0 0 1 2 2L19 9zM19.8 6.4c1.2 3.6-1.6 6.1-5.6 7.6S8 17.6 9.5 20",
  domicile: "M4 11l8-6.5 8 6.5M6 9.5V19.5h12V9.5M10 19.5v-5h4v5",
} as const;

export type IconName = keyof typeof paths;

/** Icônes de couture : leurs courbes demandent des extrémités et des angles arrondis. */
export const ROUND = new Set<IconName>(["ciseaux", "horloge", "colis", "coche", "etoffe", "regle", "enveloppe", "cintre", "aiguille", "domicile"]);

/** Vrai pour un nom d'icône connu (icônes choisies dans un document de contenu). */
export const isIconName = (name: unknown): name is IconName => typeof name === "string" && Object.hasOwn(paths, name);
