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
  /** e-mail de commande (Shopify), transactionnel du site, ou lettre */
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
export type EmailBlock = Block & { si?: string; sauf?: string };

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

/** Tous les textes d'un e-mail, avec leur chemin (pour le contrôle d'écriture et les garde-fous). */
export function emailTexts(doc: EmailDoc): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [
    { path: "sujet", text: doc.sujet },
    { path: "preheader", text: doc.preheader },
  ];
  doc.blocs.forEach((b, i) => {
    for (const [k, v] of Object.entries(b)) {
      if (k === "id" || k === "type") continue;
      if (typeof v === "string" && v) out.push({ path: `blocs.${i}.${k}`, text: v });
      if (k === "image" && v && typeof v === "object") out.push({ path: `blocs.${i}.image.alt`, text: (v as Img).alt });
      if (k === "lien" && v && typeof v === "object") out.push({ path: `blocs.${i}.lien.label`, text: (v as Lien).label });
    }
  });
  return out;
}
