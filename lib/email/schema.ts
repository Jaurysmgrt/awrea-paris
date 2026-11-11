/** Validation d'un e-mail envoyé par l'éditeur (aucune autre forme n'est enregistrée). */
import { z } from "zod";
import { EMAIL_BLOCKS, ESPACE_MAX, HAUTEUR_MAX, LARGEUR_MIN } from "@/lib/email/blocks";

const Img = z.object({ src: z.string().max(400), alt: z.string().max(180), width: z.number().int().min(1).max(8000), height: z.number().int().min(1).max(8000), focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional() });
const Lien = z.object({ label: z.string().max(32), href: z.string().max(400).regex(/^(\/(?!\/)|https:\/\/|mailto:|atelier:\/)/) });
const Cond = z.string().regex(/^[a-zA-Z]\w{0,30}$/).optional();

const Block = z
  .object({
    id: z.string().regex(/^b-[a-z0-9]{4,24}$/),
    type: z.enum(EMAIL_BLOCKS.map((b) => b.type) as [string, ...string[]]),
    si: Cond,
    sauf: Cond,
    fond: z.enum(["noir", "clair"]).optional(),
    titre: z.string().max(90).optional(),
    texte: z.string().max(2400).optional(),
    note: z.string().max(600).optional(),
    image: Img.optional(),
    lien: Lien.nullable().optional(),
    pieces: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(1).optional(),
    // mise en forme (lib/email/blocks.ts, EmailStyle) : des valeurs prévues seulement
    align: z.enum(["gauche", "centre", "droite"]).optional(),
    police: z.enum(["italique", "droite", "texte"]).optional(),
    taille: z.enum(["petite", "normale", "grande"]).optional(),
    avant: z.number().int().min(0).max(ESPACE_MAX).multipleOf(8).optional(),
    apres: z.number().int().min(0).max(ESPACE_MAX).multipleOf(8).optional(),
    largeur: z.number().int().min(LARGEUR_MIN).max(100).multipleOf(5).optional(),
    cote: z.enum(["gauche", "droite"]).optional(),
    style: z.enum(["plein", "contour"]).optional(),
    hauteur: z.number().int().min(8).max(HAUTEUR_MAX).multipleOf(8).optional(),
    image2: Img.optional(),
  })
  .strict();

export const EmailDocSchema = z
  .object({
    nom: z.string().min(2).max(80),
    quand: z.string().max(200),
    famille: z.enum(["commande", "service", "lettre"]),
    sujet: z.string().min(1).max(80),
    preheader: z.string().max(110),
    variables: z.record(z.string().regex(/^[a-zA-Z]\w{0,30}$/), z.object({ description: z.string().max(160), exemple: z.string().max(160) })),
    blocs: z.array(Block).max(30),
  })
  .strict();
