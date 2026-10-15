import Link from "@/components/ui/Link";
import { DropEditor } from "@/components/admin/DropEditor";
import { getAllProducts } from "@/lib/commerce";
import { dropPhase, dropSignups, listDrops } from "@/lib/drops";
import { atelierHref } from "@/lib/admin/path";

const PHASE = { bientot: "Annoncé", anticipe: "Accès anticipé en cours", ouvert: "Ouvert à toutes" } as const;
const paris = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Drops et lancements : page « Bientôt », accès anticipé des inscrites, ventes privées. */
export default async function DropsPage({ searchParams }: { searchParams: Promise<{ modifier?: string }> }) {
  const { modifier } = await searchParams;
  const [drops, products] = await Promise.all([listDrops(), getAllProducts()]);
  const signups = await Promise.all(drops.map((d) => dropSignups(d.slug)));
  const editing = drops.find((d) => d.slug === modifier);
  const pieces = products.map((p) => ({ handle: p.handle, title: p.title }));
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Drops</h1>
        <p className="t-lead">
          Annoncez une nouvelle série sur la page « Bientôt », ouvrez-la d’abord aux inscrites, puis à toutes. Une vente privée reste réservée aux personnes qui ont le mot de passe jusqu’à son ouverture.
        </p>
      </header>
      <section className="panel" aria-labelledby="drops-list">
        <h2 id="drops-list" className="t-h3">Séries annoncées</h2>
        {drops.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Série</th>
                  <th scope="col">État</th>
                  <th scope="col">Accès anticipé</th>
                  <th scope="col">Ouverture</th>
                  <th scope="col">Inscrites</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drops.map((d, i) => (
                  <tr key={d.slug}>
                    <th scope="row">
                      {d.title}
                      {d.privateSale ? <><br /><span className="t-note">Vente privée</span></> : null}
                    </th>
                    <td>{PHASE[dropPhase(d)]}</td>
                    <td>{paris(d.earlyAccessAt)}</td>
                    <td>{paris(d.publicAt)}</td>
                    <td>{d.privateSale ? "·" : signups[i].length}</td>
                    <td>
                      <Link href={`/bientot/${d.slug}`} className="text-link">Voir</Link> · <Link href={atelierHref(`/drops?modifier=${d.slug}`)} className="text-link">Modifier</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">Aucune série annoncée.</p>
        )}
      </section>
      <section className="panel" aria-labelledby="drop-form">
        <h2 id="drop-form" className="t-h3">{editing ? `Modifier « ${editing.title} »` : "Annoncer une série"}</h2>
        <DropEditor
          key={editing?.slug ?? "nouveau"}
          pieces={pieces}
          drop={editing ? { slug: editing.slug, title: editing.title, teaser: editing.teaser, image: editing.image, products: editing.products, earlyAccessAt: editing.earlyAccessAt, publicAt: editing.publicAt, privateSale: editing.privateSale, hasPassword: Boolean(editing.passwordHash) } : undefined}
        />
      </section>
    </div>
  );
}
