/**
 * Régime de TVA de la Maison, lu dans un seul réglage (content/settings.ts → shop.vatRegime).
 *
 * - "franchise" : franchise en base de TVA (article 293 B du CGI). Aucune TVA n'est facturée : le
 *   prix affiché est le prix payé, les factures n'ont ni colonne ni ligne de TVA et portent la
 *   mention légale, le récapitulatif et l'e-mail de confirmation la rappellent en note.
 * - "tva20" : TVA française au taux shop.vatRate, incluse dans les prix affichés.
 *
 * Module pur, sans dépendance au serveur : importable par la page de commande et par les tests.
 */
import { shop } from "@/content/settings";

export type RegimeTva = "franchise" | "tva20";

/** Mention légale de la franchise en base, sur les factures (en français, langue de la facture). */
export const MENTION_FRANCHISE = "TVA non applicable, article 293 B du Code général des impôts.";

export const regimeTva = (): RegimeTva => shop.vatRegime;

/** Franchise en base de TVA : aucune TVA facturée. */
export const vatFranchise = () => regimeTva() === "franchise";

/** Taux de TVA française facturé : 0 en franchise. */
export const tauxTva = () => (vatFranchise() ? 0 : shop.vatRate);
