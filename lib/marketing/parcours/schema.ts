/** Validation d'un parcours enregistré par l'Atelier (aucune autre forme n'est acceptée). */
import { z } from "zod";
import { CRITERES, DECLENCHEURS, EXCLUSIONS, type CritereId, type DeclencheurId, type Definition, type ExclusionId } from "@/lib/marketing/parcours/types";

const ID = z.string().regex(/^[a-z0-9-]{2,40}$/);
const DOC = z.string().regex(/^email-[a-z0-9-]{1,74}$/);
const Critere = z.enum(Object.keys(CRITERES) as [CritereId, ...CritereId[]]);

export const EtapeSchema = z.discriminatedUnion("type", [
  z.object({ id: ID, type: z.literal("email"), email: DOC }).strict(),
  z.object({ id: ID, type: z.literal("attente"), duree: z.number().int().min(1).max(365), unite: z.enum(["heures", "jours"]) }).strict(),
  z.object({ id: ID, type: z.literal("condition"), critere: Critere }).strict(),
]);

/** Ce que l'éditeur envoie : la définition, sans le statut ni les dates (gérés par le serveur). */
export const DefinitionSchema: z.ZodType<Definition> = z
  .object({
    nom: z.string().trim().min(2).max(80),
    declencheur: z.enum(Object.keys(DECLENCHEURS) as [DeclencheurId, ...DeclencheurId[]]),
    fenetreJours: z.number().int().min(1).max(90),
    entree: z.array(Critere).max(8),
    etapes: z.array(EtapeSchema).min(1).max(20),
    objectif: z.enum(["achat", "aucun"]),
    sortieSiConditions: z.boolean(),
    exclusions: z.array(z.enum(Object.keys(EXCLUSIONS) as [ExclusionId, ...ExclusionId[]])).max(4),
  })
  .strict();
