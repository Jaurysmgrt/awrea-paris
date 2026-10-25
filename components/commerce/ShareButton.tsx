"use client";
import { useState } from "react";
import { useTexts } from "@/components/content/Texts";
import { fill, type CatalogueTexts } from "@/lib/commerce/texts";

/**
 * Partager une pièce : la feuille de partage du téléphone quand elle existe, sinon le lien copié.
 * Aucun bouton de réseau social (ni script tiers) : la cliente choisit où l'envoyer.
 */
export function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
  const t = useTexts<CatalogueTexts>("catalogue").partage;
  const [status, setStatus] = useState("");
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus(t.copie);
    } catch {
      setStatus(fill(t.lien, { url }));
    }
  };
  return (
    <span className="share">
      <button type="button" className="link link--quiet t-label" onClick={share}>
        {t.bouton}
      </button>
      <span className="t-note share__status" role="status" aria-live="polite">
        {status}
      </span>
    </span>
  );
}
