/**
 * Bibliothèque de blocs de l'éditeur, dans la direction artistique de la Maison : la créatrice
 * compose une page en ajoutant, déplaçant, dupliquant ou supprimant ces sections, sans jamais
 * pouvoir sortir du design system (aucune couleur, police, taille ou mise en page libre : seulement
 * les variantes prévues ici). Module pur, partagé par l'éditeur et le serveur.
 */
export interface Img {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** point focal, en pourcentage de la largeur et de la hauteur */
  focal?: { x: number; y: number };
  /**
   * Photo provisoire (visuel généré en attendant les prises de vue de la Maison) : même marqueur
   * que les images du catalogue (lib/commerce/types.ts). Le site écrit « visuel provisoire » sous
   * la photo ; l'éditeur la signale par une pastille et la liste parmi les photos à remplacer
   * (lib/edition/provisoires.ts). Écrit seulement quand il vaut vrai.
   */
  provisoire?: boolean;
}

export interface Lien {
  label: string;
  href: string;
}

export type FieldKind = "texte" | "texte-long" | "image" | "images" | "video" | "choix" | "pieces" | "lien" | "notes";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  /** nombre d'éléments au plus (images, pièces, notes) */
  max?: number;
  optional?: boolean;
}

export interface BlockDef {
  type: string;
  label: string;
  /** une phrase pour la bibliothèque de blocs */
  description: string;
  fields: FieldDef[];
  /** contenu d'un bloc neuf : des repères à remplacer, jamais un texte inventé */
  create: () => Record<string, unknown>;
}

/** Repère d'un texte à écrire : tant qu'il en reste, la page ne peut pas être publiée. */
export const TODO = (what: string) => `[${what}]`;
export const isTodo = (s: unknown) => typeof s === "string" && /^\[[^\]]+\]$/.test(s.trim());

const vide = (alt = "[Décrire l’image]"): Img => ({ src: "", alt, width: 1200, height: 1500 });

