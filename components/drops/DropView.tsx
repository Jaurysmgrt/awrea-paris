/**
 * Page d'une avant-première (« Bientôt ») : la prochaine collection de la Maison, son nom, ses
 * dates écrites en toutes lettres (aucun compte à rebours), son texte et ses images, l'accès à
 * l'avant-première (inscription par e-mail, ou mot de passe d'une présentation privée), puis ses
 * pièces, dont la commande s'ouvre selon l'accès de la visiteuse (vérifié côté serveur au panier).
 *
 * Une présentation privée ne montre ni son texte, ni ses images, ni ses pièces avant le mot de
 * passe. Chaque pièce est créée sur demande : aucune quantité, aucune rareté, seulement des dates.
 * Textes : content/site/fr/avant-premieres.json.
 */
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { getProductsByHandles } from "@/lib/commerce";
import type { Image, Product } from "@/lib/commerce/types";
import { dropDateText, dropImages, dropPhase, dropVars, readDropAccess, type Drop } from "@/lib/drops";
import { capitalized, paragraphsOf, type AvantPremieresTexts } from "./regles";
import { DropSignupForm } from "./DropSignupForm";
import { PrivatePresentationForm } from "./PrivatePresentationForm";
import s from "./avant-premieres.module.css";

/** Largeurs d'affichage des images (la première en grand, les suivantes par deux). */
// ecriture-ok : requêtes média de l'attribut sizes, jamais lues par la cliente
const SIZES = { first: "(min-width: 64rem) 50vw, 100vw", next: "(min-width: 64rem) 25vw, 50vw" };

/** Images de la collection : celles choisies dans l'Atelier (retrouvées parmi les photos des pièces), sinon une photo par pièce. */
function collectionImages(drop: Drop, products: Product[], alt: string): Image[] {
  const known = new Map(products.flatMap((p) => p.images).map((i) => [i.src, i]));
  const chosen = dropImages(drop);
  if (chosen.length) return chosen.map((src) => known.get(src) ?? { src, alt, width: 1200, height: 1800 });
  return products.flatMap((p) => (p.images[0] ? [p.images[0]] : [])).slice(0, 3);
}

/** `onBientot` : la collection est montrée à l'adresse « /bientot » (fil d'Ariane sans second niveau). */
export async function DropView({ drop, notice, onBientot = false }: { drop: Drop; notice?: "lienInvalide" | null; onBientot?: boolean }) {
  const t = await getDoc<AvantPremieresTexts>("avant-premieres");
  const [access, products] = await Promise.all([readDropAccess(), drop.products.length ? getProductsByHandles(drop.products, { includeUpcoming: true }) : Promise.resolve([])]);
  const phase = dropPhase(drop);
  const mine = access[drop.slug];
  const vars = dropVars(t, drop);
  const privee = drop.privateSale && phase !== "ouvert";
  // une présentation privée ne se montre qu'avec le mot de passe
  const revealed = !privee || mine === "prive";
  const images = revealed ? collectionImages(drop, products, fill(t.collection.image, vars)) : [];
  const texte = revealed ? paragraphsOf(drop.teaser) : [];

  const etat = phase === "ouvert" ? t.etat.devoilee : drop.privateSale ? t.etat.privee : phase === "anticipe" ? t.etat.avantPremiere : t.etat.annonce;
  const dates =
    phase === "ouvert"
      ? [{ label: t.dates.devoilement, value: dropDateText(t, drop.publicAt) }]
      : [
          { label: drop.privateSale ? t.dates.privee : t.dates.avantPremiere, value: dropDateText(t, drop.earlyAccessAt) },
          { label: t.dates.devoilement, value: dropDateText(t, drop.publicAt) },
        ];

  /** L'accès : ce que la visiteuse peut faire maintenant, selon le temps et son accès. */
  const acces = (() => {
    if (phase === "ouvert") {
      const a = t.acces.devoilee;
      return {
        titre: a.titre,
        texte: a.texte,
        action: (
          <Link href={a.href} className="btn">
            {a.label}
          </Link>
        ),
      };
    }
    if (drop.privateSale) {
      if (mine === "prive") {
        const a = phase === "anticipe" ? t.acces.privee.ouverte : t.acces.pret;
        return { titre: a.titre, texte: fill(a.texte, vars), action: null };
      }
      const a = t.acces.privee;
      return { titre: a.titre, texte: a.texte, action: <PrivatePresentationForm slug={drop.slug} t={{ champ: a.champ, bouton: a.bouton, envoi: a.envoi, erreurs: t.erreurs }} /> };
    }
    if (mine) {
      const a = phase === "anticipe" ? t.acces.ouvert : t.acces.pret;
      return { titre: a.titre, texte: fill(a.texte, vars), action: null };
    }
    const a = t.acces.inscription;
    return {
      titre: a.titre,
      texte: fill(phase === "anticipe" ? a.texteEnCours : a.texte, vars),
      action: <DropSignupForm slug={drop.slug} t={{ champ: a.champ, bouton: a.bouton, envoi: a.envoi, merci: a.merci, mention: a.mention, erreurs: t.erreurs }} />,
    };
  })();

  return (
    <>
      <PageHeader
        title={drop.title}
        eyebrow={etat}
        crumbs={onBientot ? [{ name: t.fil, path: "/bientot" }] : [{ name: t.fil, path: "/bientot" }, { name: drop.title, path: `/bientot/${drop.slug}` }]}
      >
        <dl className={s.dates}>
          {dates.map((d, i) => (
            <div key={i} className={s.date}>
              <dt className="t-label">{d.label}</dt>
              <dd className="t-lead">{capitalized(d.value)}</dd>
            </div>
          ))}
        </dl>
        {phase !== "ouvert" ? <p className={`t-note t-center ${s.fuseau}`}>{t.dates.fuseau}</p> : null}
        {notice ? (
          <p className={`notice t-body t-center ${s.avis}`} role="status">
            {t[notice]}
          </p>
        ) : null}
      </PageHeader>

      {texte.length || images.length ? (
        <Section theme="paper" className="section" labelledBy="avant-premiere-collection">
          <div className={`container ${s.collection} ${images.length ? "" : s.seul}`}>
            {images.length ? (
              <ul className={s.images}>
                {images.map((img, i) => (
                  <li key={`${img.src}-${i}`} className={s.image}>
                    <Media image={img} ratio="portrait" sizes={i === 0 ? SIZES.first : SIZES.next} priority={i === 0} />
                    <ProvisionalNote image={img} />
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={s.texte}>
              <h2 id="avant-premiere-collection" className="t-h2">
                {t.collection.titre}
              </h2>
              {texte.map((p, i) => (
                <p key={i} className="t-body">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <Section theme="ivory" className="section" labelledBy="avant-premiere-acces" id="acces">
        <div className={`container-text ${s.acces}`}>
          <h2 id="avant-premiere-acces" className="t-h3">
            {acces.titre}
          </h2>
          <p className="t-body">{acces.texte}</p>
          {acces.action}
        </div>
      </Section>

      {revealed && products.length ? (
        <Section theme="paper" className="section" labelledBy="avant-premiere-pieces">
          <div className={`container ${s.pieces}`}>
            <h2 id="avant-premiere-pieces" className="t-h2">
              {t.pieces.titre}
            </h2>
            <ul className="shop-grid">
              {products.map((p) => (
                <li key={p.handle}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}
