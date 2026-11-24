"use client";
/**
 * Champs obligatoires d'un formulaire dits par la Maison, jamais par les bulles du navigateur
 * (parcours UX du 23/11) : le formulaire est en `noValidate`, chaque champ vide ou mal rempli reçoit
 * son message sous lui (`.field__error`, textes du document de contenu du formulaire), le curseur va
 * au premier, qui défile sous l'en-tête collant avec son libellé (`scroll-margin-top` de `.field` et
 * `.check`, styles/components.css). Même modèle que le formulaire de contact.
 */
import { useCallback, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type Champ = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const estChamp = (el: Element): el is Champ => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** Amène un champ à l'écran, libellé compris, et lui donne le curseur. */
export function allerAuChamp(el: HTMLElement) {
  el.focus({ preventScroll: true });
  (el.closest<HTMLElement>(".field, .check") ?? el).scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

export function useChampsManquants<N extends string>() {
  const [manquants, setManquants] = useState<Partial<Record<N, boolean>>>({});

  /** Vrai si tout est rempli ; sinon, les messages s'affichent et le curseur va au premier champ fautif. */
  const verifier = useCallback((form: HTMLFormElement, noms?: readonly N[]): boolean => {
    const fautifs = Array.from(form.elements)
      .filter(estChamp)
      .filter((el) => el.name && el.willValidate && !el.validity.valid && (!noms || noms.includes(el.name as N)));
    setManquants(Object.fromEntries(fautifs.map((el) => [el.name, true])) as Partial<Record<N, boolean>>);
    if (fautifs[0]) allerAuChamp(fautifs[0]);
    return fautifs.length === 0;
  }, []);

  /** Le message d'un champ disparaît dès que la cliente le corrige. */
  const effacer = useCallback((nom: N) => setManquants((m) => (m[nom] ? { ...m, [nom]: false } : m)), []);

  return { manquants, verifier, effacer };
}
