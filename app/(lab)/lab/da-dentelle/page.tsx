/**
 * LABORATOIRE — direction « dentelle » (DA 1), page d'accueil.
 * Un récit court en cinq temps, un message et un appel par temps ; le blanc est le jour de la
 * dentelle. Proposition décrite dans docs/equipes/design/proposition-da-dentelle.md.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { LightHalo } from "@/components/signature/LightHalo";
import { getCurrentCollection, getProduct, getProductsByHandles } from "@/lib/commerce";
import { editionInfo } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { home, atelier } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { atelierMoments } from "@/content/fr/coulisses";
import { Lisiere } from "./_components/Lisiere";
import { Ourlet } from "./_components/Ourlet";
import { Pique } from "./_components/Pique";
import { Ajour } from "./_components/Ajour";
import { Edition, Serie } from "./_components/Edition";
import { Vignette } from "./_components/Vignette";
import { JourMot } from "./_components/JourMot";
import { Curseur } from "./_components/Curseur";
import { Voile } from "./_components/Voile";
import { Medaillon } from "./_components/Medaillon";
import { Fil } from "./_components/Reseau";
import { TEMOIN_OUVERTURE } from "./_components/temoin";
import { enLettres } from "./_components/lettres";
import s from "./da-dentelle.module.css";

export const metadata: Metadata = { title: { absolute: "Dentelle — laboratoire | Awrea Paris" } };

/** pièce présentée dans le laboratoire ; les autres pièces mènent à leur fiche du site */
const lienPiece = (handle: string) => (handle === "robe-odessa" ? "/lab/da-dentelle/piece" : `/boutique/${handle}`);

/**
 * Le quinconce du tulle (écran large) : une maille de trois colonnes sur deux porte une pièce,
 * en décalant chaque rang d'une maille. La première maille vide du deuxième rang garde le mot
 * de la créatrice.
 */
const quinconce = (i: number) => {
  const rang = Math.floor(i / 2);
  const col = (rang % 2 === 0 ? [1, 7] : [4, 10])[i % 2];
  return { "--col": col, "--rang": rang + 1 } as React.CSSProperties;
};

