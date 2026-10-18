import { formatPrice } from "@/lib/format";

/**
 * Prix sobre, au format des maquettes de la Maison (« 70,00 € ») : le montant seul, sans prix barré
 * ni pourcentage. La Maison ne pratique pas la promotion permanente ; une vente privée s'annonce par
 * un texte, avec le prix de référence exigé par la loi (le plus bas des trente derniers jours).
 * Jamais justifié (classe `price`).
 */
export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={`price ${className ?? ""}`}>{formatPrice(amount)}</span>;
}
