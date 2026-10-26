"use client";
/**
 * Charge l'éditeur à la demande : son code n'est jamais téléchargé par les visiteuses (le composant
 * n'est rendu que pour la créatrice connectée en mode Édition), ni dans le cadre de l'aperçu.
 */
import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";

const EditionMode = dynamic(() => import("./EditionMode").then((m) => m.EditionMode), { ssr: false });

const noop = () => () => {};
/** vrai sur une page du site elle-même ; faux dans le cadre de l'aperçu, dans l'Atelier et au rendu serveur */
const onSitePage = (base: string) => () =>
  window.self === window.top && !new URLSearchParams(window.location.search).has("apercu") && window.location.pathname !== base && !window.location.pathname.startsWith(`${base}/`);

export function EditionLoader(props: { base: string; email: string; guideDone: boolean }) {
  const show = useSyncExternalStore(noop, onSitePage(props.base), () => false);
  // dans le cadre de l'aperçu, la page se montre telle que le public la verra, sans le bandeau des cookies
  useEffect(() => {
    if (window.self !== window.top && new URLSearchParams(window.location.search).has("apercu")) document.documentElement.dataset.apercu = "1";
  }, []);
  return show ? <EditionMode {...props} /> : null;
}
