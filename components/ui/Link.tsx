"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { localizeHref } from "@/lib/i18n/routing";

/**
 * Lien interne du site. Pas de préchargement à l'apparition à l'écran (des dizaines de
 * requêtes inutiles sur mobile) : la transition drapée précharge la page à l'intention
 * — survol, focus clavier ou début de toucher — puis au clic.
 *
 * Sous /en, l'adresse est préfixée (« /boutique » → « /en/boutique ») : la visiteuse reste dans sa
 * langue sans qu'aucun document de contenu ne change (lib/i18n/routing.ts).
 */
export default function Link({ prefetch = false, href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return <NextLink prefetch={prefetch} href={localizeHref(href, locale)} {...props} />;
}
