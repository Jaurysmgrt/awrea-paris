/**
 * Modèles de parcours : chacun devient un brouillon à relire, jamais actif d'office. Les e-mails
 * qu'ils citent sont des e-mails de la lettre, modifiables dans l'Atelier › E-mails
 * (content/site/fr/email-parcours-*.json). Les délais tiennent compte des e-mails que le site
 * envoie déjà seul : bienvenue à l'inscription, relance unique du panier après 4 heures, livraison,
 * entretien deux jours après, demande d'avis au quatorzième jour.
 */
import type { Definition, Etape } from "@/lib/marketing/parcours/types";

export type ModeleId = "nouvelle-inscrite" | "prospect" | "panier" | "premiere-commande" | "cliente";

export interface Modele {
  id: ModeleId;
  nom: string;
  /** en une phrase, pour la créatrice */
  pour: string;
  /** ce que la Maison doit savoir avant de l'activer */
  note?: string;
  definition: () => Definition;
}

let n = 0;
const id = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const email = (doc: string): Etape => ({ id: id("e"), type: "email", email: doc });
const attendre = (duree: number, unite: "heures" | "jours" = "jours"): Etape => ({ id: id("a"), type: "attente", duree, unite });

export const MODELES: Modele[] = [
  {
    id: "nouvelle-inscrite",
    nom: "Nouvelle inscrite",
    pour: "Faire connaître la Maison aux personnes qui viennent de s’inscrire à la lettre.",
    note: "Le site envoie déjà un mot de bienvenue à l’inscription : le parcours commence trois jours après.",
    definition: () => ({
      nom: "Nouvelle inscrite",
      declencheur: "inscription",
      fenetreJours: 14,
      entree: ["sans-commande"],
      etapes: [attendre(3), email("email-parcours-maison"), attendre(7), email("email-parcours-savoir-faire"), attendre(10), { id: id("c"), type: "condition", critere: "sans-commande" }, email("email-parcours-conseil")],
      objectif: "achat",
      sortieSiConditions: true,
      exclusions: ["autre-parcours"],
    }),
  },
  {
    id: "prospect",
    nom: "Prospect intéressé",
    pour: "Accompagner une personne inscrite à une avant-première ou venue en rendez-vous, qui n’a pas encore commandé.",
    definition: () => ({
      nom: "Prospect intéressé",
      declencheur: "interet",
      fenetreJours: 14,
      entree: ["sans-commande"],
      etapes: [attendre(2), email("email-parcours-savoir-faire"), attendre(7), email("email-parcours-conseil")],
      objectif: "achat",
      sortieSiConditions: true,
      exclusions: ["autre-parcours"],
    }),
  },
  {
    id: "panier",
    nom: "Panier non finalisé",
    pour: "Proposer de l’aide à une cliente connectée qui a laissé des pièces dans son panier.",
    note: "Seuls les paniers des clientes connectées qui ont accepté la personnalisation sont connus. Le site envoie déjà une relance unique après 4 heures : le parcours attend deux jours de plus.",
    definition: () => ({
      nom: "Panier non finalisé",
      declencheur: "panier",
      fenetreJours: 7,
      entree: ["compte", "panier"],
      etapes: [attendre(2), { id: id("c"), type: "condition", critere: "panier" }, email("email-parcours-panier")],
      objectif: "achat",
      sortieSiConditions: true,
      exclusions: ["autre-parcours"],
    }),
  },
  {
    id: "premiere-commande",
    nom: "Première commande",
    pour: "Remercier une nouvelle cliente, une fois sa pièce reçue et les e-mails de livraison partis.",
    note: "Commence trois semaines après la commande, après les e-mails de livraison, d’entretien et d’avis.",
    definition: () => ({
      nom: "Première commande",
      declencheur: "premiere-commande",
      fenetreJours: 30,
      entree: ["avec-commande"],
      etapes: [attendre(21), email("email-parcours-merci"), attendre(30), email("email-parcours-savoir-faire")],
      objectif: "aucun",
      sortieSiConditions: true,
      exclusions: ["autre-parcours"],
    }),
  },
  {
    id: "cliente",
    nom: "Cliente de la Maison",
    pour: "Garder le lien avec une cliente qui a déjà acheté, quelques semaines après sa dernière commande.",
    note: "L’e-mail « Nouvelles de l’atelier » est écrit : relisez-le avant d’activer le parcours.",
    definition: () => ({
      nom: "Cliente de la Maison",
      declencheur: "commande",
      fenetreJours: 30,
      entree: ["avec-commande"],
      etapes: [attendre(45), email("email-parcours-nouvelles")],
      objectif: "achat",
      sortieSiConditions: true,
      exclusions: ["autre-parcours"],
    }),
  },
];

export const modele = (m: string) => MODELES.find((x) => x.id === m) ?? null;
