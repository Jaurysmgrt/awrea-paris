"use client";
/**
 * Carnet de croquis : des silhouettes au trait qui se dessinent au scroll
 * (tracés SVG, pathLength normalisé). Croquis provisoires, à remplacer par les scans
 * des carnets de la créatrice (ou à conserver comme ornement).
 */
import { useEffect, useRef } from "react";
import { loadGsap, prefersReducedMotion } from "@/lib/motion";

const SKETCHES: { title: string; paths: string[]; gold: string[] }[] = [
  {
    title: "Robe Odessa — dos lacé, traîne",
    paths: [
      "M100 14 C88 14 86 30 90 40 C93 47 107 47 110 40 C114 30 112 14 100 14 Z",
      "M96 8 C96 2 104 2 104 8",
      "M95 47 L94 60 M105 47 L106 60",
      "M94 60 C80 62 70 66 66 74 C62 100 60 130 63 162",
      "M106 60 C120 62 130 66 134 74 C138 100 140 130 137 162",
      "M72 76 C76 110 80 140 82 172 C84 205 80 245 75 285 C69 325 56 362 36 388",
      "M128 76 C124 110 120 140 118 172 C116 205 120 245 125 285 C131 325 146 362 168 390",
      "M36 388 C80 398 132 399 168 390",
      "M80 80 C90 94 110 94 120 80",
      "M88 236 C93 230 99 236 94 242 C89 248 83 242 88 236 Z M110 262 C115 256 121 262 116 268 C111 274 105 268 110 262 Z M80 300 C85 294 91 300 86 306 C81 312 75 306 80 300 Z M118 318 C123 312 129 318 124 324 C119 330 113 324 118 318 Z",
    ],
    gold: ["M95 84 L105 92 L95 100 L105 108 L95 116 L105 124 L95 132 L105 140"],
  },
  {
    title: "Body Gaïa — bustier, fil d’or",
    paths: [
      "M100 16 C89 16 87 31 91 40 C94 47 106 47 109 40 C113 31 111 16 100 16 Z",
      "M94 47 L92 66 M106 47 L108 66",
      "M70 82 C78 74 92 70 100 72 C108 70 122 74 130 82",
      "M70 82 C72 110 76 130 80 150 M130 82 C128 110 124 130 120 150",
      "M80 150 C92 156 108 156 120 150",
      "M80 150 C70 200 58 260 44 330 M120 150 C130 200 142 260 156 330",
      "M44 330 C80 342 120 342 156 330",
      "M92 160 C88 220 84 280 80 334 M108 160 C112 220 116 280 120 334",
      "M62 86 C56 110 54 136 58 160 M138 86 C144 110 146 136 142 160",
    ],
    gold: ["M70 84 C84 96 116 96 130 84"],
  },
  {
    title: "Top Kira — biais, ourlet asymétrique",
    paths: [
      "M100 14 C89 14 87 29 91 38 C94 45 106 45 109 38 C113 29 111 14 100 14 Z",
      "M96 45 L95 58 M104 45 L105 58",
      "M95 58 C80 60 68 64 62 72 C58 104 56 140 60 176",
      "M105 58 C120 60 132 64 138 72 C142 104 144 140 140 176",
      "M70 74 C72 120 74 160 76 200 L148 262",
      "M130 74 C128 110 126 140 124 170 C130 196 140 230 148 262",
      "M76 200 C70 250 72 300 74 360 M118 230 C120 280 122 320 124 360",
      "M70 360 L80 360 M118 360 L128 360",
    ],
    gold: ["M84 80 C96 100 108 112 124 120"],
  },
];

export function Sketchbook() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    let ctx: { revert: () => void } | null = null;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled) return;
    ctx = gsap.context(() => {
      el.querySelectorAll<SVGSVGElement>(".sketch svg").forEach((svg) => {
        const strokes = svg.querySelectorAll("path");
        gsap.fromTo(
          strokes,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, ease: "none", stagger: 0.12, scrollTrigger: { trigger: svg, start: "top 85%", end: "bottom 45%", scrub: 0.6 } },
        );
      });
    }, el);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={root} className="sketchbook">
      {SKETCHES.map((s) => (
        <figure key={s.title} className="sketch" data-reveal>
          <svg viewBox="0 0 200 400" role="img" aria-label={`Croquis : ${s.title}`}>
            {s.paths.map((d, i) => (
              <path key={i} d={d} pathLength={1} className="sketch__line" />
            ))}
            {s.gold.map((d, i) => (
              <path key={`g${i}`} d={d} pathLength={1} className="sketch__accent" />
            ))}
          </svg>
          <figcaption className="t-note t-center">{s.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}
