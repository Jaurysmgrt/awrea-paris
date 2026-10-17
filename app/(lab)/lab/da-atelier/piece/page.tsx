/**
 * Laboratoire de design, direction « atelier » (DA 2) : la fiche de la robe Odessa.
 * La fiche est le dossier de la pièce, ouvert sur la table : le titre, la photographie en pièce
 * de patron et le cartouche (numéro, prix, taille, panier), puis le dos annoté, la matière, la
 * mesure en mètres rubans, le temps de façon en cotes, et la pièce qui l'accompagne.
 * L'achat reste simple : taille et « Ajouter au panier » dans le premier écran, puis la barre
 * d'achat (ProductForm, stickyBar), devenue une étiquette sur grand écran.
 * Textes : ../_components/textes.ts (futurs documents de l'éditeur Édition).
 */
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { ProductForm } from "@/components/commerce/ProductForm";
import { getCollection, getLooks, getProduct, getProductsByHandles } from "@/lib/commerce";
import type { Product } from "@/lib/commerce/types";
import { formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";
import { AtelierHeader } from "../_components/AtelierHeader";
import { AtelierFooter } from "../_components/AtelierFooter";
import { Stitch } from "../_components/Stitch";
import { PatronPhoto, type Repere } from "../_components/PatronPhoto";
import { EditionSerie } from "../_components/EditionSerie";
import { Swatch } from "../_components/Swatch";
import { LaceZoom } from "../_components/LaceZoom";
import { MetreRuban } from "../_components/MetreRuban";
import { FaconChain } from "../_components/FaconChain";
import { CroquisVide } from "../_components/CroquisVide";
import { HaloDesktop } from "../_components/HaloDesktop";
import { Feston } from "../_components/Traits";
import { MONOGRAM_CURSOR } from "../_components/cursor";
import { fiche as T } from "../_components/textes";
import { fr, nomCommun, phrase } from "../_components/typo";
import styles from "../da-atelier.module.css";

export const revalidate = 300;

const HANDLE = "robe-odessa";

/** Repères posés sur la photographie du dos (positions en % de l'image odessa-2), reliés à la fiche. */
const REPERES: { x: number; y: number; cherche: (p: Product) => string | undefined }[] = [
  { x: 61, y: 42, cherche: (p) => p.details.find((d) => /laçage/i.test(d)) },
  { x: 84, y: 46, cherche: (p) => p.details.find((d) => /manches/i.test(d)) },
  { x: 47, y: 45, cherche: (p) => p.lining },
  { x: 38, y: 72, cherche: (p) => p.materials.map((m) => `${m.percent} % ${m.name.toLowerCase()}`).join(", ") || undefined },
];
const LETTRES = ["A", "B", "C", "D"];
/** le mot de la créatrice, tiré de l'intention de collection (son carnet) */
const MOT = /La dentelle dit tout en cachant presque tout/;

export default async function AtelierFiche() {
  const product = await getProduct(HANDLE);
  if (!product) notFound();
  const [collection, looks] = await Promise.all([getCollection(product.collection), getLooks()]);
  const look = looks.find((l) => l.hotspots.some((h) => h.product === product.handle));
  const compagne = (await getProductsByHandles(look ? look.hotspots.map((h) => h.product).filter((h) => h !== product.handle) : product.completeTheLook.slice(0, 1)))[0];
  const intention = collection?.intention.find((t) => MOT.test(t));
  const motCreatrice = intention?.match(MOT)?.[0];

  const reperes: Repere[] = REPERES.map((r) => ({ x: r.x, y: r.y, texte: r.cherche(product) }))
    .filter((r): r is { x: number; y: number; texte: string } => Boolean(r.texte))
    .map((r, i) => ({ lettre: LETTRES[i], x: r.x, y: r.y, texte: phrase(r.texte) }));
  const traine = product.details.find((d) => /traîne/i.test(d));
  const matiere = product.materials[0]?.name.toLowerCase() ?? "";
  const heures = (product.trace?.steps ?? []).reduce((n, s) => n + (s.hours ?? 0), 0);
  const ref = product.variants[0]?.sku.replace(/-[A-Z]+$/, "");

  return (
    <div className={styles.page} style={{ "--da-curseur": MONOGRAM_CURSOR } as CSSProperties}>
      <AtelierHeader contentId="ouvrage" />

      {/* LA PIÈCE ET SON CARTOUCHE */}
      <Section theme="paper" id="ouvrage" className={styles.fiche} labelledBy="fiche-titre">
        <div className={`container ${styles.grid}`}>
          <div className={styles.ficheTete}>
            <Swatch image={product.detailImage} href="#matiere" matiere={fr(matiere)} />
            <p className={`eyebrow ${styles.ficheEyebrow}`}>
              {collection ? (
                <Link href={`/collections/${collection.handle}`} className="link-plain">
                  {collection.title}
                </Link>
              ) : null}
            </p>
            <h1 id="fiche-titre" className={styles.ficheTitre}>
              <Stitch text={product.title} />
            </h1>
            <p className={`t-left ${styles.ficheSousTitre}`}>{fr(product.tagline)}</p>
          </div>
          <PatronPhoto
            className={styles.fichePhoto}
            image={product.images[0]}
            priority
            sizes="(min-width: 64rem) 30vw, 100vw"
            vue="dos"
            droitFil
            cote={traine ? { from: 84, to: 97, texte: fr(traine) } : undefined}
            legende={collection ? fr(`${collection.title}, ${collection.season.toLowerCase()}`) : undefined}
          />
          <div className={styles.cartouche}>
            <EditionSerie product={product} size="fiche" aside={<p className={`price t-left ${styles.fichePrix}`}>{formatPrice(product.price)}</p>} />
            <div className={styles.ficheForm}>
              <ProductForm product={product} stickyBar />
            </div>
            <p className={`t-note ${styles.ficheNotice}`}>
              {fr(T.notice(shop.dispatchDays, product.leadTimeWeeks ?? 4, shop.returnDays))}{" "}
              <Link href="/livraison-retours" className="text-link">
                {T.noticeLien}
              </Link>
            </p>
            <div className={styles.ficheConseil}>
              <p className="t-note t-left">{T.conseil.question}</p>
              <Link href="/contact" className="link">
                {T.conseil.cta}
              </Link>
            </div>
            <p className={`t-label t-soft ${styles.ficheMention}`}>{T.mention(ref)}</p>
          </div>
        </div>
      </Section>

      {/* LE DOS, ANNOTÉ, ET LA FEUILLE QUI ATTEND LE CROQUIS */}
      <Section theme="paper" className={styles.planche} labelledBy="dos-titre">
        <Feston />
        <div className={`container ${styles.grid}`}>
          <header className={styles.plancheTete}>
            <p className="eyebrow">{T.dos.eyebrow}</p>
            <h2 id="dos-titre" className="t-h2">
              {T.dos.titre}
            </h2>
          </header>
          <PatronPhoto
            className={styles.planchePhoto}
            image={product.images[1] ?? product.images[0]}
            sizes="(min-width: 64rem) 30vw, 100vw"
            vue="dos"
            reperes={reperes}
            secret={motCreatrice ? { x: 60, y: 86, citation: `${motCreatrice}.`, signature: T.dos.signature } : undefined}
            legende={fr(`${product.title}, ${T.dos.legende}`)}
          />
          <CroquisVide piece={product.title} note={T.dos.croquisNote} />
          <div className={styles.plancheTexte}>
            {product.description.map((d) => (
              <p key={d} className="t-body">
                {phrase(d)}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* LA MATIÈRE */}
      <Section theme="ivory" id="matiere" className={styles.matiere} labelledBy="matiere-titre">
        <div className={`container ${styles.grid}`}>
          <header className={styles.matiereTete}>
            <p className="eyebrow">{T.matiere.eyebrow}</p>
            <h2 id="matiere-titre" className="t-h2">
              {T.matiere.titre}
            </h2>
          </header>
          <div className={styles.matiereZoom}>
            <LaceZoom image={product.detailImage} title={fr(T.matiere.grand(nomCommun(product.title)))} cta={T.matiere.cta} />
          </div>
          {product.video ? (
            <figure className={styles.matiereVideo}>
              <VideoLazy src={product.video.src} poster={product.video.poster} label={product.video.alt} className="media media--portrait" />
              <figcaption className="t-label t-soft">{T.matiere.tombe}</figcaption>
            </figure>
          ) : null}
          <div className={styles.matiereTexte}>
            <dl className={styles.fichePratique}>
              <div>
                <dt className="t-label">{T.matiere.composition}</dt>
                <dd className="t-body">{product.materials.map((m) => fr(`${m.percent} % ${m.name.toLowerCase()}`)).join(", ")}</dd>
              </div>
              {product.lining ? (
                <div>
                  <dt className="t-label">{T.matiere.doublure}</dt>
                  <dd className="t-body">{phrase(product.lining)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="t-label">{T.matiere.entretien}</dt>
                <dd>
                  <ol className={styles.soins}>
                    {product.care.map((c) => (
                      <li key={c} className="t-body">
                        {phrase(c)}
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      {/* LA MESURE */}
      <Section theme="pearl" className={styles.mesureSection} labelledBy="mesure-titre">
        <div className={`container ${styles.grid}`}>
          <header className={styles.mesureTete}>
            <p className="eyebrow">{T.mesure.eyebrow}</p>
            <h2 id="mesure-titre" className="t-h2">
              {T.mesure.titre}
            </h2>
          </header>
          <div className={styles.mesureRubans}>
            <MetreRuban product={product} />
          </div>
          <div className={styles.mesureTexte}>
            <p className="t-body">{phrase(product.fit)}</p>
            {product.model ? <p className="t-body">{phrase(product.model)}</p> : null}
            <p className="t-body">{phrase(shop.sizeGuide.note)}</p>
            <div className={styles.sectionCta}>
              <Link href="/contact#rendez-vous" className="link">
                {T.mesure.cta}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* LA FAÇON */}
      {product.trace ? (
        <Section theme="ink" className={styles.facon} labelledBy="facon-titre">
          <HaloDesktop intensity={0.8} />
          <div className={`container ${styles.grid}`}>
            <div className={styles.faconTete}>
              <p className="eyebrow">{T.facon.eyebrow}</p>
              {heures ? (
                <p className={`t-left ${styles.mesureGeante}`} aria-hidden="true">
                  {heures}
                  <span className={styles.mesureUnite}>h</span>
                </p>
              ) : null}
              <h2 id="facon-titre" className="t-h2">
                {T.facon.titre}
              </h2>
            </div>
            <div className={styles.faconChaine}>
              <FaconChain trace={product.trace} />
            </div>
            <figure className={styles.faconMedia}>
              <Media image={{ src: "/media/img/atelier-5", alt: T.facon.alt, width: 1200, height: 1500 }} ratio="look" sizes="(min-width: 64rem) 30vw, 100vw" />
              <figcaption className="t-label t-soft">{T.facon.legende}</figcaption>
            </figure>
            <div className={styles.faconTexte}>
              <p className="t-body">{T.facon.texte}</p>
              {product.trace.origins.length ? <p className="t-body">{phrase(product.trace.origins.map((o) => T.facon.origine(o.material, o.origin)).join(" "))}</p> : null}
              <div className={styles.sectionCta}>
                <Link href="/atelier" className="link">
                  {T.facon.cta}
                </Link>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* AVEC ODESSA */}
      {compagne && look ? (
        <Section theme="ivory" className={styles.suite} labelledBy="suite-titre">
          <Feston />
          <div className={`container ${styles.grid}`}>
            <div className={styles.suiteTexte}>
              <p className="eyebrow">{T.suite.eyebrow(product.title.replace(/^Robe /, ""))}</p>
              <h2 id="suite-titre" className="t-h2">
                {fr(look.title)}
              </h2>
              <p className="t-body">{phrase(look.note)}</p>
            </div>
            <div className={styles.suitePiece}>
              <div className={styles.suiteMedia} data-curseur>
                <Media image={compagne.images[0]} ratio="tall" sizes="(min-width: 64rem) 16vw, 40vw" />
              </div>
              <div className={styles.suiteInfo}>
                <h3 className={styles.rowTitle}>{compagne.title}</h3>
                <EditionSerie product={compagne} size="row" withPhrase={false} />
                <p className="price t-left">{formatPrice(compagne.price)}</p>
                <Link href={`/boutique/${compagne.handle}`} className="link">
                  {T.suite.cta(nomCommun(compagne.title))}
                </Link>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <AtelierFooter />
    </div>
  );
}
