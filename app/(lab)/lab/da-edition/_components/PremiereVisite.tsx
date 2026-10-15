import { headers } from "next/headers";
import { cspEnabled, cspMode } from "@/lib/security/headers";

/**
 * Le monogramme de la manchette se dessine à la première visite seulement (MARQUE.md § 3, moins
 * de 2 s). Ce court script, lu avant la manchette, marque les visites suivantes et les animations
 * apaisées : le monogramme est alors affiché tout de suite, sans clignement. Il porte le nonce de
 * la page, comme le script de <head> du site (CSP stricte en production).
 */
export async function PremiereVisite() {
  const nonce = cspEnabled && cspMode === "strict" ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  const js = `try{var d=document.documentElement,k="awrea-monogramme-trace";if(localStorage.getItem(k)||d.dataset.motion==="reduce"||matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.awTrace="vu"}else{localStorage.setItem(k,"1")}}catch(e){document.documentElement.dataset.awTrace="vu"}`;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: js }} />;
}
