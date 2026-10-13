import { formatPrice } from "@/lib/format";

/**
 * Prix sobre : le montant seul, sans prix barré ni pourcentage. La maison ne pratique pas la
 * promotion permanente ; une vente privée s'annonce par un texte, avec le prix de référence
 * exigé par la loi (le plus bas des trente derniers jours).
 */
export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={`price ${className ?? ""}`}>{formatPrice(amount)}</span>;
}
