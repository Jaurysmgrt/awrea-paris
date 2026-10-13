"use client";
/**
 * SIGNATURE 3 — Transitions drapées.
 * Entre deux pages, un pan de tissu noir monte depuis le bas de l'écran, ourlé d'un fil d'or,
 * couvre la page, puis poursuit sa course et découvre la page suivante.
 * Rendu par un shader OGL léger ; repli en fondu CSS si WebGL est indisponible ;
 * navigation immédiate si l'utilisateur préfère réduire les animations.
 *
 * Tous les liens internes du site en profitent : un écouteur global intercepte les clics.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loadGsap, prefersReducedMotion, dur } from "@/lib/motion";
import { palette, rgb01 } from "@/styles/tokens";

type Ctx = { navigate: (href: string) => void };
const TransitionContext = createContext<Ctx>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uLower;
uniform float uUpper;
uniform float uAmp;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uInk;
uniform vec3 uPearl;
uniform vec3 uGold;
void main() {
  float x = vUv.x;
  float y = vUv.y;
  float wave = sin(x * 7.5 + uTime * 1.6) * 0.045 + sin(x * 17.0 - uTime * 1.1) * 0.018 + sin(x * 3.1 + uTime * 0.7) * 0.03;
  float upper = uUpper + wave * uAmp;
  float lower = uLower + wave * uAmp * 0.85;
  float px = 1.5 / uRes.y;
  float inside = smoothstep(lower - px, lower + px, y) * (1.0 - smoothstep(upper - px, upper + px, y));
  if (inside <= 0.001) discard;
  // plis verticaux du drapé, qui ondulent avec le tissu
  float fold = sin(x * 38.0 + sin(x * 5.0 + uTime * 0.9) * 2.6 + y * 3.0);
  fold = pow(fold * 0.5 + 0.5, 4.0);
  float nearEdge = 1.0 - smoothstep(0.0, 0.22, upper - y);
  vec3 col = mix(uInk, uPearl, fold * 0.07 * uAmp + nearEdge * 0.05);
  // ourlet doré, le long des deux bords du tissu
  float hem = 2.2 * px;
  float hemU = 1.0 - smoothstep(hem * 0.5, hem, abs(y - upper + hem * 2.0));
  float hemL = 1.0 - smoothstep(hem * 0.5, hem, abs(y - lower - hem * 2.0));
  col = mix(col, uGold, max(hemU, hemL) * 0.95);
  gl_FragColor = vec4(col, inside);
}
`;

type GLState = {
  render: (lower: number, upper: number, amp: number, t: number) => void;
  resize: () => void;
  destroy: () => void;
};

async function createGL(canvas: HTMLCanvasElement): Promise<GLState | null> {
  try {
    const { Renderer, Program, Mesh, Triangle } = await import("ogl");
    const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, premultipliedAlpha: false, antialias: false });
    const gl = renderer.gl;
    if (!gl) return null;
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: {
        uLower: { value: -2 },
        uUpper: { value: -1 },
        uAmp: { value: 0 },
        uTime: { value: 0 },
        uRes: { value: [window.innerWidth, window.innerHeight] },
        uInk: { value: rgb01(palette.ink) },
        uPearl: { value: rgb01(palette.pearl) },
        uGold: { value: rgb01(palette.gold) },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      program.uniforms.uRes.value = [window.innerWidth, window.innerHeight];
    };
    resize();
    return {
      render(lower, upper, amp, t) {
        program.uniforms.uLower.value = lower;
        program.uniforms.uUpper.value = upper;
        program.uniforms.uAmp.value = amp;
        program.uniforms.uTime.value = t;
        renderer.render({ scene: mesh });
      },
      resize,
      destroy() {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      },
    };
  } catch {
    return null;
  }
}

export function DrapeTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<GLState | null | undefined>(undefined);
  const busy = useRef(false);
  const pending = useRef<{ href: string; path: string; resolve: () => void } | null>(null);
  const [active, setActive] = useState(false);
  const state = useRef({ lower: -1.2, upper: -0.2, amp: 0, t: 0 });

  const draw = useCallback(() => {
    const s = state.current;
    glRef.current?.render(s.lower, s.upper, s.amp, s.t);
  }, []);

  const ensureGL = useCallback(async () => {
    if (glRef.current !== undefined) return glRef.current;
    glRef.current = canvasRef.current ? await createGL(canvasRef.current) : null;
    return glRef.current;
  }, []);

  const cover = useCallback(async () => {
    setActive(true);
    const [{ gsap }, gl] = await Promise.all([loadGsap(), ensureGL()]);
    const d = dur("base") * 1.15;
    if (!gl) {
      await gsap.to(fallbackRef.current, { autoAlpha: 1, duration: d * 0.6, ease: "silk" });
      return;
    }
    const s = state.current;
    s.lower = -1.5;
    s.upper = -0.15;
    s.amp = 0;
    const tl = gsap.timeline({ onUpdate: draw });
    tl.to(s, { upper: 1.25, duration: d, ease: "drape" }, 0)
      .to(s, { amp: 1, duration: d * 0.5, ease: "silk" }, 0)
      .to(s, { amp: 0.25, duration: d * 0.5, ease: "silk" }, d * 0.5)
      .to(s, { t: "+=" + d * 2, duration: d, ease: "none" }, 0)
      .fromTo(markRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: d * 0.6, ease: "silk" }, d * 0.45);
    await tl;
  }, [draw, ensureGL]);

  const reveal = useCallback(async () => {
    const { gsap } = await loadGsap();
    const gl = glRef.current;
    const d = dur("base") * 1.2;
    if (!gl) {
      await gsap.to(fallbackRef.current, { autoAlpha: 0, duration: d * 0.6, ease: "silk" });
      setActive(false);
      return;
    }
    const s = state.current;
    const tl = gsap.timeline({ onUpdate: draw });
    tl.to(markRef.current, { autoAlpha: 0, y: -12, duration: d * 0.35, ease: "silk" }, 0)
      .to(s, { lower: 1.3, duration: d, ease: "drape" }, d * 0.1)
      .to(s, { amp: 1, duration: d * 0.45, ease: "silk" }, d * 0.1)
      .to(s, { amp: 0, duration: d * 0.55, ease: "silk" }, d * 0.55)
      .to(s, { t: "+=" + d * 2, duration: d * 1.1, ease: "none" }, 0);
    await tl;
    setActive(false);
  }, [draw]);

  const navigate = useCallback(
    async (href: string) => {
      const url = new URL(href, window.location.href);
      if (busy.current) return;
      if (prefersReducedMotion()) {
        router.push(url.pathname + url.search + url.hash);
        return;
      }
      busy.current = true;
      router.prefetch(url.pathname + url.search);
      await cover();
      await new Promise<void>((resolve) => {
        pending.current = { href, path: url.pathname, resolve };
        router.push(url.pathname + url.search + url.hash, { scroll: false });
        // sécurité : on découvre la page même si la route ne change pas
        window.setTimeout(resolve, 4000);
      });
      const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
      if (url.hash) document.querySelector(url.hash)?.scrollIntoView();
      else if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await reveal();
      busy.current = false;
    },
    [cover, reveal, router],
  );

  // la nouvelle page est rendue : on lève le tissu
  useEffect(() => {
    if (pending.current && pending.current.path === pathname) {
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
      if (url.pathname === window.location.pathname) return null; // ancres, filtres : pas de rideau
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
    const onResize = () => glRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      window.removeEventListener("resize", onResize);
    };
  }, [navigate, router]);

  useEffect(() => () => glRef.current?.destroy(), []);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div className="drape" data-active={active} aria-hidden="true">
        <canvas ref={canvasRef} className="drape__canvas" />
        <div ref={fallbackRef} className="drape__fallback" />
        {/* luxe discret : pas de monogramme ici, un simple fil d'or pendant que l'étoffe tombe */}
        <div ref={markRef} className="drape__mark">
          <span className="drape__thread" />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
