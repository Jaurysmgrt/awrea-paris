"use client";
/**
 * Confirmation dans la page de l'Atelier, à la place de la fenêtre du navigateur (« localhost
 * indique… » sur iPhone ; parcours UX du 23/11) : la même question, dans la police et les boutons
 * de l'Atelier. Fenêtre modale (<dialog>) : Échap ou « Ne rien changer » répondent non, le focus
 * part sur le choix prudent et revient au bouton d'origine.
 *
 *   const { confirmer, fenetre } = useConfirmation();
 *   if (!(await confirmer("Effacer ce compte ? Ce geste ne se défait pas.", "Effacer le compte"))) return;
 *   …
 *   return <>{…}{fenetre}</>;
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Demande = { question: string; oui: string; resoudre: (ok: boolean) => void };

function Fenetre({ demande, fermer }: { demande: Demande; fermer: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const avant = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    return () => avant?.focus?.();
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirmation-atelier"
      role="alertdialog"
      aria-labelledby="confirmation-question"
      onCancel={(e) => {
        e.preventDefault();
        fermer(false);
      }}
    >
      <p id="confirmation-question" className="t-body t-left">
        {demande.question}
      </p>
      <div className="confirmation-atelier__gestes">
        <button type="button" className="btn" data-oui="" onClick={() => fermer(true)}>
          {demande.oui}
        </button>
        <button type="button" className="btn btn--outline" autoFocus onClick={() => fermer(false)}>
          Ne rien changer
        </button>
      </div>
    </dialog>
  );
}

export function useConfirmation() {
  const [demande, setDemande] = useState<Demande | null>(null);
  const confirmer = useCallback((question: string, oui = "Confirmer") => new Promise<boolean>((resoudre) => setDemande({ question, oui, resoudre })), []);
  const fermer = useCallback(
    (ok: boolean) => {
      demande?.resoudre(ok);
      setDemande(null);
    },
    [demande],
  );
  const fenetre = demande ? <Fenetre demande={demande} fermer={fermer} /> : null;
  return { confirmer, fenetre };
}
