"use client";
/**
 * Fiche d'une pièce d'un drop pas encore ouvert : tant que la visiteuse n'a pas d'accès (lien
 * d'accès anticipé ou mot de passe de la vente privée), l'ajout au panier laisse place à la date
 * d'ouverture. Simple confort d'affichage : le panier et la commande vérifient l'accès côté serveur.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "@/components/ui/Link";

export type DropInfo = { slug: string; title: string; earlyAccessAt: string; publicAt: string; privateSale: boolean };

const subscribe = (cb: () => void) => {
  const t = window.setInterval(cb, 30_000);
  return () => window.clearInterval(t);
};
const clock = () => Math.floor(Date.now() / 30_000) * 30_000;
const paris = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function DropGate({ drop, children }: { drop: DropInfo | null; children: React.ReactNode }) {
  const now = useSyncExternalStore(subscribe, clock, () => null);
  const [access, setAccess] = useState<"anticipe" | "prive" | null | undefined>(drop ? undefined : null);
  useEffect(() => {
    if (!drop) return;
    let alive = true;
    fetch(`/api/drops/${drop.slug}/acces`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { access: "anticipe" | "prive" | null }) => alive && setAccess(j.access))
      .catch(() => alive && setAccess(null));
    return () => {
      alive = false;
    };
  }, [drop]);
  if (!drop) return <>{children}</>;
  const open = now !== null && now >= Date.parse(drop.publicAt);
  const early = now !== null && now >= Date.parse(drop.earlyAccessAt);
  const allowed = open || (drop.privateSale ? access === "prive" : early && Boolean(access));
  if (allowed) return <>{children}</>;
  if (now === null || access === undefined) return <div className="drop-gate drop-gate--pending" aria-busy="true" />;
  return (
    <div className="drop-gate stack-s">
      <p className="t-label">{drop.privateSale ? "Vente privée" : "Bientôt"}</p>
      <p className="t-body">
        {drop.privateSale
          ? `Cette pièce est réservée à la vente privée ${drop.title} jusqu’au ${paris(drop.publicAt)}.`
          : early
            ? `Cette pièce est réservée aux inscrites jusqu’au ${paris(drop.publicAt)}.`
            : `Cette pièce ouvrira aux inscrites le ${paris(drop.earlyAccessAt)}, puis à toutes le ${paris(drop.publicAt)}.`}
      </p>
      <Link href={`/bientot/${drop.slug}`} className="link">
        {drop.privateSale ? "Entrer dans la vente privée" : "Réserver mon accès anticipé"}
      </Link>
    </div>
  );
}
