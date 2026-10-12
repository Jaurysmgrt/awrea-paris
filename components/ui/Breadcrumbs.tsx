import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";

/** Fil d'Ariane visible + BreadcrumbList Schema.org */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: "Accueil", path: "/" }, ...items];
  return (
    <nav aria-label="Fil d’Ariane">
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
      <JsonLd data={breadcrumbSchema(all)} />
    </nav>
  );
}
