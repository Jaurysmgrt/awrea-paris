/**
 * LABORATOIRE — direction « dentelle » (DA 1), fiche produit de la robe Odessa.
 * La fiche est le dossier d'une pièce : la photographie et l'achat ; le patron annoté ; la
 * matière ; le carnet pratique ; la silhouette ; une chute de dentelle. L'achat reste à portée.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { LaceLoupe } from "@/components/signature/LaceLoupe";
import { getCollection, getLooks, getProduct, getProductsByHandles } from "@/lib/commerce";
import { editionInfo } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";
import { atelierMoments } from "@/content/fr/coulisses";
import { maison } from "@/content/fr/pages";
import { Lisiere } from "../_components/Lisiere";
import { Ourlet } from "../_components/Ourlet";
import { Ajour } from "../_components/Ajour";
import { Edition, Serie } from "../_components/Edition";
import { Achat, type MesuresTaille } from "../_components/Achat";
import { Croquis } from "../_components/Croquis";
import { Chute } from "../_components/Chute";
import { Curseur } from "../_components/Curseur";
import { Fil } from "../_components/Reseau";
import s from "../da-dentelle.module.css";

export const metadata: Metadata = { title: { absolute: "Robe Odessa — dentelle, laboratoire | Awrea Paris" } };

const HANDLE = "robe-odessa";

export default async function PieceDentelle() {
  const product = await getProduct(HANDLE);
  if (!product) notFound();
  const [collection, looks] = await Promise.all([getCollection(product.collection), getLooks()]);
  const look = looks.find((l) => l.hotspots.some((h) => h.product === product.handle));
  const [avec] = look ? await getProductsByHandles(look.hotspots.map((h) => h.product).filter((h) => h !== product.handle)) : [];
  const ed = editionInfo(product);
  const reference = product.variants[0]?.sku.replace(/-[A-Z]+$/, "");
  const categorie = { robe: "Robe", body: "Body", top: "Top", jupe: "Jupe", accessoire: "Accessoire" }[product.category];
  const traine = product.details.map((d) => d.match(/^Traîne de (\d+) cm$/)).find(Boolean)?.[1];

  // le guide des tailles de la Maison, rapporté à chaque taille de la pièce
  const mesures: MesuresTaille[] = product.variants.flatMap((v) => {
    const r = shop.sizeGuide.rows.find((row) => row[0] === v.size);
    return r ? [{ variantId: v.id, fr: r[1], poitrine: r[2], taille: r[3], hanches: r[4] }] : [];
  });

  // « Livraison et retours » : des phrases sobres, au moment où elles servent (liste noire C6)
  const offerte = product.price >= shop.freeShippingThreshold;
  const livraison = [
    `Les pièces prêtes partent de l’atelier sous ${shop.dispatchDays}${product.leadTimeWeeks ? ` ; une pièce sur commande est façonnée en ${product.leadTimeWeeks} semaines, puis expédiée` : ""}.`,
    offerte ? "Pour cette pièce, la livraison suivie vous est offerte en France et dans l’Union européenne." : "",
    `Vous disposez de ${shop.returnDays} jours pour nous la retourner, non portée, avec son certificat.`,
  ].filter(Boolean);

  // le détail inattendu : une chute de dentelle, et ce que la Maison en fait (content/fr/pages.ts)
  const devenir = maison.manifesto.points.map((p) => p.text.split(/\s;\s/)[1]).find((x) => x?.startsWith("les chutes"));
  const chute = `Une chute de dentelle, restée sur la table de coupe.${devenir ? ` À l’atelier, ${devenir}` : ""}`;

  return (
    <div className={`${s.page} ${s.pagePiece}`} data-theme="ivory">
      <Curseur />
      <Lisiere />

      {/* ------------------------------------------------ 1. LA PIÈCE ET L'ACHAT */}
      <section className={`${s.temps} ${s.fiche}`} aria-labelledby="piece-titre">
        <div className={`container ${s.grille} ${s.ficheGrille}`}>
          <figure className={s.ficheImage}>
            <div className={s.cordonnet} data-curseur-aw="">
              <Ajour ouverture>
                <Media image={product.images[0]} ratio="portrait" priority sizes="(min-width: 64rem) 45vw, (min-width: 48rem) 58vw, 100vw" />
              </Ajour>
            </div>
            <figcaption className={s.etiquette}>
              <span className={s.etiquetteTexte}>
                <span className="t-label">
                  {categorie} · Réf. {reference}
                </span>
                <span className={s.etiquetteNom}>{product.tagline}</span>
              </span>
            </figcaption>
          </figure>

          <div className={s.ficheAchat}>
            <Breadcrumbs items={[{ name: "Les pièces", path: "/boutique" }, { name: product.title, path: "/lab/da-dentelle/piece" }]} />
            <header className={s.ficheTitre}>
              {collection ? (
                <p className="eyebrow">
                  <Link href={`/collections/${collection.handle}`} className="link-plain">
                    {collection.title}
                  </Link>
                </p>
              ) : null}
              <h1 id="piece-titre" className="t-h2">
                {product.title}
              </h1>
            </header>

            <div className={s.editionBloc}>
              <div className={s.editionLigne}>
                <Edition product={product} />
                <p className={`${s.prix} ${s.sansJustif}`}>{formatPrice(product.price)}</p>
              </div>
              <Serie product={product} avecTexte />
            </div>

            <Achat product={product} mesures={mesures} delaiExpedition={shop.dispatchDays} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 2. LE PATRON */}
      <section className={s.temps} aria-labelledby="patron-titre">
        <div className={`container ${s.grille} ${s.patronGrille}`}>
          <div className={s.patronCroquis} data-curseur-aw="">
            <Croquis titre={`Croquis de la ${product.title.toLowerCase()}, de dos, annoté par l’atelier`} />
          </div>
          <div className={s.patronTexte}>
            <p className="eyebrow">Le patron</p>
            {traine ? (
              <p className={`${s.mesureGeante} ${s.sansJustif}`}>
                <span className="t-label">La traîne</span>
                <span className={s.mesureGeanteValeur}>
                  {traine}
                  <small> cm</small>
                </span>
              </p>
            ) : null}
            <h2 id="patron-titre" className="t-h2">
              Envelopper sans enfermer
            </h2>
            <div className={s.prose}>
              {product.description.map((d) => (
                <p key={d} className="t-body">
                  {d}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container" aria-hidden="true">
        <Fil />
      </div>

      {/* ------------------------------------------------ 3. LA MATIÈRE */}
      <section className={s.temps} aria-labelledby="matiere-titre">
        <div className={`container ${s.grille} ${s.matiereGrille}`}>
          {/* la loupe a son propre repère : pas de curseur monogramme ici ; la dentelle s'ajoure à son arrivée */}
          <div className={s.matiereLoupe}>
            <Ajour>
              <LaceLoupe image={product.detailImage} />
            </Ajour>
          </div>
          <div className={s.matiereTexte}>
            <p className="eyebrow">La matière</p>
            <h2 id="matiere-titre" className="t-h2">
              {atelierMoments.dentelle.title}
            </h2>
            <p className="t-body">{atelierMoments.dentelle.text}</p>
            <dl className={s.composition}>
              {product.materials.map((m) => (
                <div key={m.name}>
                  <dt>{m.name}</dt>
                  <dd className="price">{m.percent} %</dd>
                </div>
              ))}
              {product.lining ? (
                <div>
                  <dt>{product.lining.replace(/,\s*100 % soie\.?$/, "")}</dt>
                  <dd className="price">100 %</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4. LE CARNET PRATIQUE */}
      <section className={s.temps} aria-labelledby="carnet-titre">
        <div className={`container ${s.grille}`}>
          <div className={s.carnet}>
            <h2 id="carnet-titre" className={`t-h3 ${s.carnetTitre}`}>
              Le carnet de la pièce
            </h2>
            <div className={s.carnetLigne}>
              <h3 className="t-label">Coupe et taille</h3>
              <div>
                <p className="t-body">{product.fit}</p>
                {product.model ? <p className="t-body">{product.model}</p> : null}
              </div>
            </div>
            <div className={s.carnetLigne}>
              <h3 className="t-label">Entretien</h3>
              <div>
                <ul className="t-body">
                  {product.care.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={s.carnetLigne}>
              <h3 className="t-label">Livraison et retours</h3>
              <div>
                {livraison.map((l) => (
                  <p key={l} className="t-body">
                    {l}
                  </p>
                ))}
                <p className="t-body">
                  <Link href="/livraison-retours" className="text-link">
                    Toutes les conditions
                  </Link>
                </p>
              </div>
            </div>
            <div className={s.carnetLigne}>
              <h3 className="t-label">Le certificat</h3>
              <div>
                <p className="t-body">
                  {ed.unique ? "Cette pièce unique" : `Chaque exemplaire de la série de ${ed.total}`} reçoit son numéro et un certificat signé par la créatrice, glissé dans sa housse avec la pièce.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 5. LA SILHOUETTE (prolonger par le sens) */}
      {look && avec ? (
        <section className={s.temps} aria-labelledby="silhouette-titre">
          <div className={`container ${s.grille} ${s.silhouetteGrille}`}>
            <figure className={s.silhouetteImage} data-curseur-aw="">
              <Media image={look.image} ratio="look" sizes="(min-width: 64rem) 30vw, (min-width: 48rem) 50vw, 85vw" />
            </figure>
            <div className={s.silhouetteTexte}>
              <p className="eyebrow">La silhouette</p>
              <h2 id="silhouette-titre" className="t-h2">
                {look.title}
              </h2>
              <p className="t-body">{look.note}</p>
              <Link href={`/boutique/${avec.handle}`} className={s.silhouettePiece}>
                <span className={s.vignetteNom}>{avec.title}</span>
                <span className="price">
                  {editionInfo(avec).label} · {formatPrice(avec.price)}
                </span>
              </Link>
            </div>
            <aside className={s.chute} aria-label="Une chute de dentelle">
              <Chute texte={chute} />
            </aside>
          </div>
        </section>
      ) : null}

      <Ourlet />
    </div>
  );
}
