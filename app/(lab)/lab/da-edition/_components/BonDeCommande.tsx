"use client";
/**
 * Le bon de commande : comme le coupon d'une revue, mais l'achat reste immédiat. Prix, exemplaire
 * numéroté, taille, ajout au panier, tout est visible sans clic. Même logique que ProductForm
 * (tailles, précommande, panier, barre d'achat fixe sur téléphone, guide des tailles), avec les
 * textes de la direction « édition ».
 */
import { useEffect, useRef, useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { variantAvailability } from "@/lib/commerce/availability";
import { useCart } from "@/components/commerce/CartProvider";
import { SizePicker } from "@/components/commerce/SizePicker";
import { SizeFinder } from "@/components/commerce/SizeFinder";
import { WishlistButton } from "@/components/commerce/WishlistButton";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/brand/Logo";
import Link from "@/components/ui/Link";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import { chiffre } from "./donnees";
import { bon } from "./textes";
import s from "../da-edition.module.css";

export function BonDeCommande({ product }: { product: Product }) {
  const { dispatch, busy } = useCart();
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  const [erreur, setErreur] = useState(false);
  const [barre, setBarre] = useState(false);
  const guide = useRef<HTMLDialogElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const tailles = useRef<HTMLDivElement>(null);
  const ed = chiffre(product);
  const a = variant ? variantAvailability(product, variant) : null;
  const toutEpuise = product.variants.every((v) => v.quantity === 0 && !v.preorder);
  const epuise = toutEpuise || a === "soldout";
  const action = a === "preorder" ? bon.precommander : bon.ajouter;

  const ajouter = async () => {
    if (!variant) {
      setErreur(true);
      return;
    }
    await dispatch({ type: "add", variantId: variant.id }, { openAfter: true, announce: bon.ajoutee(product.title, variant.size) });
  };

  // barre d'achat (téléphone, tablette) : elle apparaît une fois le bon de commande dépassé, pour
  // que l'achat reste à portée pendant la lecture ; à l'ouverture, elle ne cache ni le titre ni le prix
  useEffect(() => {
    const el = actions.current;
    if (!el) return;
    // la zone observée s'étend loin sous l'écran : seul compte le passage au-dessus du haut de
    // l'écran, même quand on remonte d'un coup (touche Début, retour en haut)
    const io = new IntersectionObserver(([e]) => setBarre(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "0px 0px 1000% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.buybar = barre ? "true" : "false";
    return () => void delete document.documentElement.dataset.buybar;
  }, [barre]);

  const depuisLaBarre = () => {
    if (variant && !epuise) return void ajouter();
    const cible = tailles.current ?? actions.current;
    cible?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    cible?.querySelector<HTMLElement>("input, a")?.focus({ preventScroll: true });
    if (!epuise) setErreur(true);
  };

  const statut = variant && a
    ? a === "preorder"
      ? bon.commande(variant.size, product.leadTimeWeeks ?? 4)
      : a === "soldout"
        ? bon.epuisee(variant.size)
        : a === "low"
          ? bon.derniere(variant.size, shop.dispatchDays)
          : bon.disponible(variant.size, shop.dispatchDays)
    : erreur
      ? bon.erreur
      : bon.choisir;

  return (
    <section className={s.bon} aria-labelledby="bon-de-commande">
      <div className={s.bonTete}>
        <h2 id="bon-de-commande" className="t-label">
          {bon.titre}
        </h2>
        <p className={`price ${s.bonPrix}`}>{formatPrice(product.price)}</p>
      </div>
      <div className={s.bonCorps}>
        <p className="t-note">{ed.unique ? bon.unique : ed.complete ? bon.complete : bon.exemplaire(ed.n, ed.total, ed.reste)}</p>

        {!toutEpuise ? (
          <div ref={tailles}>
            <div className={s.bonTailles}>
              <SizePicker
                product={product}
                legend={bon.taille}
                value={variant?.id ?? null}
                onChange={(v) => {
                  setVariant(v);
                  setErreur(false);
                }}
              />
              <button type="button" className="link link--quiet" onClick={() => guide.current?.showModal()}>
                {bon.trouver}
              </button>
            </div>
            <p className={`t-note ${s.bonStatut}`} aria-live="polite">
              {statut}
            </p>
          </div>
        ) : null}

        <div ref={actions} className={s.bonActions}>
          {epuise ? (
            <>
              <p className="t-note">{bon.epuiseeTout}</p>
              <Link href={`/boutique/${product.handle}#liste-attente`} className="btn">
                {bon.prevenir}
              </Link>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--solid btn--block" onClick={ajouter} disabled={busy}>
                {action}
              </button>
              <WishlistButton handle={product.handle} title={product.title} />
            </>
          )}
        </div>

        <p className="t-note">{bon.faitMain}</p>
      </div>
      <Logo variant="monogram" decorative className={s.bonFiligrane} />

      <div className="buy-bar" data-visible={barre} inert={!barre}>
        <div className="buy-bar__info">
          <span className="t-label buy-bar__title">{product.title}</span>
          <span className="price buy-bar__price">
            {formatPrice(product.price)}
            {variant && variant.size !== "TU" ? `, ${variant.size}` : ""}
          </span>
        </div>
        <button type="button" className="btn btn--solid buy-bar__btn" onClick={depuisLaBarre} disabled={busy}>
          {epuise ? bon.prevenir : !variant ? bon.barreChoisir : action}
        </button>
      </div>

      <dialog ref={guide} className="modal scene" data-theme="ivory" aria-labelledby="guide-des-tailles" onClick={(e) => e.target === guide.current && guide.current?.close()}>
        <div className="modal__inner stack-m">
          <header className="modal__head">
            <h2 id="guide-des-tailles" className="t-h3">
              {bon.guide.titre}
            </h2>
            <button type="button" className="icon-btn" onClick={() => guide.current?.close()} aria-label={bon.guide.fermer}>
              <Icon name="close" />
            </button>
          </header>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  {shop.sizeGuide.headers.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shop.sizeGuide.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-body">{product.fit}</p>
          <p className="t-note">{shop.sizeGuide.note}</p>
          {product.variants.length > 1 ? (
            <SizeFinder
              product={product}
              onPick={(size) => {
                const v = product.variants.find((x) => x.size === size);
                if (v) {
                  setVariant(v);
                  setErreur(false);
                }
                guide.current?.close();
              }}
            />
          ) : null}
        </div>
      </dialog>
    </section>
  );
}
