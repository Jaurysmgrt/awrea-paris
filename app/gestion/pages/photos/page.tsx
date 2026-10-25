import Link from "@/components/ui/Link";
import { imageAt } from "@/lib/media";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { depositedPhotos, sitePhotos, type SitePhoto } from "@/lib/edition/photos";
import { TEXTES_PROVISOIRES as P } from "@/lib/edition/provisoires";
import styles from "./photos.module.css";

/**
 * Médiathèque de l'Atelier : chaque photo du site avec la page où elle paraît, le filtre « Photos
 * provisoires à remplacer » (visuels d'attente, pastille « Provisoire »), et les photos déposées
 * dans l'éditeur. Une photo se remplace sur sa page, en mode Édition (lib/edition/provisoires.ts).
 */
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const only = filtre === "provisoires";
  const photos = await sitePhotos();
  const provisional = photos.filter((p) => p.etat !== undefined);
  const site = photos.filter((p) => p.etat !== "a-publier");
  const shown = only ? provisional : site;
  const deposited = only ? [] : await depositedPhotos(photos);
  const open = (chemin: string) => `${atelierApi("/edition/entrer")}?chemin=${encodeURIComponent(chemin)}`;

  const card = (p: SitePhoto) => (
    <li key={p.id} className={styles.carte}>
      <div className={styles.vignette}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageAt(p.image.src, 480)} alt="" width={p.image.width} height={p.image.height} loading="lazy" />
        {p.provisoire ? <span className={`badge ${styles.pastille}`}>{P.pastille}</span> : null}
      </div>
      <div className={styles.texte}>
        <p className="t-label t-left">{p.label}</p>
        <p className="t-note t-left">{p.chemin ?? P.sansPage}</p>
        {p.image.alt ? <p className="t-note t-left">{p.image.alt}</p> : null}
        {p.etat === "a-publier" ? <p className="t-note t-left">{P.aPublier}</p> : null}
        {p.provisoire && p.origine === "piece" ? <p className="t-note t-left">{P.piece}</p> : null}
        {p.provisoire && p.origine === "collection" ? <p className="t-note t-left">{P.collection}</p> : null}
        {p.origine === "contenu" && p.chemin ? (
          <a className="link" href={open(p.chemin)}>
            {p.etat === "a-remplacer" ? P.remplacerSurPage : P.ouvrirEdition}
            <span className="sr-only">, {p.label}</span>
          </a>
        ) : null}
      </div>
    </li>
  );

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="t-note t-left">
          <a className="link" href={atelierHref("/pages")}>
            {P.retourPages}
          </a>
        </p>
        <h1 className="t-h1">{P.mediatheque}</h1>
        <p className="t-lead">{P.mediathequeIntro}</p>
      </header>

      <nav aria-label={P.filtrer}>
        <ul className={styles.filtres}>
          <li>
            <Link href={atelierHref("/pages/photos")} className={styles.filtre} aria-current={only ? undefined : "page"}>
              {P.toutes} · {site.length}
            </Link>
          </li>
          <li>
            <Link href={atelierHref("/pages/photos?filtre=provisoires")} className={styles.filtre} aria-current={only ? "page" : undefined}>
              {P.filtre} · {provisional.length}
            </Link>
          </li>
        </ul>
      </nav>

      <section className="panel stack" aria-labelledby="photos-liste">
        <h2 id="photos-liste" className="t-h3">
          {only ? P.filtre : P.surPages}
        </h2>
        {only ? <p className="t-note t-left">{P.intro}</p> : null}
        {shown.length ? <ul className={styles.grille}>{shown.map(card)}</ul> : <p className="t-note t-left">{P.aucune}</p>}
      </section>

      {only ? null : (
        <section className="panel stack" aria-labelledby="photos-deposees">
          <h2 id="photos-deposees" className="t-h3">
            {P.deposees}
          </h2>
          <p className="t-note t-left">{P.deposeesIntro}</p>
          {deposited.length ? (
            <ul className={styles.grille}>
              {deposited.map((m) => (
                <li key={m.id} className={styles.carte}>
                  <div className={styles.vignette}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageAt(m.src, 480)} alt="" width={m.width} height={m.height} loading="lazy" />
                    {m.provisoire ? <span className={`badge ${styles.pastille}`}>{P.pastille}</span> : null}
                  </div>
                  <div className={styles.texte}>
                    <p className="t-label t-left">{m.alt || m.name}</p>
                    <p className="t-note t-left">{m.pages.length ? `${P.paraitSur} : ${m.pages.map((x) => x.label).join(", ")}` : P.nulle}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-note t-left">{P.aucuneDeposee}</p>
          )}
        </section>
      )}
    </div>
  );
}
