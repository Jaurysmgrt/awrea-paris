import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getCollections } from "@/lib/commerce";
import {
  catalogueModifiable,
  lirePiece,
  MESSAGE_LECTURE_SEULE,
} from "@/lib/commerce/atelier-catalogue";
import { LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";
import { LIBELLE_STATUT } from "@/lib/commerce/statut-pieces";
import { imageAt } from "@/lib/media";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { PieceEditor } from "@/components/admin/PieceEditor";
import { PieceGestes } from "@/components/admin/PieceGestes";
import { PieceTextes } from "@/components/admin/PieceTextes";

const CLASSE_STATUT = {
  "en-ligne": "status",
  brouillon: "status status--pending",
  archivee: "status status--info",
} as const;
const CATEGORIES = {
  robe: "Robe",
  body: "Body",
  top: "Top",
  jupe: "Jupe",
  accessoire: "Accessoire",
} as const;

/**
 * Fiche d'une pièce dans l'Atelier (refonte du 07/11, « Shopify simplifié ») : son statut et ses
 * gestes (mettre en ligne, en brouillon, archiver, dupliquer), son prix et son délai, ses textes,
 * ses photos. Une pièce en brouillon ou archivée n'est jamais visible sur le site.
 */
export default async function PiecePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(handle)) notFound();
  const [p, collections] = await Promise.all([
    lirePiece(handle),
    getCollections().catch(() => []),
  ]);
  if (!p) notFound();
  const collection = collections.find((c) => c.handle === p.collection)?.title;
  // Shopify sans accès Admin : la fiche se lit, et ne propose aucun geste qui échouerait
  const modifiable = catalogueModifiable();

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head piece-tete">
        <p className="t-note">
          <Link href={atelierHref("/catalogue")} className="text-link">
            Produits
          </Link>
        </p>
        <div className="piece-tete__titre">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageAt(p.images[0].src, 480)}
              alt=""
              width={72}
              height={96}
              className="produits__photo"
            />
          ) : null}
          <div className="stack-s">
            <h1 className="t-h1">{p.title}</h1>
            <p>
              <span className={CLASSE_STATUT[p.statut]}>
                {LIBELLE_STATUT[p.statut]}
              </span>
            </p>
          </div>
        </div>
        <p className="t-note">
          {p.statut === "en-ligne" ? (
            <Link href={`/boutique/${p.handle}`} className="text-link">
              Voir la pièce sur le site
            </Link>
          ) : modifiable ? (
            <>
              Vos clientes ne la voient pas.{" "}
              {/* lien simple, jamais préchargé : il ouvre le mode Édition (lib/commerce/apercu.ts) */}
              <a href={`${atelierApi("/edition/entrer")}?chemin=${encodeURIComponent(`/boutique/${p.handle}`)}`} className="text-link">
                Voir l’aperçu sur le site
              </a>
            </>
          ) : (
            "Visible sur le site une fois mise en ligne."
          )}
        </p>
        {modifiable ? (
          <PieceGestes handle={p.handle} title={p.title} statut={p.statut} />
        ) : (
          <p className="t-note">{MESSAGE_LECTURE_SEULE}</p>
        )}
      </header>

      {modifiable ? (
        <>
          <section className="panel" aria-labelledby="prix-title">
            <h2 id="prix-title" className="t-h3">
              Prix et délai
            </h2>
            <div className="table-scroll piece-reglages">
              <table className="table catalogue-table">
                <thead>
                  <tr>
                    <th scope="col">Pièce et tailles</th>
                    <th scope="col">Prix</th>
                    <th scope="col">Délai de fabrication</th>
                    <th scope="col">Pastille</th>
                    <th scope="col">
                      <span className="sr-only">Enregistrer</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <PieceEditor
                    bounds={LEAD_TIME_BOUNDS}
                    piece={{
                      handle: p.handle,
                      title: p.title,
                      image: p.images[0] ? imageAt(p.images[0].src, 480) : "",
                      price: p.price,
                      priceVaries: p.priceVaries,
                      priceProvisional: p.priceProvisional,
                      leadTime: p.leadTime,
                      leadTimeProvisional: p.leadTimeProvisional,
                      isNew: p.isNew,
                      sizes: p.sizes,
                    }}
                  />
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" aria-labelledby="textes-title">
            <h2 id="textes-title" className="t-h3">
              Textes
            </h2>
            <PieceTextes
              handle={p.handle}
              initial={{
                title: p.title,
                tagline: p.tagline,
                description: p.description.join("\n\n"),
                seoTitle: p.seo.title,
                seoDescription: p.seo.description,
              }}
            />
          </section>
        </>
      ) : null}

      <section className="panel" aria-labelledby="photos-title">
        <h2 id="photos-title" className="t-h3">
          Photos ({p.images.length})
        </h2>
        {p.images.length ? (
          <ul className="piece-photos">
            {p.images.map((im, i) => (
              <li key={`${im.src}-${i}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageAt(im.src, 480)}
                  alt={im.alt}
                  width={160}
                  height={213}
                  loading="lazy"
                />
                {im.provisoire ? (
                  <span className="t-note">Provisoire</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucune photo pour l’instant.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="infos-title">
        <h2 id="infos-title" className="t-h3">
          Informations
        </h2>
        <dl className="piece-infos">
          <div>
            <dt className="t-label">Catégorie</dt>
            <dd>{CATEGORIES[p.category]}</dd>
          </div>
          <div>
            <dt className="t-label">Collection</dt>
            <dd>{collection ?? "Aucune"}</dd>
          </div>
          <div>
            <dt className="t-label">Tailles</dt>
            <dd>{p.sizes.length ? p.sizes.join(", ") : "Aucune"}</dd>
          </div>
          <div>
            <dt className="t-label">Adresse sur le site</dt>
            <dd>/boutique/{p.handle}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
