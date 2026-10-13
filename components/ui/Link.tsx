import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Lien interne du site. Pas de préchargement à l'apparition à l'écran (des dizaines de
 * requêtes inutiles sur mobile) : la transition drapée précharge la page à l'intention
 * — survol, focus clavier ou début de toucher — puis au clic.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
