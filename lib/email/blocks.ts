/**
 * Bibliothèque de blocs des e-mails, dans la direction artistique de la Maison : la créatrice
 * compose un e-mail comme une page (en-tête au monogramme, photographie, texte, pièce, bouton,
 * signature, pied de page légal), sans jamais pouvoir sortir du design system. Module pur, partagé
 * par l'éditeur d'e-mails, le rendu et le serveur.
 */
import { newBlockId, TODO, type Block, type BlockDef, type Img, type Lien } from "@/lib/edition/blocks";

export interface EmailDoc {
  /** nom de l'e-mail dans l'Atelier */
  nom: string;
  /** quand il part, en une phrase */
  quand: string;
  /** e-mail de commande, transactionnel du site, ou lettre */
  famille: "commande" | "service" | "lettre";
  sujet: string;
  preheader: string;
  /** repères remplacés à l'envoi : ce qu'ils deviennent, et un exemple pour l'aperçu */
  variables: Record<string, { description: string; exemple: string }>;
  blocs: EmailBlock[];
}

/**
 * Un bloc peut ne paraître que dans certains cas : « si » (le repère a une valeur, par exemple une
 * précommande) ou « sauf » (il n'en a pas). Réglé par la Maison à la création de l'e-mail.
 */
export type EmailBlock = Block & { si?: string; sauf?: string } & Partial<EmailStyle>;

/**
 * Mise en forme d'un bloc, réglée dans l'éditeur comme dans Brevo ou Mailchimp (retour du 10/11 :
 * « écrire, mettre une photo, la décaler à droite, à gauche, en bas, choisir la typo »), sans sortir
 * de l'identité : les trois polices de la Maison seulement, des tailles prévues, des espaces sur la
 * grille de 8 px. Chaque réglage est facultatif : sans lui, le bloc garde son allure d'origine.
 */
export interface EmailStyle {
  /** alignement du texte, de la photo ou du bouton */
  align: Alignement;
  /** police de la Maison : Fraunces italique, Fraunces droite (fine) ou Cormorant Garamond */
  police: Police;
  taille: Taille;
  /** espace au-dessus et au-dessous du bloc, en pixels (multiples de 8) */
  avant: number;
  apres: number;
  /** largeur de la photo, en pourcentage de la largeur de l'e-mail */
  largeur: number;
  /** place de la photo à côté du texte */
  cote: "gauche" | "droite";
  /** bouton plein (noir) ou au filet */
  style: "plein" | "contour";
  /** hauteur d'un espace vide, en pixels (multiples de 8) */
  hauteur: number;
  /** seconde photo (bloc « Deux photos ») */
  image2: Img;
}

export type Alignement = "gauche" | "centre" | "droite";
export type Police = "italique" | "droite" | "texte";
export type Taille = "petite" | "normale" | "grande";

export const ALIGNEMENTS: { value: Alignement; label: string }[] = [
  { value: "gauche", label: "À gauche" },
  { value: "centre", label: "Au centre" },
  { value: "droite", label: "À droite" },
];
export const POLICES: { value: Police; label: string; usage: string }[] = [
  { value: "italique", label: "Fraunces italique", usage: "titres et signature" },
  { value: "droite", label: "Fraunces droite", usage: "grands titres, en fin" },
  { value: "texte", label: "Cormorant Garamond", usage: "texte" },
];
export const TAILLES: { value: Taille; label: string }[] = [
  { value: "petite", label: "Petite" },
  { value: "normale", label: "Normale" },
  { value: "grande", label: "Grande" },
];
/** espaces proposés autour d'un bloc (grille de 8 px) */
export const ESPACE_MAX = 64;
export const HAUTEUR_MAX = 96;
export const LARGEUR_MIN = 30;

/** Ce que l'on peut régler sur chaque bloc (le reste garde l'allure de la Maison). */
export type Reglage = "align" | "police" | "taille" | "espace" | "largeur" | "cote" | "style" | "hauteur";
export const REGLAGES: Record<string, Reglage[]> = {
  titre: ["police", "taille", "align", "espace"],
  texte: ["police", "taille", "align", "espace"],
  image: ["largeur", "align", "espace"],
  "photo-texte": ["cote", "police", "taille", "espace"],
  "deux-photos": ["espace"],
  produit: ["espace"],
  bouton: ["style", "align", "espace"],
  commande: ["espace"],
  separateur: ["espace"],
  signature: ["police", "taille", "align", "espace"],
  espace: ["hauteur"],
};

