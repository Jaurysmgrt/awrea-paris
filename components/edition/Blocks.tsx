/**
 * Rendu d'une liste de blocs (lib/edition/blocks.ts). En mode Édition seulement, la liste et
 * chaque bloc portent leurs repères (data-ed-blocs, data-ed-bloc) : l'éditeur y accroche ses
 * outils (déplacer, dupliquer, supprimer, ajouter). Le site public n'en reçoit aucun.
 */
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ProductCard } from "@/components/commerce/ProductCard";
import { OutfitAdd } from "@/components/commerce/OutfitAdd";
import { getProductsByHandles } from "@/lib/commerce";
import { paragraphs } from "@/lib/edition/fill";
import { stegaClean } from "@/lib/edition/stega";
import type { Block, Img, Lien } from "@/lib/edition/blocks";

const text = (v: unknown) => (typeof v === "string" ? v : "");
const img = (v: unknown): Img => (v && typeof v === "object" ? (v as Img) : { src: "", alt: "", width: 1200, height: 1500 });
const lien = (v: unknown): Lien | null => (v && typeof v === "object" && typeof (v as Lien).href === "string" ? (v as Lien) : null);
const handles = (v: unknown) => (Array.isArray(v) ? v.filter((h): h is string => typeof h === "string") : []);

