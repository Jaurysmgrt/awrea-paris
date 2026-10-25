"use client";
import { useEffect, useRef, useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { SizeFinder } from "./SizeFinder";
import { WishlistButton } from "./WishlistButton";
import { Icon } from "@/components/ui/Icon";
import { useTexts } from "@/components/content/Texts";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Commande d'une pièce créée sur demande : le délai de fabrication d'abord, bien visible, puis le
 * choix de la taille (toutes se commandent), l'ajout au panier et le guide des tailles.
 * `stickyBar` : sur téléphone et tablette, une barre d'achat reste en bas de l'écran tant que le
 * bouton principal n'est pas visible (même taille choisie, même panier).
 */
export function ProductForm({ product, stickyBar = false }: { product: Product; stickyBar?: boolean }) {
  const t = useTexts<CatalogueTexts>("catalogue");
  const { dispatch, busy } = useCart();
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  const [showError, setShowError] = useState(false);
  const guide = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  const delai = delaiText(t, product.leadTime);

  const add = async () => {
    if (!variant) {
      setShowError(true);
      return;
    }
    await dispatch({ type: "add", variantId: variant.id }, { openAfter: true, announce: fill(t.achat.annonceTaille, { piece: product.title, taille: variant.size }) });
  };

  // barre d'achat : visible tant que les boutons principaux sont hors de l'écran
  useEffect(() => {
    const el = actionsRef.current;
    if (!stickyBar || !el) return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting), { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [stickyBar]);
  useEffect(() => {
    if (!stickyBar) return;
    document.documentElement.dataset.buybar = barVisible ? "true" : "false";
    return () => void delete document.documentElement.dataset.buybar;
  }, [stickyBar, barVisible]);

  const barAction = () => {
    const target = !variant ? formRef.current?.querySelector<HTMLElement>(".size-picker") : null;
    if (!target) return void add();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    target.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    setShowError(true);
  };

  return (
    <div ref={formRef} className="product-form stack-m">
      <div className="product-form__made stack-s">
        <p className="t-body t-left">{t.surDemande.fiche}</p>
        <dl className="product-form__lead">
          <dt className="t-label">{t.surDemande.delaiLabel}</dt>
          <dd className="t-body">{fill(t.surDemande.delaiValeur, { delai })}</dd>
        </dl>
        <dl className="product-form__lead">
          <dt className="t-label">{t.certificat.titre}</dt>
          <dd className="t-body">{t.certificat.numero}</dd>
        </dl>
      </div>

      <div className="product-form__sizes">
        <SizePicker
          product={product}
          value={variant?.id ?? null}
          onChange={(v) => {
            setVariant(v);
            setShowError(false);
          }}
        />
        <button type="button" className="link link--quiet" onClick={() => guide.current?.showModal()}>
          {t.taille.trouver}
        </button>
      </div>
      <p className="t-note t-left product-form__status" aria-live="polite">
        {variant ? fill(t.taille.choisie, { taille: variant.size === "TU" ? t.taille.unique : variant.size, delai }) : showError ? t.taille.manquante : t.taille.choisir}
      </p>

      <div ref={actionsRef} className="product-form__actions">
        <button type="button" className="btn btn--solid btn--block" onClick={add} disabled={busy}>
          {t.achat.ajouter}
        </button>
        <WishlistButton handle={product.handle} title={product.title} />
      </div>

      {stickyBar ? (
        <div className="buy-bar" data-visible={barVisible} inert={!barVisible}>
          <div className="buy-bar__info">
            <span className="t-label buy-bar__title">{product.title}</span>
            <span className="price buy-bar__price">
              {formatPrice(product.price)}
              {variant && variant.size !== "TU" ? ` · ${variant.size}` : ""}
            </span>
          </div>
          <button type="button" className="btn btn--solid buy-bar__btn" onClick={barAction} disabled={busy}>
            {!variant ? t.achat.choisirTaille : t.achat.ajouter}
          </button>
        </div>
      ) : null}

      <dialog ref={guide} className="modal scene" data-theme="ivory" aria-labelledby="size-guide-title" onClick={(e) => e.target === guide.current && guide.current?.close()}>
        <div className="modal__inner stack-m">
          <header className="modal__head">
            <h2 id="size-guide-title" className="t-h3">
              {t.taille.guideTitre}
            </h2>
            <button type="button" className="icon-btn" onClick={() => guide.current?.close()} aria-label={t.taille.fermerGuide}>
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
                  setShowError(false);
                }
                guide.current?.close();
              }}
            />
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
