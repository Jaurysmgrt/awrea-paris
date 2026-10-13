"use client";
/**
 * Assistante clientes : fenêtre de discussion discrète, au design de la maison.
 * Conseils de taille et de style, matières, disponibilité, livraison, retours, suivi,
 * histoire de la marque — et transmission à l'atelier quand un humain est préférable.
 *
 * Seul le bouton d'ouverture fait partie du chargement initial : la fenêtre (et son code)
 * n'est téléchargée qu'à l'approche de l'intention — survol du bouton — ou à l'ouverture.
 */
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="assistant-launcher"
        data-open={open}
        aria-expanded={open}
        aria-controls="assistant-panel"
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={() => {
          setMounted(true);
          setOpen((v) => !v);
        }}
      >
        <span className="assistant-launcher__mark" aria-hidden="true" />
        <span className="assistant-launcher__label">{open ? "Fermer" : "Une question ?"}</span>
      </button>
      {mounted ? <AssistantPanel open={open} onClose={close} /> : null}
    </>
  );
}
