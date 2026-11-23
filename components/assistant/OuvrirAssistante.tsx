"use client";
/**
 * Lien « posez la question à l'assistante » écrit dans un texte (fenêtre « Trouver ma taille » de la
 * fiche) : il ferme la fenêtre qui le contient et ouvre l'assistante (AssistantLauncher écoute
 * l'événement OUVRIR_ASSISTANTE). Sur la fiche, le bouton flottant s'efface pour ne rien recouvrir :
 * ce lien reste le chemin vers elle.
 */
import type { ReactNode } from "react";

export const OUVRIR_ASSISTANTE = "awrea:ouvrir-assistante";

export function OuvrirAssistante({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="text-link"
      aria-controls="assistant-panel"
      onClick={(e) => {
        e.currentTarget.closest("dialog")?.close();
        window.dispatchEvent(new Event(OUVRIR_ASSISTANTE));
      }}
    >
      {children}
    </button>
  );
}
