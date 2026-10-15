"use client";
/**
 * Charge l'éditeur à la demande : son code n'est jamais téléchargé par les visiteuses (le composant
 * n'est rendu que pour la créatrice connectée en mode Édition), ni dans le cadre de l'aperçu.
 */
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const EditionMode = dynamic(() => import("./EditionMode").then((m) => m.EditionMode), { ssr: false });

const noop = () => () => {};
/** vrai dans la page elle-même, faux dans le cadre de l'aperçu et au rendu serveur */
const isTopWindow = () => window.self === window.top && !new URLSearchParams(window.location.search).has("apercu");

export function EditionLoader(props: { base: string; email: string; guideDone: boolean }) {
  const top = useSyncExternalStore(noop, isTopWindow, () => false);
  return top ? <EditionMode {...props} /> : null;
}
