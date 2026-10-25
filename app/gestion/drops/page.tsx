import Link from "@/components/ui/Link";
import { DropEditor } from "@/components/admin/DropEditor";
import type { AvantPremieresTexts } from "@/components/drops/regles";
import { getAllProducts } from "@/lib/commerce";
import { dropDateText, dropImages, dropLettersSent, dropPhase, dropSignups, listDrops } from "@/lib/drops";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { atelierHref } from "@/lib/admin/path";

/**
 * Avant-premières : la créatrice annonce la prochaine collection sur la page « Bientôt » (nom, texte,
 * images, pièces, dates), choisit d'écrire aux inscrites à la lettre, ou en fait une présentation
 * privée protégée par un mot de passe. Textes : content/site/fr/avant-premieres.json (atelier).
 */
export default async function AvantPremieresPage({ searchParams }: { searchParams: Promise<{ modifier?: string }> }) {
  const { modifier } = await searchParams;
  const [t, drops, products] = await Promise.all([getDoc<AvantPremieresTexts>("avant-premieres", "fr", { plain: true }), listDrops(), getAllProducts()]);
  const [signups, letters] = await Promise.all([Promise.all(drops.map((d) => dropSignups(d.slug))), Promise.all(drops.map((d) => dropLettersSent(d.slug)))]);
  const a = t.atelier;
  const editing = drops.find((d) => d.slug === modifier);
  const pieces = products.map((p) => ({ handle: p.handle, title: p.title }));
  const lettre = (n: number, prevue: boolean) => (n > 1 ? fill(a.liste.lettres, { n }) : n === 1 ? a.liste.lettreUne : prevue ? a.liste.lettrePrevue : null);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">{a.titre}</h1>
        <p className="t-lead">{a.chapeau}</p>
      </header>
      <section className="panel" aria-labelledby="avant-premieres-liste">
        <h2 id="avant-premieres-liste" className="t-h3">
          {a.liste.titre}
        </h2>
        {drops.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{a.liste.colonnes.collection}</th>
                  <th scope="col">{a.liste.colonnes.etat}</th>
                  <th scope="col">{a.liste.colonnes.avantPremiere}</th>
                  <th scope="col">{a.liste.colonnes.devoilement}</th>
                  <th scope="col">{a.liste.colonnes.inscrites}</th>
                  <th scope="col">{a.liste.colonnes.actions}</th>
                </tr>
              </thead>
              <tbody>
                {drops.map((d, i) => {
                  const note = d.privateSale ? a.liste.privee : lettre(letters[i], Boolean(d.notifyLetters));
                  return (
                    <tr key={d.slug}>
                      <th scope="row">
                        {d.title}
                        {note ? (
                          <>
                            <br />
                            <span className="t-note">{note}</span>
                          </>
                        ) : null}
                      </th>
                      <td>{a.liste.etats[dropPhase(d)]}</td>
                      <td>{dropDateText(t, d.earlyAccessAt)}</td>
                      <td>{dropDateText(t, d.publicAt)}</td>
                      <td>{d.privateSale ? a.liste.aucune : signups[i].length}</td>
                      <td>
                        <Link href={`/bientot/${d.slug}`} className="text-link">
                          {a.liste.voir}
                        </Link>
                        {" · "}
                        <Link href={atelierHref(`/drops?modifier=${d.slug}`)} className="text-link">
                          {a.liste.modifier}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">{a.liste.vide}</p>
        )}
      </section>
      <section className="panel" aria-labelledby="avant-premiere-formulaire">
        <h2 id="avant-premiere-formulaire" className="t-h3">
          {editing ? fill(a.formulaire.modifier, { collection: editing.title }) : a.formulaire.nouveau}
        </h2>
        <DropEditor
          key={editing?.slug ?? "nouveau"}
          pieces={pieces}
          t={{ ...a.formulaire, erreurs: a.erreurs }}
          drop={
            editing
              ? {
                  slug: editing.slug,
                  title: editing.title,
                  teaser: editing.teaser,
                  images: dropImages(editing),
                  products: editing.products,
                  earlyAccessAt: editing.earlyAccessAt,
                  publicAt: editing.publicAt,
                  privateSale: editing.privateSale,
                  notifyLetters: Boolean(editing.notifyLetters),
                  hasPassword: Boolean(editing.passwordHash),
                }
              : undefined
          }
        />
      </section>
    </div>
  );
}
