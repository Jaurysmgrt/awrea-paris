"use client";
/**
 * « Le courrier » : l'accès à l'assistante de la Maison, comme la rubrique des lettres d'une
 * revue (arbitrage n° 9 : plus de bulle flottante). Plusieurs boutons peuvent l'ouvrir (manchette,
 * page « Le courrier ») ; une seule fenêtre est montée, à la première demande.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const loadPanel = () => import("@/components/assistant/AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });
const EVENT = "edition:courrier";

/** Bouton d'ouverture : un mot, jamais une pastille. */
export function BoutonCourrier({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      aria-controls="assistant-panel"
      aria-haspopup="dialog"
      onPointerEnter={() => void loadPanel()}
      onFocus={() => void loadPanel()}
      onClick={(e) => window.dispatchEvent(new CustomEvent(EVENT, { detail: e.currentTarget }))}
    >
      {label}
    </button>
  );
}

/** La fenêtre de l'assistante, montée une seule fois par page. */
export function FenetreCourrier() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const origin = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      origin.current = (e as CustomEvent<HTMLElement>).detail ?? null;
      setMounted(true);
      setOpen(true);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    origin.current?.focus();
  }, []);

  return mounted ? <AssistantPanel open={open} onClose={close} /> : null;
}
