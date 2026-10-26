import Link from "@/components/ui/Link";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { getDoc } from "@/lib/edition/read";
import { getLocale } from "@/lib/i18n/server";
import { stegaClean } from "@/lib/edition/stega";

type SiteTexts = typeof import("@/content/site/fr/site.json");

/** Fil d'Ariane visible + BreadcrumbList Schema.org, dans la langue de la page (document « site »). */
export async function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const [locale, site] = await Promise.all([getLocale(), getDoc<SiteTexts>("site")]);
  const t = site.filAriane;
  const all = [{ name: t.accueil, path: "/" }, ...items];
  return (
    <nav aria-label={t.nom}>
      <ol className="breadcrumb">
        {all.map((it, i) => (
          <li key={it.path}>
            {i === all.length - 1 ? (
              <span aria-current="page">{it.name}</span>
            ) : (
              <Link href={it.path} className="link-plain">
                {it.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbSchema(all.map((it) => ({ ...it, name: stegaClean(it.name) })), locale)} />
    </nav>
  );
}