export default async function AccueilDentelle() {
  const [collection, odessa, jar] = await Promise.all([getCurrentCollection(), getProduct("robe-odessa"), cookies()]);
  // le magasin de démonstration garde parfois une « pièce de test » laissée par les parcours e2e
  // (tests/e2e/gestion.spec.ts) : elle n'appartient pas à la collection présentée ici
  const pieces = (await getProductsByHandles(collection?.products ?? [])).filter((p) => !/-test-/.test(p.handle));
  const exemplaires = pieces.reduce((n, p) => n + p.edition.total, 0);
  const premiereVisite = !jar.has(TEMOIN_OUVERTURE);
  const reference = odessa?.variants[0]?.sku.replace(/-[A-Z]+$/, "");
  // une phrase de la créatrice, tirée de l'intention de la collection (jamais inventée) :
  // la deuxième phrase de son texte, jusqu'aux deux-points
  const phrase = collection?.intention[0]
    ?.split(/(?<=\.)\s+/)[1]
    ?.split(/\s:\s/)[0]
    ?.replace(/\.$/, "");

  return (
    <div className={s.page} data-theme="ivory">
      {premiereVisite ? <Voile /> : null}
      <Curseur />
      <Lisiere />

      {/* ------------------------------------------------ 1. L'ÉCHANTILLON */}
      <section className={`${s.temps} ${s.ouverture}`} aria-labelledby="ouverture-titre">
        <div className={`container ${s.grille} ${s.ouvertureGrille}`}>
          <div className={s.ouvertureTexte}>
            <p className="eyebrow">{collection?.season ?? home.hero.eyebrow}</p>
            <Pique id="ouverture-titre" texte={collection?.title ?? home.hero.title} lu={`${collection?.title ?? home.hero.title} — ${home.hero.h1}`} className="t-display" />
            <p className={`t-lead ${s.ouvertureChapeau}`}>{home.hero.lead}</p>
            <Link href={home.hero.cta.href} className="btn btn--solid">
              {home.hero.cta.label}
            </Link>
          </div>
          {odessa ? (
            <figure className={s.ouvertureEchantillon}>
              <div className={s.cordonnet} data-curseur-aw="">
                <Ajour ouverture>
                  <Media image={odessa.detailImage} ratio="look" priority sizes="(min-width: 64rem) 36vw, (min-width: 48rem) 66vw, 100vw" />
                </Ajour>
              </div>
              <figcaption className={s.etiquette}>
                <span className={s.etiquetteTexte}>
                  <span className="t-label">Échantillon · Réf. {reference}</span>
                  <span className={s.etiquetteNom}>{odessa.title}</span>
                  <span className="t-note">{odessa.materials.map((m) => m.name).join(", ")}</span>
                </span>
                <span className={s.etiquetteNumero}>
                  <span className="sr-only">{editionInfo(odessa).label}</span>
                  <span aria-hidden="true">
                    <small>N° </small>
                    {editionInfo(odessa).nextNumber}
                    <small> / {odessa.edition.total}</small>
                  </span>
                </span>
              </figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------ 2. LE RAPPORT (la collection, finie et nommée) */}
      {collection ? (
        <section className={s.temps} aria-labelledby="rapport-titre">
          <div className={`container ${s.grille}`}>
            <header className={s.rapportTete}>
              <p className="eyebrow">{home.collection.eyebrow}</p>
              <h2 id="rapport-titre" className="t-h1">
                <span className={s.insecable}>{enLettres(pieces.length, true)} pièces,</span> <span className={s.insecable}>{enLettres(exemplaires)}</span> exemplaires numérotés
              </h2>
              <p className="t-body">{home.collection.text}</p>
            </header>

            <ol className={`${s.grille} ${s.quinconce}`}>
              {pieces.map((p, i) => {
                const ed = editionInfo(p);
                return (
                  <li key={p.handle} className={s.maille} style={quinconce(i)}>
                    <Vignette
                      href={lienPiece(p.handle)}
                      video={p.video?.src}
                      media={
                        // immobile : la vignette ne s'ajoure qu'au survol, à la demande (vidéo)
                        // décorative : le nom, le numéro et le prix nomment déjà le lien
                        <Media image={p.images[0]} ratio="portrait" decorative sizes="(min-width: 64rem) 22vw, (min-width: 48rem) 50vw, 85vw" />
                      }
                      legende={
                        <span className={s.vignetteLegende}>
                          <span className={s.vignetteNom}>{p.title}</span>
                          <span className={s.vignetteNumero}>
                            <span className="sr-only">{ed.label}</span>
                            <span aria-hidden="true">{ed.unique ? "Unique" : `N° ${ed.complete ? ed.total : ed.nextNumber} / ${ed.total}`}</span>
                          </span>
                          <span className={s.vignetteSerie}>
                            <Serie product={p} />
                          </span>
                          <span className={`price ${s.vignettePrix}`}>{formatPrice(p.price)}</span>
                        </span>
                      }
                    />
                  </li>
                );
              })}
              {phrase ? <JourMot phrase={phrase} signature={identity.founderTitle} style={{ "--col": 1, "--rang": 2 } as React.CSSProperties} /> : null}
            </ol>

            <p className={`${s.rapportAppel} ${s.sansJustif}`}>
              <Link href={`/collections/${collection.handle}`} className="link">
                Découvrir les {enLettres(pieces.length)} pièces
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------ 3. LE GALON (la phrase de la créatrice) */}
      <section className={s.galon} data-theme="ink" aria-labelledby="galon-titre">
        <LightHalo />
        <div className={`container ${s.grille} ${s.galonGrille}`}>
          <h2 id="galon-titre" className={`eyebrow ${s.galonTete}`}>
            La phrase de la créatrice
          </h2>
          <div className={s.galonBloc}>
            <blockquote className={s.galonCitation}>
              <p className={`${s.galonPhrase} ${s.sansJustif}`}>« {identity.founderQuote} »</p>
              <footer className={`t-label ${s.galonSignature}`}>{identity.founderTitle}</footer>
            </blockquote>
            <Link href="/la-maison" className="link">
              Lire l’histoire de la Maison
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4. L'ATELIER */}
      <section className={s.temps} aria-labelledby="atelier-titre">
        <div className={`container ${s.grille} ${s.atelierGrille}`}>
          <figure className={s.atelierMedia}>
            <div className={s.cordonnet}>
              <VideoLazy src={atelierMoments.dentelle.video.src} poster={atelierMoments.dentelle.video.poster} label={`Dans l’atelier : ${atelierMoments.dentelle.caption.toLowerCase()}`} className="media media--landscape" />
            </div>
            <figcaption className={`t-label ${s.atelierLegende}`}>{atelierMoments.dentelle.caption}</figcaption>
          </figure>
          <div className={s.atelierTexte}>
            <p className="eyebrow">{home.atelier.eyebrow}</p>
            <h2 id="atelier-titre" className="t-h2">
              {atelierMoments.dentelle.title}
            </h2>
            <p className="t-body">{atelier.steps[2]?.text}</p>
            <Link href={home.atelier.cta.href} className="link">
              {home.atelier.cta.label}
            </Link>
          </div>
        </div>
      </section>

      <div className="container" aria-hidden="true">
        <Fil />
      </div>

      {/* ------------------------------------------------ 5. LA LETTRE (papier filigrané) */}
      <section className={s.temps} aria-labelledby="lettre-titre">
        <div className={`container ${s.grille}`}>
          <div className={s.lettre}>
            <Medaillon className={s.filigrane} />
            <p className="eyebrow">{home.newsletter.eyebrow}</p>
            <h2 id="lettre-titre" className="t-h2">
              {home.newsletter.title}
            </h2>
            <p className="t-body">{home.newsletter.text}</p>
            <NewsletterForm source="lab-dentelle" />
          </div>
        </div>
      </section>

      <Ourlet />
    </div>
  );
}
