/**
 * Photos provisoires : les visuels générés en attendant les prises de vue de la Maison
 * (RESSOURCES.md, « PHOTOS IA EN ATTENDANT », et le visuel des sacs découpé dans une maquette).
 * Un seul marqueur, `provisoire: true`, sur les images du catalogue (lib/commerce/types.ts) comme
 * sur celles des documents de contenu, des blocs et des photos déposées (lib/edition/blocks.ts).
 *
 *  - Sur le site, la photo porte la mention discrète « visuel provisoire » (prop `provisoire` de
 *    components/ui/Media.tsx, ou components/commerce/ProvisionalNote.tsx).
 *  - Dans l'éditeur, une pastille « Provisoire » la signale sur la page et dans le panneau de la
 *    photo ; la case « Photo provisoire » se décoche ; une photo remplacée par un envoi n'est plus
 *    provisoire, sauf si la créatrice coche la case.
 *  - Le filtre « Photos provisoires à remplacer » (barre d'édition, et Atelier › Pages › Photos)
 *    les liste toutes, avec la page où chacune paraît (lib/edition/photos.ts).
 *
 * Module pur, partagé par l'éditeur, l'Atelier et le serveur. Les textes de l'éditeur pour ces
 * photos vivent ici, à côté de la règle qu'ils expliquent.
 */
import type { Img } from "./blocks";
import { formatPath, type Path } from "./paths";

/** Objet image d'un document de contenu : { src, alt, width, height }. */
export function isImg(x: unknown): x is Img {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return typeof o.src === "string" && typeof o.alt === "string" && typeof o.width === "number" && typeof o.height === "number";
}

/** Vrai pour une image marquée provisoire (et seulement si le marqueur vaut vrai). */
export const isProvisional = (x: unknown): boolean => isImg(x) && x.provisoire === true;

export interface FoundImage {
  /** chemin dans le document, par exemple « chapitres.0.image » */
  path: string;
  image: Img;
}