/** Allure d'origine de chaque bloc : ce que donne un bloc sans réglage. */
export const STYLE_PAR_DEFAUT: Record<string, Partial<EmailStyle>> = {
  titre: { police: "italique", taille: "normale", align: "centre", avant: 0, apres: 32 },
  texte: { police: "texte", taille: "normale", align: "gauche", avant: 0, apres: 32 },
  image: { largeur: 100, align: "centre", avant: 0, apres: 32 },
  "photo-texte": { cote: "gauche", police: "texte", taille: "normale", avant: 0, apres: 32 },
  "deux-photos": { avant: 0, apres: 32 },
  produit: { avant: 0, apres: 32 },
  bouton: { style: "plein", align: "centre", avant: 8, apres: 40 },
  commande: { avant: 0, apres: 32 },
  separateur: { avant: 0, apres: 32 },
  signature: { police: "italique", taille: "normale", align: "gauche", avant: 8, apres: 40 },
  espace: { hauteur: 32 },
};

/** Réglage effectif d'un bloc : le sien, sinon l'allure d'origine. */
export function styleOf(b: EmailBlock): Partial<EmailStyle> {
  const base = STYLE_PAR_DEFAUT[b.type] ?? {};
  const out: Partial<EmailStyle> = { ...base };
  for (const k of Object.keys(base) as (keyof EmailStyle)[]) if (b[k] !== undefined) (out as Record<string, unknown>)[k] = b[k];
  return out;
}

/**
 * Liens dans un texte : « [les mots du lien](https://…) », vers le site (« /boutique »), une adresse
 * https ou un e-mail (mailto:). Rien d'autre n'est reconnu : le reste s'écrit tel quel.
 */
