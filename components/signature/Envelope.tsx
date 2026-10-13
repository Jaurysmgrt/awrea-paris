"use client";
/**
 * SIGNATURE 8 — L'enveloppe.
 * À la confirmation de commande, une enveloppe ivoire scellée d'un cachet doré « AW »
 * s'ouvre : le cachet cède, le rabat se soulève, la lettre de remerciement glisse vers vous.
 */
import { useEffect, useRef } from "react";
import { loadGsap, prefersReducedMotion, dur } from "@/lib/motion";
import { Logo } from "@/components/brand/Logo";

export function Envelope({ greeting, note, reference }: { greeting: string; note: string; reference?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.dataset.state = "open";
      return;
    }
    let tl: { kill: () => void } | null = null;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled) return;
    const q = gsap.utils.selector(el);
    const d = dur("base");
    const timeline = gsap.timeline({ delay: 0.5, onComplete: () => (el.dataset.state = "open") });
    tl = timeline;
    timeline
      .set(el, { attr: { "data-state": "opening" } })
      .to(q(".envelope__seal"), { scale: 1.12, duration: d * 0.35, ease: "silk" })
      .to(q(".envelope__seal"), { scale: 0.6, autoAlpha: 0, rotate: -18, duration: d * 0.5, ease: "drape" })
      .to(q(".envelope__flap"), { rotateX: 180, duration: d * 1.1, ease: "drape" }, "-=0.15")
      .set(q(".envelope__flap"), { zIndex: 0 })
      // la lettre sort de l'enveloppe…
      .to(q(".envelope__letter"), { yPercent: -78, duration: d * 1.3, ease: "drape" }, "-=0.2")
      // …puis vient se poser devant, vers la lectrice
      .set(q(".envelope__letter"), { zIndex: 5 })
      .to(q(".envelope__letter"), { yPercent: -26, scale: 1.06, duration: d * 1.1, ease: "silk" });
    });
    return () => {
      cancelled = true;
      tl?.kill();
    };
  }, []);

  return (
    <div ref={root} className="envelope" data-state="closed" aria-hidden="true">
      <div className="envelope__body">
        <div className="envelope__back" />
        <div className="envelope__letter">
          <p className="envelope__greeting">{greeting}</p>
          <p className="envelope__note">{note}</p>
          {reference ? <p className="envelope__ref">{reference}</p> : null}
          <p className="envelope__sign">La Créatrice</p>
        </div>
        <div className="envelope__front">
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="envelope__lines">
            <path d="M0 0 L150 104 L300 0" vectorEffect="non-scaling-stroke" />
            <path d="M0 200 L120 92 M300 200 L180 92" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="envelope__flap" />
        <div className="envelope__seal">
          <Logo variant="monogram" className="envelope__seal-logo" />
        </div>
      </div>
    </div>
  );
}
