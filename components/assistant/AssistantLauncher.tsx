"use client";
/**
 * Bouton d'ouverture de l'assistante. Seul ce bouton fait partie du chargement initial : la fenêtre
 * (et son code) n'est téléchargée qu'à l'approche de l'intention, survol ou focus du bouton, ou à
 * l'ouverture. Textes : document de contenu « assistante ».
 */
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useTexts } from "@/components/content/Texts";

export type AssistantTexts = typeof import("@/content/site/fr/assistante.json");

const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });

export function AssistantLauncher() {
  const t = useTexts<AssistantTexts>("assistante");
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
        <span className="assistant-launcher__label">{open ? t.lanceur.fermer : t.lanceur.ouvrir}</span>
      </button>
      {mounted ? <AssistantPanel open={open} onClose={close} /> : null}
    </>
  );
}
