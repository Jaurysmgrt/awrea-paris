"use client";
/**
 * Transition entre les pages : un fondu blanc, court et discret (cahier des modifications du 27/10,
 * à la place du pan de tissu noir). Un voile blanc cassé (le noir de la nuit en mode Nuit) couvre
 * la page, la page suivante s'affiche dessous, puis le voile s'efface. Animé en opacité seulement :
 * le processeur graphique s'en charge, fluide sur téléphone. Navigation immédiate si l'utilisatrice
 * préfère réduire les animations.
 *
 * Tous les liens internes du site en profitent : un écouteur global intercepte les clics. Sous /en,
 * une adresse sans préfixe de langue y est ramenée (lib/i18n/routing.ts) : la visiteuse reste dans
 * sa langue. Le sélecteur de langue (data-no-transition) recharge la page.
 */
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { prefersReducedMotion, dur } from "@/lib/motion";
import { useLocale } from "@/components/providers/LocaleProvider";
import { localizePath, stripLocale } from "@/lib/i18n/routing";

type Ctx = { navigate: (href: string) => void };
const TransitionContext = createContext<Ctx>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const veil = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const pending = useRef<{ path: string; resolve: () => void } | null>(null);

  // le voile passe à l'état demandé ; la promesse se résout à la fin du fondu (ou par sécurité)
  const fade = useCallback(
    (state: "cover" | "idle") =>
      new Promise<void>((resolve) => {
        const el = veil.current;
        if (!el || el.dataset.state === state) return resolve();
        let timer = 0;
        const done = () => {
          el.removeEventListener("transitionend", done);
          window.clearTimeout(timer);
          resolve();
        };
        el.addEventListener("transitionend", done);
        timer = window.setTimeout(done, dur() * 1000 + 100);
        el.dataset.state = state;
      }),
    [],
  );

  const navigate = useCallback(
    async (href: string) => {
      const url = new URL(href, window.location.href);
      url.pathname = localizePath(url.pathname, locale);
      if (busy.current) return;
      if (prefersReducedMotion()) {
        router.push(url.pathname + url.search + url.hash);
        return;
      }
      busy.current = true;
      router.prefetch(url.pathname + url.search);
      await fade("cover");
      await new Promise<void>((resolve) => {
        pending.current = { path: url.pathname, resolve };
        router.push(url.pathname + url.search + url.hash, { scroll: false });
        // sécurité : on découvre la page même si la route ne change pas
        window.setTimeout(resolve, 4000);
      });
      const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
      if (url.hash) document.querySelector(url.hash)?.scrollIntoView();
      else if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await fade("idle");
      busy.current = false;
    },
    [fade, router, locale],
  );

  // la nouvelle page est rendue : le voile s'efface
  useEffect(() => {
    if (pending.current && stripLocale(pending.current.path) === stripLocale(pathname)) {
      pending.current.resolve();
      pending.current = null;
    }
  }, [pathname]);

  // interception globale des liens internes, et préchargement à l'intention
  // (survol, focus clavier, début de toucher) plutôt qu'à l'apparition à l'écran
  useEffect(() => {
    const prefetched = new Map<string, number>();
    const internalLink = (target: EventTarget | null) => {
      const a = (target as HTMLElement | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return null;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      if (url.pathname === window.location.pathname) return null; // ancres, filtres : pas de fondu
      if (/\.(txt|xml|pdf|json)$/.test(url.pathname) || url.pathname.startsWith("/api/")) return null;
      return url;
    };
    const onIntent = (e: Event) => {
      const url = internalLink(e.target);
      if (!url) return;
      const key = url.pathname + url.search;
      const now = Date.now();
      if (now - (prefetched.get(key) ?? 0) < 60_000) return;
      prefetched.set(key, now);
      router.prefetch(key);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = internalLink(e.target);
      if (!url) return;
      // preventDefault sans stopPropagation : les onClick des liens (fermer le panier, le menu…)
      // s'exécutent toujours, et next/link renonce à naviguer puisque l'événement est déjà « prévenu ».
      e.preventDefault();
      navigate(url.href);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, [navigate, router]);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div ref={veil} className="page-fade" data-state="idle" aria-hidden="true" />
    </TransitionContext.Provider>
  );
}
