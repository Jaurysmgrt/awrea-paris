import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { identity } from "@/content/brand/identity";
import { Logo } from "@/components/brand/Logo";

type AccesPrive = typeof import("@/content/site/fr/acces-prive.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<AccesPrive>("acces-prive", { plain: true });
  return { title: t.titre, description: t.texte, robots: { index: false, follow: false } };
}

/**
 * Page d'attente du site privé (SITE_PRIVE=1, lib/security/private-site.ts) : ce que voit une
 * visiteuse tant que la Maison n'a pas ouvert le site. Le logo, un mot, l'adresse de contact ;
 * aucun lien vers le reste du site.
 */
export default async function AccesPrivePage() {
  const t = await getDoc<AccesPrive>("acces-prive");
  return (
    <main id="contenu" className="acces-prive">
      <Logo className="acces-prive__logo" />
      <h1 className="t-display">{t.titre}</h1>
      <p className="t-lead t-center">{t.texte}</p>
      <a className="link" href={`mailto:${identity.email}`}>
        {t.contact}
      </a>
    </main>
  );
}
