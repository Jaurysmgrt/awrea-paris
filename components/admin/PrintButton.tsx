"use client";
/** Imprimer la page (certificats, bons de préparation). */
export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <button type="button" className="btn btn--solid" onClick={() => window.print()}>
      {label}
    </button>
  );
}
