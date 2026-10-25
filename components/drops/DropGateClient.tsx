"use client";
/**
 * Partie cliente de la porte d'une pièce pas encore dévoilée (voir DropGate.tsx) : lit l'accès de
 * la visiteuse (cookie signé, httpOnly, lu par /api/drops/[slug]/acces) et l'heure, puis montre
 * soit l'ajout au panier, soit le texte de la collection et le lien vers la page « Bientôt ».
 * Aucun compte à rebours : l'heure n'est relue que toutes les 30 secondes, pour ouvrir l'ajout au
 * panier à l'heure dite sans recharger la page.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "@/components/ui/Link";
import { accessAllows, phaseOf, type DropAccess } from "./regles";
import s from "./avant-premieres.module.css";

export type DropInfo = { slug: string; title: string; earlyAccessAt: string; publicAt: string; privateSale: boolean };

type Raison = "annonce" | "avantPremiere" | "privee";
export type DropGateTexts = {
  etat: Record<Raison, string>;
  message: Record<Raison, string>;
  lien: { avantPremiere: string; privee: string };
};

const subscribe = (cb: () => void) => {
  const t = window.setInterval(cb, 30_000);
  return () => window.clearInterval(t);
};
const clock = () => Math.floor(Date.now() / 30_000) * 30_000;

export function DropGateClient({ drop, t, children }: { drop: DropInfo; t: DropGateTexts; children: React.ReactNode }) {
  const now = useSyncExternalStore(subscribe, clock, () => null);
  const [access, setAccess] = useState<DropAccess | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch(`/api/drops/${encodeURIComponent(drop.slug)}/acces`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { access: DropAccess | null }) => alive && setAccess(j.access ?? null))
      .catch(() => alive && setAccess(null));
    return () => {
      alive = false;
    };
  }, [drop.slug]);

  if (now !== null && accessAllows(drop, access, now)) return <>{children}</>;
  if (now === null || access === undefined) return <div className={`drop-gate drop-gate--pending ${s.porte} ${s.porteAttente}`} aria-busy="true" />;
  const raison: Raison = drop.privateSale ? "privee" : phaseOf(drop, now) === "bientot" ? "annonce" : "avantPremiere";
  return (
    <div className={`drop-gate ${s.porte}`}>
      <p className="t-label">{t.etat[raison]}</p>
      <p className="t-body">{t.message[raison]}</p>
      <p>
        <Link href={`/bientot/${drop.slug}#acces`} className="link">
          {drop.privateSale ? t.lien.privee : t.lien.avantPremiere}
        </Link>
      </p>
    </div>
  );
}
