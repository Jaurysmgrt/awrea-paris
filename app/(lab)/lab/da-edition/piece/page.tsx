/**
 * Direction artistique « édition » : la fiche d'une pièce, présentée comme un sujet de magazine.
 * L'ouverture (la photographie à fond perdu face au titre et au bon de commande, le numéro d'édition
 * en folio), l'article, la planche d'atelier (croquis à venir, notes de patronage, fiche d'atelier),
 * le pratique, puis la page suivante du même numéro. L'achat reste en haut, visible sans clic.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { Logo } from "@/components/brand/Logo";
import { getCollection, getProduct, getProductsByHandles } from "@/lib/commerce";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { Manchette } from "../_components/Manchette";
import { PremiereVisite } from "../_components/PremiereVisite";
import { CurseurMonogramme } from "../_components/CurseurMonogramme";
import { FenetreCourrier } from "../_components/Courrier";
import { BonDeCommande } from "../_components/BonDeCommande";
import { ChiffreEdition, Folio } from "../_components/Mise";
import { Ours } from "../_components/Ours";
import { chiffre, heuresDeFacon, matieres, minutesDeLecture } from "../_components/donnees";
import { edition, fiche, portfolio } from "../_components/textes";
import s from "../da-edition.module.css";

export const metadata: Metadata = { title: { absolute: "Direction « édition », la fiche | Laboratoire Awrea Paris" } };

const ACCUEIL = "/lab/da-edition";
const HANDLE = "robe-odessa";

export default async function EditionPiece() {
  const product = await getProduct(HANDLE);
  if (!product) notFound();
  const collection = await getCollection(product.collection);
  const pieces = (await getProductsByHandles(collection?.products ?? [])).filter((p) => !/(^|-)test(-|$)/i.test(p.handle));
  const rang = pieces.findIndex((p) => p.handle === product.handle);
  const suivante = pieces.length > 1 ? pieces[(rang + 1) % pieces.length] : null;
  const c = chiffre(product);
  const folio = c.unique ? edition.unique : edition.folio(c.n, c.total);
  const heures = heuresDeFacon(product);
  const exergue = fiche.exergue[product.handle];
  const notes = [...product.details.filter((d) => !/certificat|série|pièce unique/i.test(d)), product.lining].filter((n): n is string => Boolean(n));
  const entretien = product.care.join(" ");
  const livraison = fiche.pratique.livraisonTexte(shop.dispatchDays, formatPrice(shop.freeShippingThreshold), shop.returnDays);
  const minutes = minutesDeLecture([product.tagline, ...product.description, product.fit, product.model, entretien, livraison, fiche.pratique.essayage, ...notes]);
  const legende = `${product.title}, ${matieres(product)}.${collection ? ` ${collection.title}, ${collection.season.toLowerCase()}.` : ""}`;
  const [photo, dos] = product.images;

  return (
    <>
      <PremiereVisite />
      <Manchette accueil={ACCUEIL} />

      {/* ------------------------------------------------------------ L'OUVERTURE */}
      <section className={`${s.double} ${s.sansHaut} ${s.dentelleAuSurvol}`} data-theme="ivory" aria-labelledby="piece-titre">
        <figure className={`${s.fondPerdu} ${s.fondPerduGauche} ${s.ouverturePhoto} ${s.zoneCurseur}`} data-curseur="aw">
          <Media image={photo} ratio="portrait" priority className={s.ouvertureMedia} sizes="(min-width: 64rem) 50vw, 100vw" />
          <figcaption className={`${s.legende} ${s.legendeDansLaMarge}`}>{legende}</figcaption>
        </figure>
        <div className={`${s.droite} ${s.ouvertureTexte}`}>
          <div>
            <p className="t-label">
              <span className={s.rubrique}>
                {fiche.rubrique}
                {collection ? (
                  <>
                    {", "}
                    <Link href={`/collections/${collection.handle}`} className={`link link--quiet ${s.retour}`}>
                      {collection.title}
                    </Link>
                  </>
                ) : null}
              </span>
            </p>
            <h1 id="piece-titre" className={`t-h1 ${s.apresTitre}`}>
              {product.title}
            </h1>
            <p className={`t-lead ${s.chapeau}`}>{product.tagline}</p>
            <BonDeCommande product={product} />
          </div>
          <ChiffreEdition n={c.n} total={c.total} unique={c.unique} />
        </div>
      </section>

      {/* ---------------------------------------------------------------- L'ARTICLE */}
      <section className={`${s.double} ${s.pli}`} data-theme="ivory" aria-labelledby="article-titre">
        <div className={s.gauche}>
          <span className={`t-label ${s.rubrique}`}>{fiche.article.rubrique}</span>
          <h2 id="article-titre" className={`t-h2 ${s.titreSection} ${s.apresTitre}`}>
            {fiche.article.titre(product.title)}
          </h2>
        </div>
        {exergue ? (
          <blockquote className={`${s.droite} ${s.exergueFace}`}>
            <p className={`t-left ${s.exergue}`}>{exergue}</p>
          </blockquote>
        ) : null}
        <div className={`${s.pleine} ${s.colonnes} ${s.colonnesSurLePli} ${s.paragraphes}`}>
          {product.description.map((d) => (
            <p key={d} className="t-body">
              {d}
            </p>
          ))}
        </div>
        {dos ? (
          <figure className={`${s.fondPerdu} ${s.photoGauche} ${s.zoneCurseur}`} data-curseur="aw">
            <Media image={dos} ratio="look" sizes="(min-width: 64rem) 45vw, 100vw" />
            <figcaption className={`${s.legende} ${s.legendeDansLaMarge}`}>{fiche.legendes.dos}</figcaption>
          </figure>
        ) : null}
        <figure className={`${s.fondPerdu} ${s.photoDroite} ${s.zoneCurseur}`} data-curseur="aw">
          <Media image={{ src: "/media/img/atelier-5", alt: fiche.legendes.atelierAlt, width: 1200, height: 1500 }} ratio="look" sizes="(min-width: 64rem) 45vw, 100vw" />
          <figcaption className={`${s.legende} ${s.legendeDroite}`}>{fiche.legendes.atelier}</figcaption>
        </figure>
        <Folio id="article" numero={folio} titre={fiche.article.rubrique} />
      </section>

      {/* ---------------------------------------------------- LA PLANCHE D'ATELIER */}
      <section className={`${s.double} ${s.pli}`} data-theme="pearl" aria-labelledby="planche-titre">
        <div className={s.pleine}>
          <span className={`t-label ${s.rubrique}`}>{fiche.planche.rubrique}</span>
          <h2 id="planche-titre" className={`t-h2 ${s.titreSection} ${s.apresTitre}`}>
            {fiche.planche.titre}
          </h2>
        </div>
        <div className={s.gauche}>
          <div className={s.feuilleCadre}>
            <div className={s.feuille}>
              <div className={s.feuilleTexte}>
                <Logo variant="monogram" decorative className={s.feuilleMonogramme} />
                <span className="t-label">{fiche.planche.feuilleNote}</span>
                <p className="t-note t-center">{fiche.planche.feuille}</p>
              </div>
            </div>
            <span className={`${s.coupe} ${s.coupeHG}`} aria-hidden="true" />
            <span className={`${s.coupe} ${s.coupeHD}`} aria-hidden="true" />
            <span className={`${s.coupe} ${s.coupeBG}`} aria-hidden="true" />
            <span className={`${s.coupe} ${s.coupeBD}`} aria-hidden="true" />
          </div>
          {notes.length ? (
            <>
              <h3 className={`t-label ${s.rubrique} ${s.apresBloc}`}>{fiche.planche.notes}</h3>
              <ul className={s.notes}>
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <div className={s.droite}>
          <h3 className="t-h3">{fiche.technique.titre}</h3>
          {heures ? (
            <div className={s.apresTitre}>
              <span className={s.mesure}>{fiche.technique.heures(heures)}</span>
              <p className={`t-note t-left ${s.mesureLabel}`}>{fiche.technique.mesureLabel}</p>
            </div>
          ) : null}
          <dl className={s.donnees}>
            <div>
              <dt className="t-label">{fiche.technique.matiere}</dt>
              <dd>{matieres(product)}</dd>
            </div>
            {product.lining ? (
              <div>
                <dt className="t-label">{fiche.technique.doublure}</dt>
                <dd>{product.lining}</dd>
              </div>
            ) : null}
            <div>
              <dt className="t-label">{fiche.technique.coupe}</dt>
              <dd>{product.fit}</dd>
            </div>
            {product.model ? (
              <div>
                <dt className="t-label">{fiche.technique.mannequin}</dt>
                <dd>{product.model}</dd>
              </div>
            ) : null}
            {product.trace?.steps.length ? (
              <div>
                <dt className="t-label">{fiche.technique.etapes}</dt>
                <dd>
                  <ol className={s.etapes}>
                    {product.trace.steps.map((st) => (
                      <li key={st.label}>
                        <span>{st.label}</span>
                        <span>{st.hours ? fiche.technique.heures(st.hours) : ""}</span>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <Folio id="planche" numero={folio} titre={fiche.planche.rubrique} />
      </section>

      {/* -------------------------------------------------------------- LE PRATIQUE */}
      <section className={`${s.double} ${s.pli}`} data-theme="ivory" aria-labelledby="pratique-titre">
        <div className={s.pleine}>
          <h2 id="pratique-titre" className={`t-h2 ${s.titreSection}`}>
            {fiche.pratique.rubrique}
          </h2>
        </div>
        <div className={s.gauche}>
          <h3 className={`t-label ${s.rubrique}`}>{fiche.pratique.entretien}</h3>
          <p className={`t-body ${s.apresTitre}`}>{entretien}</p>
        </div>
        <div className={s.droite}>
          <h3 className={`t-label ${s.rubrique}`}>{fiche.pratique.livraison}</h3>
          <div className={`${s.paragraphes} ${s.apresTitre}`}>
            <p className="t-body">{livraison}</p>
            <p className="t-body">{fiche.pratique.essayage}</p>
          </div>
          <p className={`t-label ${s.apresBloc}`}>
            <Link href={fiche.pratique.cta.href} className="link">
              {fiche.pratique.cta.label}
            </Link>
          </p>
        </div>
        <Folio id="pratique" numero={folio} titre={fiche.pratique.rubrique} />
      </section>

      {/* --------------------------------------------------------- PAGE SUIVANTE */}
      {suivante ? (
        <section className={`${s.double} ${s.pli} ${s.dentelleAuSurvol}`} data-theme="ivory" aria-labelledby="suite-titre">
          <div className={`${s.gauche} ${s.pieceTexte}`}>
            <div>
              <span className={`t-label ${s.rubrique}`}>
                {fiche.suite.rubrique}, {fiche.suite.titre.toLowerCase()}
              </span>
              <ChiffreEdition n={chiffre(suivante).n} total={chiffre(suivante).total} unique={chiffre(suivante).unique} className={s.apresTitre} />
            </div>
            <div>
              <h2 id="suite-titre" className={`t-h2 ${s.titrePiece}`}>
                {suivante.title}
              </h2>
              <p className={`t-lead ${s.chapeau}`}>{suivante.tagline}</p>
              <p className={`t-label ${s.apresTitre}`}>
                <Link href={`/boutique/${suivante.handle}`} className="link">
                  {portfolio.voir[suivante.category]}
                  <span className="sr-only"> {suivante.title}</span>
                </Link>
              </p>
            </div>
          </div>
          <figure className={`${s.texte} ${s.suitePhoto} ${s.zoneCurseur}`} data-curseur="aw">
            <Media image={suivante.images[0]} ratio="look" sizes="(min-width: 64rem) 30vw, 100vw" />
          </figure>
          <Folio id="suite" numero={folio} titre={fiche.suite.rubrique} />
        </section>
      ) : null}

      <Ours id="piece" detail={fiche.lecture(minutes, heures, portfolio.ce[product.category])} />

      <CurseurMonogramme />
      <FenetreCourrier />
    </>
  );
}
