"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { nav } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { roman } from "@/lib/format";
import { GoldenLight } from "@/components/signature/GoldenLight";

/** Menu plein écran, sur fond noir et dentelle révélée par la lumière dorée. */
export function Menu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = document.getElementById("contenu");
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (open) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
      document.documentElement.classList.add("is-locked");
      (window as unknown as { __lenis?: { stop: () => void } }).__lenis?.stop();
      ref.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    } else {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      document.documentElement.classList.remove("is-locked");
      (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div id="site-menu" ref={ref} className="site-menu" data-theme="ink" data-open={open} aria-hidden={!open} inert={!open}>
      <GoldenLight className="site-menu__light" />
      <div className="site-menu__inner container">
        <nav aria-label="Menu" className="site-menu__primary">
          <ol>
            {nav.primary.map((l, i) => (
              <li key={l.href} style={{ "--i": i } as React.CSSProperties}>
                <Link href={l.href} onClick={onClose}>
                  <span className="site-menu__num t-label">{roman(i + 1)}</span>
                  <span className="site-menu__label">{l.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="site-menu__aside">
          <ul className="stack">
            {nav.secondary.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link link--quiet" onClick={onClose}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/compte" className="link link--quiet" onClick={onClose}>
                Mon compte
              </Link>
            </li>
            <li>
              <a href={identity.social.instagram} className="link link--quiet" target="_blank" rel="noopener noreferrer">
                Instagram {identity.social.instagramHandle}
              </a>
            </li>
          </ul>
          <p className="t-script site-menu__quote">{identity.tagline.replace(".", "")}</p>
        </div>
      </div>
    </div>
  );
}
