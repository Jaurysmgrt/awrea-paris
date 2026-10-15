/**
 * Direction artistique « édition » : la page d'accueil, lue comme un numéro de revue.
 * La une, puis le sommaire face à l'édito, une double page par pièce (le numéro d'édition en
 * folio), le reportage de l'atelier, la lettre et le courrier, l'ours. Un message et un appel à
 * l'action par page ; le vide fait le rythme.
 */
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { LightHalo } from "@/components/signature/LightHalo";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { identity } from "@/content/brand/identity";
import { getCurrentCollection, getProductsByHandles } from "@/lib/commerce";
import { formatPrice, roman } from "@/lib/format";
import { Manchette } from "./_components/Manchette";
import { PremiereVisite } from "./_components/PremiereVisite";
import { CurseurMonogramme } from "./_components/CurseurMonogramme";
import { BoutonCourrier, FenetreCourrier } from "./_components/Courrier";
import { ChiffreEdition, Folio } from "./_components/Mise";
import { Ours } from "./_components/Ours";
import { chiffre, heuresDeFacon, legendeDeMode, tirage } from "./_components/donnees";
import { atelier, courrier, edito, lettre, numero, ours, portfolio, sommaire, une } from "./_components/textes";
import s from "./da-edition.module.css";

export const metadata: Metadata = { title: { absolute: "Direction « édition », la une | Laboratoire Awrea Paris" } };

const ACCUEIL = "/lab/da-edition";
/** dans le laboratoire, la robe Odessa ouvre la fiche de la direction ; les autres, celles du site */
const fiche = (handle: string) => (handle === "robe-odessa" ? `${ACCUEIL}/piece` : `/boutique/${handle}`);

