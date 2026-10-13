"use client";
import Link from "@/components/ui/Link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { Media } from "@/components/ui/Media";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";

/** Panier latéral : lignes, livraison offerte, emballage cadeau, codes, accès au paiement. */
export function CartDrawer() {
  const { cart, isOpen, close, dispatch, busy, error } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const [codesOpen, setCodesOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setMessage(cart?.gift.message ?? ""), [cart?.gift.message]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (isOpen && !d.open) {
      d.showModal();
      lenis?.stop();
    } else if (!isOpen && d.open) {
      d.close();
      lenis?.start();
    }
  }, [isOpen]);

  const lines = cart?.lines ?? [];
  const remaining = cart ? Math.max(0, cart.freeShippingThreshold - (cart.subtotal - (cart.discount?.amount ?? 0))) : shop.freeShippingThreshold;
  const progress = cart ? Math.min(1, (cart.subtotal - (cart.discount?.amount ?? 0)) / cart.freeShippingThreshold) : 0;
  const hasPreorder = lines.some((l) => l.preorder);

  return (
    <dialog
      ref={ref}
      className="drawer scene"
      data-theme="ivory"
      aria-labelledby="cart-title"
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="drawer__panel">
        <header className="drawer__head">
          <h2 id="cart-title" className="t-label">
            Panier {cart?.totalQuantity ? `(${cart.totalQuantity})` : ""}
          </h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Fermer le panier">
            <Icon name="close" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty stack-m">
            <p className="t-lead t-center">Votre panier attend sa première pièce.</p>
            <Link href="/boutique" className="btn btn--block" onClick={close}>
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer__body">
              <div className="drawer__shipping">
                <p className="t-note">
                  {remaining > 0 ? (
                    <>Plus que {formatPrice(remaining)} pour la livraison offerte en France et en Europe.</>
                  ) : (
                    <>La livraison vous est offerte en France et en Europe.</>
                  )}
                </p>
                <div className="drawer__progress" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
              </div>

              <ul className="drawer__lines">
                {lines.map((l) => (
                  <li key={l.id} className="cart-line">
                    <Link href={`/boutique/${l.productHandle}`} onClick={close} className="cart-line__media" tabIndex={-1} aria-hidden="true">
                      <Media image={l.image} ratio="portrait" sizes="6rem" decorative />
                    </Link>
                    <div className="cart-line__info">
                      <div className="cart-line__top">
                        <Link href={`/boutique/${l.productHandle}`} onClick={close} className="t-h4 cart-line__title">
                          {l.title}
                        </Link>
                        <span className="price">{formatPrice(l.unitPrice * l.quantity)}</span>
                      </div>
                      <p className="t-label t-soft cart-line__meta">
                        Taille {l.size}
                        {l.editionLabel ? ` · ${l.editionLabel}` : ""}
                      </p>
                      {l.preorder ? (
                        <p className="t-note">Sur commande — fabrication {l.leadTimeWeeks ? `sous ${l.leadTimeWeeks} semaines` : "à l’atelier"}.</p>
                      ) : null}
                      <div className="cart-line__actions">
                        <div className="qty" role="group" aria-label={`Quantité de ${l.title}`}>
                          <button type="button" className="icon-btn" disabled={busy} onClick={() => dispatch({ type: "update", lineId: l.id, quantity: l.quantity - 1 })} aria-label="Retirer une pièce">
                            <Icon name="minus" />
                          </button>
                          <span aria-live="polite">{l.quantity}</span>
                          <button type="button" className="icon-btn" disabled={busy} onClick={() => dispatch({ type: "update", lineId: l.id, quantity: l.quantity + 1 })} aria-label="Ajouter une pièce">
                            <Icon name="plus" />
                          </button>
                        </div>
                        <button type="button" className="link link--quiet" disabled={busy} onClick={() => dispatch({ type: "remove", lineId: l.id }, { announce: `${l.title} retirée du panier` })}>
                          Retirer
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="drawer__gift">
                <label className="check">
                  <input type="checkbox" checked={cart?.gift.wrap ?? false} onChange={(e) => dispatch({ type: "gift", wrap: e.target.checked, message })} />
                  <span>Emballage cadeau avec un mot écrit à la main — {formatPrice(shop.giftWrapPrice)}</span>
                </label>
                {cart?.gift.wrap ? (
                  <div className="field">
                    <label htmlFor="gift-message" className="field__label">
                      Votre message
                    </label>
                    <textarea
                      id="gift-message"
                      className="field__input"
                      maxLength={300}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onBlur={() => message !== cart.gift.message && dispatch({ type: "gift", wrap: true, message })}
                      placeholder="Nous le recopierons à la main sur une carte ivoire."
                    />
                    <span className="field__hint">{300 - message.length} caractères restants</span>
                  </div>
                ) : null}
              </div>

              <details className="disclosure" open={codesOpen} onToggle={(e) => setCodesOpen((e.target as HTMLDetailsElement).open)}>
                <summary>Code avantage ou carte cadeau</summary>
                <div className="disclosure__body stack">
                  <CodeForm
                    label="Code avantage"
                    current={cart?.discount?.code}
                    onSubmit={(code) => dispatch({ type: "discount", code })}
                    busy={busy}
                  />
                  <CodeForm label="Carte cadeau" current={cart?.giftCard?.code} onSubmit={(code) => dispatch({ type: "giftCard", code })} busy={busy} />
                </div>
              </details>
            </div>

            <footer className="drawer__foot">
              {error ? (
                <p className="field__error" role="alert">
                  {error}
                </p>
              ) : null}
              <dl className="totals">
                <div>
                  <dt>Sous-total</dt>
                  <dd>{formatPrice(cart!.subtotal)}</dd>
                </div>
                {cart?.discount ? (
                  <div>
                    <dt>{cart.discount.label}</dt>
                    <dd>− {formatPrice(cart.discount.amount)}</dd>
                  </div>
                ) : null}
                {cart?.gift.wrap ? (
                  <div>
                    <dt>Emballage cadeau</dt>
                    <dd>{formatPrice(cart.giftWrapPrice)}</dd>
                  </div>
                ) : null}
                {cart?.giftCard ? (
                  <div>
                    <dt>Carte cadeau</dt>
                    <dd>− {formatPrice(cart.giftCard.amount)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Livraison</dt>
                  <dd>{cart?.shippingEstimate === 0 ? "Offerte" : "Calculée à l’étape suivante"}</dd>
                </div>
                <div className="totals__total">
                  <dt>Total</dt>
                  <dd>{formatPrice(cart!.total)}</dd>
                </div>
              </dl>
              {hasPreorder ? <p className="t-note">Votre panier contient une pièce sur commande : l’ensemble sera expédié à la fin de sa fabrication.</p> : null}
              {cart?.mode === "shopify" ? (
                <a href={cart.checkoutUrl} className="btn btn--solid btn--block">
                  Commander
                </a>
              ) : (
                <Link href={cart?.checkoutUrl ?? "/commande"} className="btn btn--solid btn--block" onClick={close}>
                  Commander
                </Link>
              )}
              <p className="t-label t-soft t-center drawer__pay">Sans compte · Carte · Apple Pay · Google Pay · PayPal · 3 ou 4 fois</p>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

function CodeForm({ label, current, onSubmit, busy }: { label: string; current?: string; onSubmit: (code: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");
  const id = label.replace(/\s/g, "-").toLowerCase();
  if (current) {
    return (
      <p className="cart-code">
        <span className="t-label">
          {label} : {current}
        </span>
        <button type="button" className="link link--quiet" onClick={() => onSubmit("")}>
          Retirer
        </button>
      </p>
    );
  }
  return (
    <form
      className="cart-code"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <div className="field cart-code__field">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        <input id={id} className="field__input" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoCapitalize="characters" />
      </div>
      <button type="submit" className="btn" disabled={busy || !value.trim()}>
        Appliquer
      </button>
    </form>
  );
}
