import { formatPrice } from "@/lib/format";

/**
 * Prix sobre, au format des maquettes de la Maison (« 70,00 € ») : le montant seul, sans prix barré
 * ni pourcentage. La Maison ne pratique pas la promotion : une avant-première ou une présentation
 * privée annonce une collection par ses dates, jamais par un prix.
 * Jamais justifié (classe `price`).
 */
export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={`price ${className ?? ""}`}>{formatPrice(amount)}</span>;
}