export const LIEN_TEXTE = /\[([^\]\n]{1,80})\]\(((?:https:\/\/|\/(?!\/)|mailto:)[^\s()<>"{}]{0,400})\)/g;
/** Le texte sans le balisage des liens (contrôle d'écriture, version texte). */
export const sansLiens = (s: string) => s.replace(LIEN_TEXTE, "$1");

/** Le bloc paraît-il avec ces valeurs ? */
export const blockShown = (b: EmailBlock, vars: Record<string, string> | undefined) => (!b.si || Boolean(vars?.[b.si])) && (!b.sauf || !vars?.[b.sauf]);

const vide = (): Img => ({ src: "", alt: TODO("Décrire la photographie"), width: 1200, height: 1500 });

export const EMAIL_BLOCKS: BlockDef[] = [
  {
    type: "entete",
    label: "En-tête au monogramme",
    description: "Le monogramme de la Maison, en haut de l’e-mail.",
    fields: [{ key: "fond", label: "Fond", kind: "choix", options: [{ value: "noir", label: "Noir" }, { value: "clair", label: "Blanc cassé" }] }],
    create: () => ({ fond: "noir" }),
  },
  {
    type: "titre",
    label: "Titre",
    description: "Le titre de l’e-mail, en grand.",
    fields: [{ key: "titre", label: "Titre", kind: "texte" }],
    create: () => ({ titre: TODO("Écrire le titre") }),
  },
  {
    type: "texte",
    label: "Texte",
    description: "Un ou plusieurs paragraphes. Une ligne vide sépare deux paragraphes.",
    fields: [{ key: "texte", label: "Texte", kind: "texte-long" }],
    create: () => ({ texte: TODO("Écrire le texte") }),
  },
  {
    type: "image",
    label: "Photographie",
    description: "Une photographie de la Maison sur toute la largeur de l’e-mail.",
    fields: [
      { key: "image", label: "Photographie", kind: "image" },
      { key: "lien", label: "Lien de la photographie", kind: "lien", optional: true },
    ],
    create: () => ({ image: vide(), lien: null }),
  },
  {
    type: "photo-texte",
    label: "Photo et texte",
    description: "Une photographie et quelques lignes côte à côte ; l’une sous l’autre sur téléphone.",
    fields: [
      { key: "image", label: "Photographie", kind: "image" },
      { key: "texte", label: "Texte", kind: "texte-long" },
    ],
    create: () => ({ image: vide(), texte: TODO("Écrire le texte"), cote: "gauche" }),
  },
  {
    type: "deux-photos",
    label: "Deux photos",
    description: "Deux photographies côte à côte ; l’une sous l’autre sur téléphone.",
    fields: [
      { key: "image", label: "Première photographie", kind: "image" },
      { key: "image2", label: "Seconde photographie", kind: "image" },
    ],
    create: () => ({ image: vide(), image2: vide() }),
  },
  {
    type: "produit",
    label: "Pièce",
    description: "Une pièce de la boutique : sa photographie, son nom, son prix, le lien vers sa page.",
    fields: [{ key: "pieces", label: "Pièce", kind: "pieces", max: 1 }],
    create: () => ({ pieces: [] }),
  },
  {
    type: "bouton",
    label: "Bouton",
    description: "Un seul appel, en petites capitales.",
    fields: [{ key: "lien", label: "Bouton", kind: "lien" }],
    create: () => ({ lien: { label: TODO("Texte du bouton"), href: "/" } }),
  },
  {
    type: "commande",
    label: "Détail de la commande",
    description: "Les pièces commandées et les montants, remplis automatiquement à l’envoi.",
    fields: [],
    create: () => ({}),
  },
  {
    type: "separateur",
    label: "Filet",
    description: "Un filet fin pour séparer deux parties.",
    fields: [],
    create: () => ({}),
  },
  {
    type: "espace",
    label: "Espace",
    description: "Un peu d’air entre deux blocs, de la hauteur de votre choix.",
    fields: [],
    create: () => ({ hauteur: 32 }),
  },
  {
    type: "signature",
    label: "Signature de la créatrice",
    description: "Quelques mots de la main de la créatrice, en fin d’e-mail.",
    fields: [{ key: "texte", label: "Signature", kind: "texte-long" }],
    create: () => ({ texte: TODO("Écrire la signature") }),
  },
  {
    type: "pied",
    label: "Pied de page légal",
    description: "La devise, les liens de la Maison et les mentions obligatoires, avec le lien de désinscription pour les lettres.",
    fields: [{ key: "note", label: "Note en bas de l’e-mail", kind: "texte-long", optional: true }],
    create: () => ({ note: "" }),
  },
];

export const emailBlockDef = (type: string) => EMAIL_BLOCKS.find((b) => b.type === type);

export function createEmailBlock(type: string): EmailBlock | null {
  const def = emailBlockDef(type);
  return def ? { id: newBlockId(), type, ...def.create() } : null;
}

/** Repères {prenom}, {commande}… d'un texte. */
export const placeholdersOf = (s: string) => [...new Set(s.match(/\{[a-zA-Z][\w]*\}/g) ?? [])].map((p) => p.slice(1, -1));

const STYLE_KEYS = new Set(["align", "police", "taille", "cote", "style"]);

/** Tous les textes d'un e-mail, avec leur chemin (pour le contrôle d'écriture et les garde-fous). */
export function emailTexts(doc: EmailDoc): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [
    { path: "sujet", text: doc.sujet },
    { path: "preheader", text: doc.preheader },
  ];
  doc.blocs.forEach((b, i) => {
    for (const [k, v] of Object.entries(b)) {
      if (k === "id" || k === "type") continue;
      if (typeof v === "string" && v && !STYLE_KEYS.has(k)) out.push({ path: `blocs.${i}.${k}`, text: k === "texte" ? sansLiens(v) : v });
      if ((k === "image" || k === "image2") && v && typeof v === "object") out.push({ path: `blocs.${i}.${k}.alt`, text: (v as Img).alt });
      if (k === "lien" && v && typeof v === "object") out.push({ path: `blocs.${i}.lien.label`, text: (v as Lien).label });
    }
  });
  return out;
}
