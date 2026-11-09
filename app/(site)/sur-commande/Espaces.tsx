"use client";
/**
 * L'engagement, le suivi et le conseil, en une seule composition (brief de la créatrice du 09/11) :
 * trois colonnes séparées de filets fins sur ordinateur ; sur téléphone et tablette, un carrousel
 * horizontal (défilement natif, aimanté) avec trois points discrets pour passer de l'un à l'autre.
 * Chaque espace garde sa destination (la démarche, le suivi des commandes, le rendez-vous) ; le lien
 * est typographique, souligné d'un filet, avec une petite flèche.
 * Sans JavaScript, le carrousel défile au doigt et les liens fonctionnent. Animations apaisées : les
 * points font défiler sans glissement.
 */
import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { fill } from "@/lib/edition/fill";
import { prefersReducedMotion } from "@/lib/motion";
import s from "./espaces.module.css";

export interface Espace {
  numero: string;
  nom: string;
  titre: string;
  texte: string;
  lien: { label: string; href: string };
}

export function Espaces({ liste, titre, navigation, officiel }: { liste: Espace[]; titre: string; navigation: { aller: string }; officiel?: boolean }) {
  const piste = useRef<HTMLUListElement>(null);
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const el = piste.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActif(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    for (const li of el.children) io.observe(li);
    return () => io.disconnect();
  }, []);

  const aller = (i: number) => {
    const el = piste.current;
    const cible = el?.children[i] as HTMLElement | undefined;
    if (!el || !cible) return;
    el.scrollTo({ left: cible.offsetLeft - el.offsetLeft, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className={s.espaces}>
      <ul ref={piste} className={s.piste} tabIndex={0} aria-label={titre}>
        {liste.map((e, i) => (
          <li key={e.numero} className={s.espace} data-index={i} data-officiel={officiel ? "" : undefined}>
            <p className={`t-label ${s.nom}`}>
              <span className={s.numero}>{e.numero}</span> {e.nom}
            </p>
            <h3 className="t-h4">{e.titre}</h3>
            <p className="t-note t-left">{e.texte}</p>
            <Link href={e.lien.href} className={s.lien}>
              <span>{e.lien.label}</span>
              <svg className={s.fleche} viewBox="0 0 24 8" aria-hidden="true" focusable="false">
                <path d="M0 4h22M18.5 0.5 22 4l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
      <div className={s.points}>
        {liste.map((e, i) => (
          <button key={e.numero} type="button" className={s.point} aria-label={fill(navigation.aller, { n: String(i + 1) })} aria-current={i === actif ? "true" : undefined} onClick={() => aller(i)} />
        ))}
      </div>
    </div>
  );
}