function Paragraphes({ value, className = "t-body" }: { value: unknown; className?: string }) {
  return (
    <>
      {paragraphs(text(value)).map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

/** Titre d'un bloc : h1 pour le premier bloc d'une page qui n'a pas d'autre titre, h2 sinon. */
function Title({ value, first, className = "t-h2" }: { value: unknown; first: boolean; className?: string }) {
  const t = text(value);
  if (!t) return null;
  const Tag = first ? "h1" : "h2";
  return <Tag className={className}>{t}</Tag>;
}

async function Bloc({ b, first }: { b: Block; first: boolean }) {
  switch (b.type) {
    case "grande-image": {
      const h = text(b.hauteur) || "haute";
      return (
        <figure className={`bloc bloc-image bloc-image--${stegaClean(h)}`}>
          <Media image={img(b.image)} ratio="auto" sizes="100vw" priority={first} className="bloc-image__media" />
          {text(b.legende) ? <figcaption className="t-label media__caption container">{text(b.legende)}</figcaption> : null}
        </figure>
      );
    }
    case "texte-image": {
      const cta = lien(b.cta);
      return (
        <div className={`bloc container grid-12 bloc-texte-image bloc-texte-image--${stegaClean(text(b.cote) || "droite")}`}>
          <div className="bloc-texte-image__texte stack-m">
            {text(b.surtitre) ? <p className="eyebrow">{text(b.surtitre)}</p> : null}
            <Title value={b.titre} first={first} />
            <Paragraphes value={b.texte} />
            {cta ? (
              <Link href={cta.href} className="link">
                {cta.label}
              </Link>
            ) : null}
          </div>
          <div className="bloc-texte-image__media">
            <Media image={img(b.image)} ratio="tall" sizes="(min-width: 64rem) 50vw, 100vw" />
          </div>
        </div>
      );
    }
    case "citation":
      return (
        <figure className="bloc container-prose bloc-citation t-center">
          <blockquote className="t-display bloc-citation__texte">« {text(b.citation)} »</blockquote>
          {text(b.auteur) ? <figcaption className="t-label">{text(b.auteur)}</figcaption> : null}
        </figure>
      );
    case "galerie": {
      const list = Array.isArray(b.images) ? (b.images as Img[]) : [];
      return (
        <ul className={`bloc container bloc-galerie bloc-galerie--${stegaClean(text(b.disposition) || "quinconce")}`}>
          {list.map((im, i) => (
            <li key={i} className="bloc-galerie__item">
              <Media image={img(im)} ratio="tall" sizes="(min-width: 64rem) 33vw, 50vw" />
            </li>
          ))}
        </ul>
      );
    }
    case "video": {
      const v = (b.video ?? {}) as { src?: string; poster?: string; label?: string };
      return (
        <figure className="bloc container bloc-video">
          {v.src ? <VideoLazy src={v.src} poster={v.poster ?? ""} label={text(v.label)} className="media media--landscape" /> : <Media image={{ src: "", alt: text(v.label), width: 1600, height: 900 }} ratio="landscape" />}
          {text(b.legende) ? <figcaption className="t-label media__caption">{text(b.legende)}</figcaption> : null}
        </figure>
      );
    }
    case "shop-the-look": {
      const products = await getProductsByHandles(handles(b.pieces).map(stegaClean));
      return (
        <div className="bloc container grid-12 bloc-tenue">
          <div className="bloc-tenue__media">
            <Media image={img(b.image)} ratio="look" sizes="(min-width: 64rem) 50vw, 100vw" />
          </div>
          <div className="bloc-tenue__texte stack-m">
            <Title value={b.titre} first={first} />
            <Paragraphes value={b.texte} />
            {products.length ? <OutfitAdd title={stegaClean(text(b.titre))} products={products} /> : null}
          </div>
        </div>
      );
    }
    case "croquis": {
      const notes = Array.isArray(b.notes) ? (b.notes as { texte?: string; x?: number; y?: number }[]) : [];
      return (
        <figure className="bloc container bloc-croquis">
          <Title value={b.titre} first={first} className="t-h3" />
          <div className="bloc-croquis__feuille">
            <Media image={img(b.image)} ratio="tall" sizes="(min-width: 64rem) 50vw, 100vw" />
            {notes.map((n, i) => (
              <span key={i} className="bloc-croquis__note t-label" style={{ left: `${n.x ?? 50}%`, top: `${n.y ?? 50}%` }}>
                {text(n.texte)}
              </span>
            ))}
          </div>
        </figure>
      );
    }
    case "appel": {
      const cta = lien(b.cta);
      return (
        <div className="bloc container-text bloc-appel stack-m t-center">
          <Title value={b.titre} first={first} />
          <Paragraphes value={b.texte} className="t-lead t-center" />
          {cta ? (
            <Link href={cta.href} className="btn btn--solid">
              {cta.label}
            </Link>
          ) : null}
        </div>
      );
    }
    case "texte":
      return (
        <div className="bloc container-prose bloc-texte stack-m">
          {text(b.surtitre) ? <p className="eyebrow">{text(b.surtitre)}</p> : null}
          <Title value={b.titre} first={first} />
          <Paragraphes value={b.texte} />
        </div>
      );
    case "pieces": {
      const products = await getProductsByHandles(handles(b.pieces).map(stegaClean));
      const cta = lien(b.cta);
      return (
        <div className="bloc container bloc-pieces">
          <header className="section-head">
            <Title value={b.titre} first={first} />
            {cta ? (
              <Link href={cta.href} className="link section-head__link">
                {cta.label}
              </Link>
            ) : null}
          </header>
          {products.length ? (
            <ul className="editorial-grid">
              {products.map((p, i) => (
                <li key={p.handle} className={`editorial-grid__item editorial-grid__item--${i % 4}`}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-note bloc-vide">Aucune pièce choisie pour l’instant.</p>
          )}
        </div>
      );
    }
    case "lettre":
      return (
        <div className="bloc container-text letter-card bloc-lettre stack-m">
          <Paragraphes value={b.texte} />
          <p className="t-label bloc-lettre__signature">{text(b.signature)}</p>
        </div>
      );
    case "inscription":
      return (
        <div className="bloc container-text letter-card stack-m t-center">
          <Title value={b.titre} first={first} />
          <Paragraphes value={b.texte} className="t-body t-center" />
          <NewsletterForm source="page" />
        </div>
      );
    default:
      return null;
  }
}

export function Blocks({ items, doc, path, editing = false, firstIsTitle = false }: { items: unknown; doc: string; path: string; editing?: boolean; firstIsTitle?: boolean }) {
  const list = Array.isArray(items) ? (items as Block[]) : [];
  return (
    <div className="blocs" data-ed-blocs={editing ? `${doc}|${path}` : undefined}>
      {list.map((b, i) => (
        <section key={b.id ?? i} className="blocs__item scene" data-theme={b.type === "grande-image" ? "ink" : "ivory"} data-ed-bloc={editing ? i : undefined} data-ed-type={editing ? b.type : undefined}>
          <Bloc b={b} first={firstIsTitle && i === 0} />
        </section>
      ))}
    </div>
  );
}
