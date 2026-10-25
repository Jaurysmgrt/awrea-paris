/**
 * Textes des pièces et du panier : types des documents de contenu « catalogue » et « commerce »
 * (content/site/fr/*.json, modifiables dans l'éditeur Édition) et petites aides de mise en forme.
 * Module pur : utilisable par les composants serveur (getDoc) comme par ceux du navigateur (useTexts).
 */
import { fill } from "@/lib/edition/fill";
import { leadTimeText } from "./availability";
import type { LeadTime } from "./types";

export type CatalogueTexts = typeof import("@/content/site/fr/catalogue.json");
export type CommerceTexts = typeof import("@/content/site/fr/commerce.json");

/** Délai lisible selon les modèles du document « catalogue » : « 2 à 3 semaines ». */
export const delaiText = (t: Pick<CatalogueTexts, "delai">, leadTime: LeadTime) => leadTimeText(leadTime, t.delai);

export { fill };
