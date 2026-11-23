"use client";
/**
 * Bouton d'ouverture de l'assistante. Seul ce bouton fait partie du chargement initial : la fenêtre
 * (et son code) n'est téléchargée qu'à l'approche de l'intention, survol ou focus du bouton, ou à
 * l'ouverture. Textes : document de contenu « assistante ».
 *
 * Il ne recouvre jamais le contenu (arbitrage de design n° 9, parcours UX du 23/11) : absent de la
 * commande, de sa confirmation et du compte ; ailleurs, il s'efface pendant la saisie d'un champ et
 * sur la fiche tant que la barre d'achat ou la colonne de la pièce sont à l'écran
 * (styles/signature.css), et le pied de page lui réserve sa hauteur.
 */
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useTexts } from "@/components/content/Texts";
import { stripLocale } from "@/lib/i18n/routing";

export type AssistantTexts = typeof import("@/content/site/fr/assistante.json");

const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });

/** Pages où la cliente remplit ses coordonnées ou paie : aucune distraction, rien de flottant. */
const SANS_ASSISTANTE = /^\/(?:commande|compte)(?:\/|$)/;
const assistanteMasquee = (pathname: string) => SANS_ASSISTANTE.test(stripLocale(pathname));

export function AssistantLauncher() {
  const t = useTexts<AssistantTexts>("assistante");
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  if (assistanteMasquee(pathname)) return null;

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
