"use client";
/** Imprimer la page (certificats, bons de préparation). */
export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