export const BLOCKS: BlockDef[] = [
  {
    type: "grande-image",
    label: "Grande image",
    description: "Une photographie sur toute la largeur, avec une légende discrète.",
    fields: [
      { key: "image", label: "Photographie", kind: "image" },
      { key: "legende", label: "Légende", kind: "texte", optional: true },
      { key: "hauteur", label: "Hauteur", kind: "choix", options: [{ value: "plein-ecran", label: "Tout l’écran" }, { value: "haute", label: "Haute" }, { value: "moyenne", label: "Moyenne" }] },
    ],
    create: () => ({ image: vide(), legende: "", hauteur: "haute" }),
  },
  {
    type: "texte-image",
    label: "Texte et image",
    description: "Un titre, quelques lignes et une photographie, côte à côte.",
    fields: [
      { key: "surtitre", label: "Petite ligne au-dessus du titre", kind: "texte", optional: true },
      { key: "titre", label: "Titre", kind: "texte" },
      { key: "texte", label: "Texte", kind: "texte-long" },
      { key: "image", label: "Photographie", kind: "image" },
      { key: "cote", label: "Place de l’image", kind: "choix", options: [{ value: "droite", label: "À droite" }, { value: "gauche", label: "À gauche" }] },
      { key: "cta", label: "Lien", kind: "lien", optional: true },
    ],
    create: () => ({ surtitre: "", titre: TODO("Écrire le titre"), texte: TODO("Écrire le texte"), image: vide(), cote: "droite", cta: null }),
  },
  {
    type: "citation",
    label: "Citation",
    description: "Une phrase de la créatrice ou d’une cliente, en grand.",
    fields: [
      { key: "citation", label: "Citation", kind: "texte-long" },
      { key: "auteur", label: "Qui l’a dite", kind: "texte" },
    ],
    create: () => ({ citation: TODO("Écrire la citation"), auteur: "La Créatrice" }),
  },
  {
    type: "galerie",
    label: "Galerie",
    description: "De deux à huit photographies, en quinconce ou en grille.",
    fields: [
      { key: "images", label: "Photographies", kind: "images", max: 8 },
      { key: "disposition", label: "Disposition", kind: "choix", options: [{ value: "quinconce", label: "En quinconce" }, { value: "grille", label: "En grille" }] },
    ],
    create: () => ({ images: [vide(), vide()], disposition: "quinconce" }),
  },
  {
    type: "video",
    label: "Vidéo",
    description: "Une vidéo muette qui tourne en boucle, avec son image d’attente.",
    fields: [
      { key: "video", label: "Vidéo", kind: "video" },
      { key: "legende", label: "Légende", kind: "texte", optional: true },
    ],
    create: () => ({ video: { src: "", poster: "", label: TODO("Décrire la vidéo") }, legende: "" }),
  },
  {
    type: "shop-the-look",
    label: "La tenue",
    description: "Une photographie de tenue et les pièces qui la composent, à commander d’un geste.",
    fields: [
      { key: "titre", label: "Titre", kind: "texte" },
      { key: "texte", label: "Texte", kind: "texte-long", optional: true },
      { key: "image", label: "Photographie de la tenue", kind: "image" },
      { key: "pieces", label: "Pièces de la tenue", kind: "pieces", max: 4 },
    ],
    create: () => ({ titre: TODO("Écrire le titre"), texte: "", image: vide(), pieces: [] }),
  },
  {
    type: "croquis",
    label: "Croquis",
    description: "Un croquis de la créatrice, avec ses notes posées sur le dessin.",
    fields: [
      { key: "titre", label: "Titre", kind: "texte", optional: true },
      { key: "image", label: "Croquis", kind: "image" },
      { key: "notes", label: "Notes sur le dessin", kind: "notes", max: 8 },
    ],
    create: () => ({ titre: "", image: vide("[Décrire le croquis]"), notes: [] }),
  },
  {
    type: "appel",
    label: "Invitation",
    description: "Une phrase et un seul bouton, pour inviter à un geste précis.",
    fields: [
      { key: "titre", label: "Titre", kind: "texte" },
      { key: "texte", label: "Texte", kind: "texte-long", optional: true },
      { key: "cta", label: "Bouton", kind: "lien" },
    ],
    create: () => ({ titre: TODO("Écrire le titre"), texte: "", cta: { label: TODO("Écrire le bouton"), href: "/boutique" } }),
  },
  {
    type: "texte",
    label: "Texte",
    description: "Un titre et quelques paragraphes, justifiés comme dans un livre.",
    fields: [
      { key: "surtitre", label: "Petite ligne au-dessus du titre", kind: "texte", optional: true },
      { key: "titre", label: "Titre", kind: "texte", optional: true },
      { key: "texte", label: "Texte (une ligne vide sépare deux paragraphes)", kind: "texte-long" },
    ],
    create: () => ({ surtitre: "", titre: "", texte: TODO("Écrire le texte") }),
  },
  {
    type: "pieces",
    label: "Pièces",
    description: "Quelques pièces de la boutique, choisies une à une.",
    fields: [
      { key: "titre", label: "Titre", kind: "texte", optional: true },
      { key: "pieces", label: "Pièces", kind: "pieces", max: 8 },
      { key: "cta", label: "Lien", kind: "lien", optional: true },
    ],
    create: () => ({ titre: "", pieces: [], cta: null }),
  },
  {
    type: "lettre",
    label: "Lettre",
    description: "Une lettre de la créatrice, sur papier, signée.",
    fields: [
      { key: "texte", label: "Lettre (une ligne vide sépare deux paragraphes)", kind: "texte-long" },
      { key: "signature", label: "Signature", kind: "texte" },
    ],
    create: () => ({ texte: TODO("Écrire la lettre"), signature: "La Créatrice" }),
  },
  {
    type: "inscription",
    label: "Lettres de l’atelier",
    description: "L’invitation à recevoir la lettre de la Maison, avec le formulaire d’inscription.",
    fields: [
      { key: "titre", label: "Titre", kind: "texte" },
      { key: "texte", label: "Texte", kind: "texte-long", optional: true },
    ],
    create: () => ({ titre: TODO("Écrire le titre"), texte: "" }),
  },
];

export const blockDef = (type: string) => BLOCKS.find((b) => b.type === type);

export interface Block {
  id: string;
  type: string;
  [field: string]: unknown;
}

export const newBlockId = () => `b-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createBlock(type: string): Block | null {
  const def = blockDef(type);
  return def ? { id: newBlockId(), type, ...def.create() } : null;
}

export const duplicateBlock = (b: Block): Block => ({ ...structuredClone(b), id: newBlockId() });

/** Textes encore à écrire dans un document (repères entre crochets) : la publication attend. */
export function todos(value: unknown, at: string[] = []): string[] {
  if (isTodo(value)) return [at.join(".")];
  if (Array.isArray(value)) return value.flatMap((v, i) => todos(v, [...at, String(i)]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => todos(v, [...at, k]));
  return [];
}