/** Toutes les images d'un document de contenu, avec leur chemin. */
export function imagesIn(value: unknown, at: Path = []): FoundImage[] {
  if (isImg(value)) return [{ path: formatPath(at), image: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => imagesIn(v, [...at, i]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => imagesIn(v, [...at, k]));
  return [];
}

/** Image prête à enregistrer : le marqueur n'est écrit que s'il vaut vrai (aucun « provisoire: false » dans les fichiers). */
export function withProvisional<T extends Img>(img: T, provisoire: boolean): T {
  const out: T = { ...img };
  delete out.provisoire;
  return provisoire ? { ...out, provisoire: true } : out;
}

/**
 * Case « Photo provisoire » après le choix d'une autre photo (envoi, ou photo déjà déposée) : la
 * nouvelle photo n'est plus provisoire, sauf si la créatrice a coché la case elle-même (ou si la
 * photo reprise avait été déposée comme provisoire).
 */
export function provisionalAfterReplace(box: { touched: boolean; checked: boolean }, incoming: Pick<Img, "provisoire"> | null | undefined): boolean {
  if (box.touched) return box.checked;
  return incoming?.provisoire === true;
}

/**
 * `a-remplacer` : la photo est encore provisoire dans ce que la créatrice modifie (le brouillon, ou
 * la version en ligne s'il n'y a pas de brouillon). `a-publier` : déjà remplacée ou décochée dans
 * le brouillon, elle reste provisoire en ligne jusqu'à « Publier ».
 */
export type EtatProvisoire = "a-remplacer" | "a-publier";

export interface ProvisionalFound extends FoundImage {
  etat: EtatProvisoire;
}

/** Photos provisoires d'un document, d'après sa version en ligne et son brouillon. */
export function provisionalIn(published: unknown, draft?: unknown): ProvisionalFound[] {
  const current = draft ?? published;
  const now: ProvisionalFound[] = imagesIn(current)
    .filter((f) => f.image.provisoire === true)
    .map((f) => ({ ...f, etat: "a-remplacer" }));
  if (draft === undefined || draft === null) return now;
  // une section déplacée change le chemin, pas la photo : on compare aussi les adresses des photos
  const still = new Set(now.flatMap((f) => [f.path, f.image.src]));
  const online: ProvisionalFound[] = imagesIn(published)
    .filter((f) => f.image.provisoire === true && !still.has(f.path) && !still.has(f.image.src))
    .map((f) => ({ ...f, etat: "a-publier" }));
  return [...now, ...online];
}

export type Origine = "contenu" | "piece" | "collection";

/** Une photo du site et la page où elle paraît (lib/edition/photos.ts). */
export interface SitePhoto {
  /** clé stable : origine, document ou fiche, langue, chemin */
  id: string;
  origine: Origine;
  image: Img;
  /** page, pièce ou collection */
  label: string;
  /** adresse où la photo paraît */
  chemin?: string;
  /** photo d'un document de contenu : où la retrouver dans l'éditeur */
  doc?: string;
  locale?: "fr" | "en";
  path?: string;
  provisoire: boolean;
  /** seulement pour le filtre « Photos provisoires à remplacer » */
  etat?: EtatProvisoire;
}

/** Textes de l'éditeur et de l'Atelier pour les photos provisoires. */
export const TEXTES_PROVISOIRES = {
  pastille: "Provisoire",
  filtre: "Photos provisoires à remplacer",
  toutes: "Toutes les photos",
  boutonBarre: "Photos provisoires",
  case: "Photo provisoire",
  caseAide: "Un visuel d’attente, en attendant les prises de vue. Le site écrit alors « visuel provisoire » sous la photo. Décochez dès que c’est une photographie de la Maison.",
  remplacee: "Votre nouvelle photo n’est plus marquée provisoire. Cochez la case si c’est encore un visuel d’attente.",
  photoDuTexte: "La photo de ce texte est un visuel provisoire. Cliquez sur la photo pour la remplacer, ou pour décocher « Photo provisoire ».",
  intro: "Ces visuels attendent les photographies de la Maison. Sur le site, chacun porte la mention « visuel provisoire ».",
  surCettePage: "Sur cette page",
  ailleurs: "Ailleurs sur le site",
  remplacer: "Remplacer",
  ouvrir: "Ouvrir la page",
  aPublier: "Remplacée dans le brouillon, en ligne après « Publier »",
  piece: "Photo d’une pièce : elle se remplace dans la fiche de la pièce sur Shopify, où l’on décoche ensuite « Visuels provisoires ».",
  collection: "Photo d’une collection : elle se remplace dans la collection sur Shopify, où l’on décoche ensuite « Visuels provisoires ».",
  aucune: "Aucune photo provisoire : toutes les photos du site sont celles de la Maison.",
  sansPage: "Texte commun à plusieurs pages",
  chargement: "Chargement…",
  fermer: "Fermer",
  // médiathèque de l'Atelier
  mediatheque: "Photos",
  mediathequeIntro: "Chaque photo du site, avec la page où elle paraît. Les visuels provisoires se remplacent directement sur la page, en mode Édition.",
  deposees: "Photos déposées",
  deposeesIntro: "Les photos envoyées depuis l’éditeur, prêtes à reprendre sur n’importe quelle page.",
  aucuneDeposee: "Aucune photo déposée pour l’instant.",
  paraitSur: "Paraît sur",
  nulle: "Sur aucune page pour l’instant",
  enLigne: "En ligne",
  surPages: "Photos du site",
  voir: "Voir les photos provisoires",
  retourPages: "Retour aux pages",
  filtrer: "Afficher",
  remplacerSurPage: "Remplacer sur la page",
  ouvrirEdition: "Ouvrir la page en mode Édition",
  voirToutes: "Voir toutes les photos",
  resumeAucune: "Toutes les photos du site sont celles de la Maison.",
  resumeUne: "photo provisoire attend encore une photographie de la Maison.",
  resumePlusieurs: "photos provisoires attendent encore les photographies de la Maison.",
} as const;
