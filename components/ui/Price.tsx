import { formatPrice } from "@/lib/format";

export function Price({ amount, compareAt, className }: { amount: number; compareAt?: number; className?: string }) {
  return (
    <span className={`price ${className ?? ""}`}>
      {compareAt && compareAt > amount ? (
        <del>
          <span className="sr-only">Prix initial </span>
          {formatPrice(compareAt)}
        </del>
      ) : null}
      {formatPrice(amount)}
    </span>
  );
}
