"use client";
/**
 * Empreinte de la visite, affichée sobrement au pied de page : les octets réellement
 * transférés depuis l'arrivée sur le site (Resource Timing), convertis en équivalent CO₂
 * avec le modèle Sustainable Web Design v4 (facteurs précalculés par CO2.js, voir
 * scripts/eco-constants.mjs). Hypothèse prudente : hébergement non certifié « vert ».
 * Recalculée chaque fois que le pied de page apparaît.
 */
import { useEffect, useRef, useState } from "react";
import constants from "@/lib/eco/constants.json";

const fmtMo = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmtG = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function transferredBytes(): number {
  const entries = [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")] as PerformanceResourceTiming[];
  return entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
}

export function EcoFootprint() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [bytes, setBytes] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof performance === "undefined") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setBytes(transferredBytes()));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const grams = bytes === null ? null : bytes * constants.gramsPerByteGrey;
  return (
    <p ref={ref} className="t-note eco-footprint">
      Site éco-conçu : pages légères, vidéos compressées, une seule graisse par caractère.
      {bytes !== null && grams !== null ? (
        <>
          {" "}
          Depuis votre arrivée : {fmtMo.format(bytes / 1e6)} Mo transférés, soit environ {fmtG.format(grams)} g d’équivalent CO₂.
        </>
      ) : null}
    </p>
  );
}
