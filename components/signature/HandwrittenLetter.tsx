"use client";
/**
 * SIGNATURE 4 — La lettre de la créatrice.
 * Le texte de la créatrice apparaît au fil du scroll, en Fraunces italique (la police officielle
 * des titres, aucune police calligraphique) : chaque ligne est révélée de gauche à droite, puis la
 * signature et son paraphe se dessinent d'un trait fin, de la couleur du texte (blanc cassé en
 * mode Nuit). Sur petit écran, les lignes sont recoupées pour rester lisibles. Les largeurs sont
 * mesurées une fois la police chargée ; l'estimation de départ (0,4 em par caractère) suit la
 * chasse moyenne de Fraunces.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { dur, loadGsap, prefersReducedMotion } from "@/lib/motion";

const FS = 44; // taille de police dans l'espace SVG
const LH = 70; // hauteur de ligne SVG

function splitForMobile(lines: string[], max = 24): string[] {
  return lines.flatMap((l) => {
    if (l.length <= max) return [l];
    const mid = Math.floor(l.length / 2);
    let cut = l.lastIndexOf(" ", mid);
    const after = l.indexOf(" ", mid);
    if (cut < 0 || (after > 0 && after - mid < mid - cut)) cut = after;
    return cut > 0 ? [l.slice(0, cut), l.slice(cut + 1)] : [l];
  });
}

export function HandwrittenLetter({ lines, signature, label }: { lines: string[]; signature: string; label: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const shown = useMemo(() => (narrow ? splitForMobile(lines) : lines), [lines, narrow]);
  const [widths, setWidths] = useState<number[]>(() => shown.map((l) => l.length * FS * 0.4 + 24));
  const [sigWidth, setSigWidth] = useState(signature.length * FS * 1.3 * 0.42 + 40);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => setNarrow(el.clientWidth < 560);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // mesure réelle des lignes une fois la police chargée
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !root.current) return;
      const texts = Array.from(root.current.querySelectorAll<SVGTextElement>(".hw-line text"));
      setWidths(texts.map((t) => Math.ceil(t.getComputedTextLength()) + 24));
      const sig = root.current.querySelector<SVGTextElement>(".hw-sign text");
      if (sig) setSigWidth(Math.ceil(sig.getComputedTextLength()) + 40);
    });
    return () => {
      cancelled = true;
    };
  }, [shown]);

  const ref = Math.max(...widths, sigWidth, 1);

  // écriture au scroll
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.dataset.written = "true";
      return;
    }
    let ctx: { revert: () => void } | null = null;
    let cancelled = false;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 75%", end: "bottom 60%", scrub: dur() },
      });
      // écriture pilotée par le défilement : les « durées » ci-dessous ne sont que des proportions
      // (une ligne longue prend plus de défilement), et la plume avance d'un mouvement régulier
      el.querySelectorAll<SVGSVGElement>(".hw-line").forEach((svg) => {
        const w = Number(svg.dataset.w);
        const rect = svg.querySelector("rect");
        const nib = svg.querySelector("circle");
        tl.fromTo(rect, { attr: { width: 0 } }, { attr: { width: w }, ease: "none", duration: w / 400 }); // token-ok : proportion
        tl.fromTo(nib, { attr: { cx: 0 }, opacity: 1 }, { attr: { cx: w }, ease: "none", duration: w / 400 }, "<"); // token-ok : proportion
        tl.to(nib, { opacity: 0, duration: 0.05 }); // token-ok : proportion
      });
      const sign = el.querySelector<SVGSVGElement>(".hw-sign");
      if (sign) {
        const w = Number(sign.dataset.w);
        tl.fromTo(sign.querySelector("rect"), { attr: { width: 0 } }, { attr: { width: w }, ease: "none", duration: w / 300 }); // token-ok : proportion
        const flourish = sign.querySelector<SVGPathElement>("path");
        if (flourish) {
          const len = flourish.getTotalLength();
          tl.fromTo(flourish, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: "none", duration: 0.8 }); // token-ok : proportion
        }
      }
    }, el);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [widths, sigWidth]);

  return (
    <div ref={root} className="hw" data-written="false">
      <p className="sr-only">
        {label}{"\u00a0"}: {lines.join(" ")} {signature}
      </p>
      <div aria-hidden="true" className="hw__lines">
        {shown.map((line, i) => {
          const w = widths[i] ?? line.length * FS * 0.4;
          const id = `hw-clip-${i}`;
          return (
            <svg key={`${i}-${line}`} className="hw-line" data-w={w} viewBox={`0 0 ${w} ${LH}`} style={{ width: `${(w / ref) * 100}%` }}>
              <defs>
                <clipPath id={id}>
                  <rect x="0" y="0" height={LH} width={w} />
                </clipPath>
              </defs>
              <text x="12" y={LH * 0.68} fontSize={FS} clipPath={`url(#${id})`}>
                {line}
              </text>
              <circle cx="0" cy={LH * 0.62} r="3.2" className="hw-nib" opacity="0" />
            </svg>
          );
        })}
        <svg className="hw-sign" data-w={sigWidth} viewBox={`0 0 ${sigWidth} ${LH * 1.7}`} style={{ width: `${(sigWidth / ref) * 100}%` }}>
          <defs>
            <clipPath id="hw-clip-sign">
              <rect x="0" y="0" height={LH * 1.7} width={sigWidth} />
            </clipPath>
          </defs>
          <text x="20" y={LH * 0.95} fontSize={FS * 1.3} clipPath="url(#hw-clip-sign)">
            {signature}
          </text>
          <path d={`M24 ${LH * 1.25} C ${sigWidth * 0.3} ${LH * 1.05}, ${sigWidth * 0.55} ${LH * 1.5}, ${sigWidth - 24} ${LH * 1.12}`} className="hw-flourish" />
        </svg>
      </div>
    </div>
  );
}
