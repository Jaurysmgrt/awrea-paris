"use client";
/**
 * Cloudflare Turnstile (anti-robots) : invisible pour les visiteuses humaines, il ne s'affiche
 * que si une vérification est nécessaire. Le script n'est chargé qu'au premier geste dans le
 * formulaire (focus), pour ne rien coûter au chargement des pages.
 * Sans clé publique (NEXT_PUBLIC_TURNSTILE_SITE_KEY), le composant ne rend rien.
 */
import { useEffect, useEffectEvent, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let loading: Promise<void> | null = null;
function loadScript() {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Le jeton est aussi ajouté au formulaire (champ « cf-turnstile-response »). */
export function Turnstile({ action, onToken }: { action: string; onToken?: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const emit = useEffectEvent((token: string | null) => onToken?.(token));

  useEffect(() => {
    const el = ref.current;
    const form = el?.closest("form");
    if (!SITE_KEY || !el || !form) return;
    let widget: string | null = null;
    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      await loadScript().catch(() => null);
      if (!window.turnstile || !ref.current) return;
      widget = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        action,
        appearance: "interaction-only",
        language: document.documentElement.lang || "fr",
        callback: (t: string) => emit(t),
        "expired-callback": () => emit(null),
        "error-callback": () => emit(null),
      });
    };
    form.addEventListener("focusin", start, { once: true });
    form.addEventListener("pointerdown", start, { once: true });
    return () => {
      form.removeEventListener("focusin", start);
      form.removeEventListener("pointerdown", start);
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [action]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="turnstile" />;
}
