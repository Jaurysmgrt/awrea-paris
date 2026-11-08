"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useAtelier } from "./AtelierContext";

/**
 * Application privée de l'Atelier, côté navigateur : enregistre le service worker (portée limitée à
 * l'adresse de l'Atelier, mis à jour sans attendre), garde l'invitation à installer de Chrome et Edge
 * pour le bouton de la page « Application », et dit honnêtement quand le réseau manque.
 */
export type InviteInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __atelierInvite?: InviteInstallation | null;
  }
}

export const EVENEMENT_INVITE = "atelier:invite";

function abonnerReseau(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

export function AppAtelier() {
  const { base } = useAtelier();
  const enLigne = useSyncExternalStore(abonnerReseau, () => navigator.onLine, () => true);

  useEffect(() => {
    const garder = (e: Event) => {
      e.preventDefault();
      window.__atelierInvite = e as InviteInstallation;
      window.dispatchEvent(new Event(EVENEMENT_INVITE));
    };
    const installee = () => {
      window.__atelierInvite = null;
      window.dispatchEvent(new Event(EVENEMENT_INVITE));
    };
    window.addEventListener("beforeinstallprompt", garder);
    window.addEventListener("appinstalled", installee);
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/`, updateViaCache: "none" }).catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", garder);
      window.removeEventListener("appinstalled", installee);
    };
  }, [base]);

  return enLigne ? null : (
    <p className="atelier-reseau" role="status">
      Hors ligne : ce qui s’affiche peut dater, et rien ne s’enregistre tant que le réseau n’est pas revenu.
    </p>
  );
}
