"use client";
import { useTexts } from "@/components/content/Texts";
import type { Image } from "@/lib/commerce/types";
import type { CatalogueTexts } from "@/lib/commerce/texts";

/**
 * Mention discrète « visuel provisoire » sous une image marquée provisoire (image générée en
 * attendant les photographies de la Maison) : transparence envers la cliente, jamais en surimpression.
 */
export function ProvisionalNote({ image, className }: { image?: Pick<Image, "provisoire"> | null; className?: string }) {
  const t = useTexts<CatalogueTexts>("catalogue");
  if (!image?.provisoire) return null;
  return (
    <span className={`visuel-provisoire t-note ${className ?? ""}`} title={t.visuelProvisoireDetail}>
      {t.visuelProvisoire}
    </span>
  );
}
