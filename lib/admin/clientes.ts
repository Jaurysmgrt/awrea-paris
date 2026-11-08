/**
 * Clientes de l'Atelier (lot 3 de la refonte) : catégorie d'activité et recherche, en règles pures
 * partagées par les pages Clientes et les tests unitaires. La catégorie vient des seules commandes
 * réelles : rien n'est deviné.
 */
import { sansAccents } from "@/lib/admin/commandes";

export type CategorieActivite = "sans-commande" | "nouvelle" | "reguliere" | "fidele" | "inactive";

/** Au-delà d'un an sans commande, une cliente est inactive (quelle que soit son histoire). */
export const JOURS_INACTIVE = 365;

export const CATEGORIES: readonly { id: CategorieActivite; label: string; regle: string }[] = [
  { id: "nouvelle", label: "Nouvelles", regle: "une commande" },
  { id: "reguliere", label: "Régulières", regle: "deux ou trois commandes" },
  { id: "fidele", label: "Fidèles", regle: "quatre commandes ou plus" },
  { id: "inactive", label: "Inactives", regle: "aucune commande depuis un an" },
  { id: "sans-commande", label: "Sans commande", regle: "un compte, pas encore de commande" },
];

export const LIBELLE_CATEGORIE: Record<CategorieActivite, string> = {
  "sans-commande": "Sans commande",
  nouvelle: "Nouvelle",
  reguliere: "Régulière",
  fidele: "Fidèle",
  inactive: "Inactive",
};

export const estCategorie = (v: unknown): v is CategorieActivite => CATEGORIES.some((c) => c.id === v);

export function categorieActivite(c: { ordersCount: number; lastOrderAt: string | null }, maintenant: Date): CategorieActivite {
  if (c.ordersCount <= 0) return "sans-commande";
  const derniere = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : NaN;
  if (Number.isFinite(derniere) && maintenant.getTime() - derniere > JOURS_INACTIVE * 86_400_000) return "inactive";
  if (c.ordersCount === 1) return "nouvelle";
  return c.ordersCount <= 3 ? "reguliere" : "fidele";
}

interface ClienteCherchable {
  email: string;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
  lastOrderAt: string | null;
}

export function filtrerClientes<C extends ClienteCherchable>(clientes: readonly C[], f: { q?: string; categorie?: CategorieActivite | "toutes" }, maintenant: Date): C[] {
  const q = sansAccents(f.q ?? "");
  return clientes.filter((c) => {
    if (f.categorie && f.categorie !== "toutes" && categorieActivite(c, maintenant) !== f.categorie) return false;
    if (!q) return true;
    const champs = [c.email, c.firstName ?? "", c.lastName ?? ""].map(sansAccents).join(" ");
    return q.split(/\s+/).every((mot) => champs.includes(mot));
  });
}

export function compterParCategorie<C extends { ordersCount: number; lastOrderAt: string | null }>(clientes: readonly C[], maintenant: Date): Record<CategorieActivite, number> {
  const n = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategorieActivite, number>;
  for (const c of clientes) n[categorieActivite(c, maintenant)]++;
  return n;
}