export default async function EditionAccueil() {
  const collection = await getCurrentCollection();
  // le magasin local de démonstration contient une pièce ajoutée par les tests de l'agent
  // Catalogue (« Top Test … ») : le laboratoire ne montre que les pièces de la Maison
  const pieces = (await getProductsByHandles(collection?.products ?? [])).filter((p) => !/(^|-)test(-|$)/i.test(p.handle));
  const couverture = pieces.find((p) => p.handle === "robe-odessa") ?? pieces[0];
  const tir = tirage(pieces);
  const heures = couverture ? heuresDeFacon(couverture) : 0;
  const numAtelier = roman(pieces.length + 1);
  const numLettre = roman(pieces.length + 2);

  return (
    <>
      <PremiereVisite />
      <Manchette accueil={ACCUEIL} />

      {/* ---------------------------------------------------------------- LA UNE */}
      <section className={`${s.double} ${s.sansHaut}`} data-theme="ivory" aria-labelledby="une-titre">
        {collection ? (
          <figure className={`${s.fondPerdu} ${s.photoGauche} ${s.unePhoto} ${s.zoneCurseur}`} data-curseur="aw">
            <Media image={collection.cover} ratio="look" priority sizes="(min-width: 64rem) 45vw, 100vw" />
            {couverture ? (
              <figcaption className={`${s.legende} ${s.legendeDansLaMarge}`}>
                <span className="t-label">{une.enCouverture}</span> {legendeDeMode(couverture)}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
        <div className={`${s.droite} ${s.uneTete}`}>
          <h1 className="t-label">{une.h1}</h1>
          <span className={`t-label ${s.rubrique}`}>{numero.saison}</span>
        </div>
        <div className={`${s.droite} ${s.uneTexte}`}>
          <span className={`t-label ${s.uneEtiquette}`}>{une.etiquette}</span>
          <h2 id="une-titre" className={s.titreUne}>
            {numero.titre}
          </h2>
          <p className={`t-lead ${s.chapeau}`}>{une.chapeau}</p>
          {couverture ? (
            <Link href={fiche(couverture.handle)} className={`btn btn--solid ${s.uneCta}`}>
              {une.cta}
            </Link>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------- SOMMAIRE, FACE À L'ÉDITO */}
      <div className={`${s.double} ${s.sommaireEdito}`} data-theme="ivory">
        <nav id="sommaire" className={`${s.gauche} ${s.sommairePage}`} aria-labelledby="sommaire-titre">
          <span className={`t-label ${s.rubrique}`}>{sommaire.rubrique}</span>
          <h2 id="sommaire-titre" className={`t-h2 ${s.titreSection} ${s.apresTitre}`}>
            {sommaire.titre}
          </h2>
          <ol className={s.sommaireListe}>
            {pieces.map((p, i) => {
              const c = chiffre(p);
              return (
                <li key={p.handle}>
                  <a href={`#piece-${p.handle}`} className={s.sommaireLien}>
                    <span className={s.sommaireNum} aria-hidden="true">
                      {roman(i + 1)}
                    </span>
                    <span className={s.sommaireTitre}>{p.title}</span>
                    <span className={`t-label ${s.sommaireInfo}`}>
                      <span>{c.label}</span>
                      <span className="price">{formatPrice(p.price)}</span>
                    </span>
                  </a>
                </li>
              );
            })}
            <li>
              <a href="#atelier" className={s.sommaireLien}>
                <span className={s.sommaireNum} aria-hidden="true">
                  {numAtelier}
                </span>
                <span className={s.sommaireTitre}>{sommaire.atelier.titre}</span>
                <span className={`t-label ${s.sommaireInfo}`}>{sommaire.atelier.genre}</span>
              </a>
            </li>
            <li>
              <a href="#lettre" className={s.sommaireLien}>
                <span className={s.sommaireNum} aria-hidden="true">
                  {numLettre}
                </span>
                <span className={s.sommaireTitre}>{sommaire.lettre.titre}</span>
                <span className={`t-label ${s.sommaireInfo}`}>{sommaire.lettre.genre}</span>
              </a>
            </li>
          </ol>
        </nav>

        <section id="edito" className={`${s.droite} ${s.editoPage}`} data-theme="ink" aria-labelledby="edito-titre">
          <LightHalo />
          <span className={`t-label ${s.rubrique}`}>{edito.rubrique}</span>
          <h2 id="edito-titre" className={`t-h2 ${s.titreSection} ${s.apresTitre}`}>
            {edito.titre}
          </h2>
          <div className={`${s.paragraphes} ${s.apresTitre}`}>
            {edito.texte.map((t) => (
              <p key={t} className="t-body">
                {t}
              </p>
            ))}
          </div>
          <blockquote className={s.editoCitation}>
            <p className="t-left">
              {"«\u00a0"}
              {identity.founderQuote}
              {"\u00a0»"}
            </p>
            <footer className={`t-label ${s.editoSignature}`}>{identity.founderTitle}</footer>
          </blockquote>
          <p className={`t-label ${s.apresBloc}`}>
            <Link href={edito.cta.href} className="link">
              {edito.cta.label}
            </Link>
          </p>
        </section>
      </div>

      {/* ------------------------------------------- UNE DOUBLE PAGE PAR PIÈCE */}
      {pieces.map((p, i) => {
        const c = chiffre(p);
        const verso = i % 2 === 1;
        // la pièce de couverture montre ici sa seconde photographie : pas deux fois la même image
        const image = p.handle === couverture?.handle && p.images[1] ? p.images[1] : p.images[0];
        return (
          <section key={p.handle} id={`piece-${p.handle}`} className={`${s.double} ${s.pli} ${s.dentelleAuSurvol}`} data-theme="ivory" aria-labelledby={`titre-${p.handle}`}>
            <figure className={`${s.fondPerdu} ${verso ? s.photoDroite : s.photoGauche} ${s.piecePhoto} ${s.zoneCurseur}`} data-curseur="aw">
              <Media image={image} ratio="look" sizes="(min-width: 64rem) 45vw, 100vw" />
            </figure>
            <div className={`${verso ? s.gauche : s.droite} ${s.pieceTexte}`}>
              <div>
                <span className={`t-label ${s.rubrique}`}>
                  {portfolio.rubrique[p.category]}, {numero.titre}
                </span>
                <ChiffreEdition n={c.n} total={c.total} unique={c.unique} className={s.apresTitre} />
              </div>
              <div>
                <h2 id={`titre-${p.handle}`} className={`t-h2 ${s.titrePiece}`}>
                  {p.title}
                </h2>
                <p className={`t-lead ${s.chapeau}`}>{p.tagline}</p>
                <p className={`t-note ${s.legendeMode}`}>
                  <span className={`t-label ${s.ciContre}`}>{portfolio.ciContre}</span>
                  <span className={`t-label ${s.ciDessus}`}>{portfolio.ciDessus}</span> {legendeDeMode(p)}
                </p>
                <p className={`t-label ${s.apresTitre}`}>
                  <Link href={fiche(p.handle)} className="link">
                    {portfolio.voir[p.category]}
                    <span className="sr-only"> {p.title}</span>
                  </Link>
                </p>
              </div>
            </div>
            <Folio id={p.handle} numero={roman(i + 1)} titre={p.title} />
          </section>
        );
      })}

      {/* ------------------------------------------------------ REPORTAGE : L'ATELIER */}
      <section id="atelier" className={s.double} data-theme="ivory" aria-labelledby="atelier-titre">
        <figure className={s.fondPerdu}>
          <Media image={{ src: "/media/img/atelier-1", alt: atelier.alt, width: 1200, height: 800 }} ratio="auto" className={s.atelierPhoto} sizes="100vw" />
          <figcaption className={`${s.legende} ${s.legendeDansLaMarge}`}>{atelier.legende}</figcaption>
        </figure>
        {couverture && heures ? (
          <div className={s.gauche}>
            <span className={s.mesure}>{atelier.mesure(heures)}</span>
            <p className={`t-note t-left ${s.mesureLabel}`}>{atelier.mesureLabel(portfolio.un[couverture.category], couverture.title)}</p>
          </div>
        ) : null}
        <div className={s.droite}>
          <span className={`t-label ${s.rubrique}`}>{atelier.rubrique}</span>
          <h2 id="atelier-titre" className={`t-h2 ${s.titreSection} ${s.apresTitre}`}>
            {atelier.titre}
          </h2>
          <div className={`${s.paragraphes} ${s.apresTitre}`}>
            {atelier.texte.map((t) => (
              <p key={t} className="t-body">
                {t}
              </p>
            ))}
          </div>
          <p className={`t-label ${s.apresBloc}`}>
            <Link href={atelier.cta.href} className="link">
              {atelier.cta.label}
            </Link>
          </p>
        </div>
        <Folio id="atelier" numero={numAtelier} titre={sommaire.atelier.titre} />
      </section>

      {/* ------------------------------------------------ LA LETTRE, LE COURRIER */}
      <div id="lettre" className={`${s.double} ${s.pli}`} data-theme="ivory">
        <section className={s.gauche} aria-labelledby="lettre-titre">
          <span className={`t-label ${s.rubrique}`}>{lettre.rubrique}</span>
          <h2 id="lettre-titre" className={`t-h3 ${s.apresTitre}`}>
            {lettre.titre}
          </h2>
          <p className={`t-body ${s.apresTitre}`}>{lettre.texte}</p>
          <div className={s.apresBloc}>
            <NewsletterForm source="lab-edition" />
          </div>
        </section>
        <section id="courrier" className={s.droite} aria-labelledby="courrier-titre">
          <span className={`t-label ${s.rubrique}`}>{courrier.rubrique}</span>
          <h2 id="courrier-titre" className={`t-h3 ${s.apresTitre}`}>
            {courrier.titre}
          </h2>
          <p className={`t-body ${s.apresTitre}`}>{courrier.texte}</p>
          <BoutonCourrier label={courrier.cta} className={`btn ${s.courrierBouton}`} />
        </section>
        <Folio id="lettre" numero={numLettre} titre={sommaire.lettre.titre} />
      </div>

      <Ours id="accueil" detail={ours.tirage(tir.total, tir.reste)} />

      <CurseurMonogramme />
      <FenetreCourrier />
    </>
  );
}
