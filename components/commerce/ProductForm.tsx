"use client";
import { Turnstile } from "@/components/security/Turnstile";
import { useEffect, useId, useRef, useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { availabilityLabel, editionInfo, variantAvailability } from "@/lib/commerce/availability";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { SizeFinder } from "./SizeFinder";
import { WishlistButton } from "./WishlistButton";
import { Icon } from "@/components/ui/Icon";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Choix de la taille, ajout au panier, précommande ou liste d'attente, guide des tailles.
 * `stickyBar` : sur téléphone et tablette, une barre d'achat reste en bas de l'écran tant que le
 * bouton principal n'est pas visible (même taille choisie, même panier).
 */
export function ProductForm({ product, stickyBar = false }: { product: Product; stickyBar?: boolean }) {
  const { dispatch, busy } = useCart();
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  const [showError, setShowError] = useState(false);
  const guide = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  const a = variant ? variantAvailability(product, variant) : null;
  const allSoldOut = product.variants.every((v) => v.quantity === 0 && !v.preorder);
  const ed = editionInfo(product);

  const add = async () => {
    if (!variant) {
      setShowError(true);
      return;
    }
    await dispatch({ type: "add", variantId: variant.id }, { openAfter: true, announce: `${product.title}, taille ${variant.size}, ajoutée au panier` });
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

  const soldOut = allSoldOut || a === "soldout";
  const barAction = () => {
    const target = soldOut ? formRef.current?.querySelector<HTMLElement>("#liste-attente") : !variant ? formRef.current?.querySelector<HTMLElement>(".size-picker") : null;
    if (!target) return void add();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    target.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    if (!soldOut) setShowError(true);
  };

  return (
    <div ref={formRef} className="product-form stack-m">
      {!allSoldOut ? (
        <>
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
              Trouver ma taille
            </button>
          </div>
          <p className="t-note product-form__status" aria-live="polite">
            {variant && a
              ? a === "preorder"
                ? `Taille ${variant.size} sur commande : façonnée pour vous en ${product.leadTimeWeeks ?? 4} semaines, puis expédiée.`
                : a === "soldout"
                  ? `La taille ${variant.size} est épuisée.`
                  : `${availabilityLabel(a)}, expédiée sous ${shop.dispatchDays}.`
              : showError
                ? "Merci de choisir une taille."
                : ed.complete && product.leadTimeWeeks
                  ? "Série complète : chaque pièce est désormais réalisée sur commande."
                  : "Choisissez votre taille."}
          </p>
        </>
      ) : null}

      {soldOut ? (
        <div ref={actionsRef}>
          <Waitlist product={product} variant={variant} />
        </div>
      ) : (
        <div ref={actionsRef} className="product-form__actions">
          <button type="button" className="btn btn--solid btn--block" onClick={add} disabled={busy} aria-describedby={showError ? undefined : undefined}>
            {a === "preorder" ? "Précommander" : "Ajouter au panier"}
          </button>
          <WishlistButton handle={product.handle} title={product.title} />
        </div>
      )}

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
            {soldOut ? "Être prévenue" : !variant ? "Choisir ma taille" : a === "preorder" ? "Précommander" : "Ajouter au panier"}
          </button>
        </div>
      ) : null}

      <dialog ref={guide} className="modal scene" data-theme="ivory" aria-labelledby="size-guide-title" onClick={(e) => e.target === guide.current && guide.current?.close()}>
        <div className="modal__inner stack-m">
          <header className="modal__head">
            <h2 id="size-guide-title" className="t-h3">
              Votre taille
            </h2>
            <button type="button" className="icon-btn" onClick={() => guide.current?.close()} aria-label="Fermer le guide des tailles">
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

function Waitlist({ product, variant }: { product: Product; variant: Variant | null }) {
  const id = useId();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <div id="liste-attente" className="waitlist stack">
      <p className="t-body">
        {variant && product.variants.length > 1 ? `La taille ${variant.size} est épuisée.` : "Cette pièce est aujourd’hui épuisée."} Nous pouvons vous prévenir dès qu’un nouvel exemplaire sortira de l’atelier.
      </p>
      {state === "done" ? (
        <p className="t-lead" role="status">
          {msg}
        </p>
      ) : (
        <form
          className="newsletter"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setState("loading");
            const res = await fetch("/api/waitlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: f.get("email"), handle: product.handle, size: variant?.size ?? null, consent: f.get("consent") === "on", turnstile: f.get("cf-turnstile-response") || undefined }),
            }).catch(() => null);
            const j = res ? await res.json().catch(() => ({})) : {};
            setState(res?.ok ? "done" : "error");
            setMsg(j.message ?? j.error ?? "");
          }}
        >
          <div className="newsletter__row">
            <div className="field">
              <label htmlFor={`${id}-email`} className="field__label">
                Adresse e-mail
              </label>
              <input id={`${id}-email`} name="email" type="email" required autoComplete="email" className="field__input" placeholder="vous@exemple.fr" />
            </div>
            <button type="submit" className="btn" disabled={state === "loading"}>
              Être prévenue
            </button>
          </div>
          <label className="check t-note">
            <input type="checkbox" name="consent" required />
            <span>J’accepte d’être contactée au sujet de cette pièce uniquement.</span>
          </label>
          <Turnstile action="waitlist" />
          {state === "error" ? (
            <p className="field__error" role="alert">
              {msg || "L’inscription n’a pas pu être enregistrée."}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
