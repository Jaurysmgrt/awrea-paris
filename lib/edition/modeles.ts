/**
 * Modèles de pages : une structure de départ faite de blocs de la bibliothèque, avec des repères
 * entre crochets à remplacer (jamais un texte inventé). Module pur.
 */
import { createBlock, TODO, type Block } from "@/lib/edition/blocks";
import type { Modele } from "@/lib/edition/documents";

const b = (type: string, fields: Record<string, unknown> = {}): Block => ({ ...createBlock(type)!, ...fields });

export function modelePage(modele: Modele, titre: string): Record<string, unknown> {
  const seo = { title: titre.slice(0, 50), description: TODO("Décrire la page en une phrase pour les moteurs de recherche") };
  if (modele === "evenement") {
    return {
      titre,
      chapeau: TODO("Dire en une phrase ce qui se passe, où et quand"),
      date: TODO("Date et heures, par exemple « samedi 14 mars, de 11 h à 19 h »"),
      lieu: TODO("Lieu et adresse"),
      sections: [b("grande-image"), b("texte"), b("galerie"), b("appel", { cta: { label: "Prendre rendez-vous", href: "/rendez-vous" } })],
      seo,
    };
  }
  if (modele === "article") {
    return {
      titre,
      chapeau: TODO("Écrire le chapeau de l’article"),
      rubrique: "Coulisses",
      sections: [b("grande-image"), b("texte"), b("citation"), b("texte"), b("pieces")],
      seo,
    };
  }
  return {
    titre,
    chapeau: TODO("Dire en une phrase ce qui relie les pièces"),
    sections: [b("grande-image", { hauteur: "plein-ecran" }), b("texte"), b("galerie"), b("croquis"), b("pieces")],
    seo,
  };
}
