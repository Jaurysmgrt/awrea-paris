"use client";
import Link from "@/components/ui/Link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { Media } from "@/components/ui/Media";
import { Icon } from "@/components/ui/Icon";
import { useTexts } from "@/components/content/Texts";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";
import { TermsCheckbox } from "@/components/account/TermsCheckbox";
import { readSource } from "@/components/analytics/source";
import { track } from "@/lib/analytics/track";
import { earliestGiftDate, latestGiftDate } from "@/lib/commerce/international";
import { longestLeadTime } from "@/lib/commerce/availability";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import type { Image } from "@/lib/commerce/types";
import { ProvisionalNote } from "./ProvisionalNote";

type Suggestion = { handle: string; title: string; tagline: string; price: number; image: Image };

/**
 * Panier latéral : lignes (avec le délai de fabrication de chaque pièce créée sur demande et la
 * mention « visuel provisoire » des images générées), suggestions, livraison offerte, cadeau,
 * codes, accès au paiement.
 */
export function CartDrawer() {
  const t = useTexts<CommerceTexts>("commerce").panier;
  const locale = useLocale();
  const tc = useTexts<CatalogueTexts>("catalogue");
  const { cart, isOpen, close, dispatch, busy, error } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const [codesOpen, setCodesOpen] = useState(false);
  const giftMessage = cart?.gift.message ?? "";
  const [message, setMessage] = useState(giftMessage);
  const [syncedMessage, setSyncedMessage] = useState(giftMessage);
  if (giftMessage !== syncedMessage) {
    setSyncedMessage(giftMessage);
    setMessage(giftMessage);
  }
  const [terms, setTerms] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const lineKey = (cart?.lines ?? []).map((l) => l.productHandle).join(",");

  // pièces associées par la créatrice à celles du panier (rechargées quand le panier change)
  useEffect(() => {
    if (!isOpen || !lineKey) return;
    let cancelled = false;
    fetch("/api/cart/suggestions", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => !cancelled && setSuggestions(j.suggestions ?? []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, lineKey]);

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
  // la commande part quand sa dernière pièce est prête
  const longest = longestLeadTime(lines.map((l) => l.leadTime));
  const gift = cart?.gift;
  const setGift = (patch: { hidePrices?: boolean; deliveryDate?: string | null }) => dispatch({ type: "gift", wrap: true, message, ...patch });

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
            {cart?.totalQuantity ? fill(t.titreNombre, { n: cart.totalQuantity }) : t.titre}
          </h2>
          <button type="button" className="icon-btn" onClick={close} aria-label={t.fermer}>
            <Icon name="close" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty stack-m">
            <p className="t-lead t-center">{t.vide}</p>
            <Link href="/boutique" className="btn btn--block" onClick={close}>
              {t.videAction}
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer__body">
              <div className="drawer__shipping">
                <p className="t-note">{remaining > 0 ? fill(t.livraisonSeuil, { seuil: formatPrice(cart?.freeShippingThreshold ?? shop.freeShippingThreshold, locale) }) : t.livraisonOfferte}</p>
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
                        <Link href={`/boutique/${l.productHandle}`} onClick={close} className="t-body cart-line__title">
                          {l.title}
                        </Link>
                        <span className="price">{formatPrice(l.unitPrice * l.quantity, locale)}</span>
                      </div>
                      <p className="t-label t-soft cart-line__meta">{fill(t.taille, { taille: l.size })}</p>
                      <p className="t-note t-left cart-line__lead">{fill(t.delaiLigne, { delai: delaiText(tc, l.leadTime) })}</p>
                      <ProvisionalNote image={l.image} />
                      <div className="cart-line__actions">
                        <div className="qty" role="group" aria-label={fill(t.quantite, { piece: l.title })}>
                          <button type="button" className="icon-btn" disabled={busy} onClick={() => dispatch({ type: "update", lineId: l.id, quantity: l.quantity - 1 })} aria-label={t.moins}>
                            <Icon name="minus" />
                          </button>
                          <span aria-live="polite">{l.quantity}</span>
                          <button type="button" className="icon-btn" disabled={busy} onClick={() => dispatch({ type: "update", lineId: l.id, quantity: l.quantity + 1 })} aria-label={t.plus}>
                            <Icon name="plus" />
                          </button>
                        </div>
                        <button type="button" className="link link--quiet" disabled={busy} onClick={() => dispatch({ type: "remove", lineId: l.id }, { announce: fill(t.retiree, { piece: l.title }) })}>
                          {t.retirer}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="drawer__gift">
                <label className="check">
                  <input type="checkbox" checked={cart?.gift.wrap ?? false} onChange={(e) => dispatch({ type: "gift", wrap: e.target.checked, message })} />
                  <span>{fill(t.cadeau, { prix: formatPrice(shop.giftWrapPrice, locale) })}</span>
                </label>
                {cart?.gift.wrap ? (
                  <div className="field">
                    <label htmlFor="gift-message" className="field__label">
                      {t.message}
                    </label>
                    <textarea
                      id="gift-message"
                      className="field__input"
                      maxLength={300}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onBlur={() => message !== cart.gift.message && dispatch({ type: "gift", wrap: true, message })}
                      placeholder={t.messageAide}
                    />
                    <span className="field__hint">{fill(t.caracteres, { n: 300 - message.length })}</span>
                  </div>
                ) : null}
                {gift?.wrap ? (
                  <>
                    <label className="check">
                      <input type="checkbox" checked={gift.hidePrices !== false} onChange={(e) => setGift({ hidePrices: e.target.checked })} />
                      <span>{t.masquerPrix}</span>
                    </label>
                    <div className="field">
                      <label htmlFor="gift-date" className="field__label">
                        {t.date}
                      </label>
                      <input
                        id="gift-date"
                        type="date"
                        className="field__input"
                        min={earliestGiftDate(longest?.max ?? 0)}
                        max={latestGiftDate()}
                        value={gift.deliveryDate ?? ""}
                        onChange={(e) => setGift({ deliveryDate: e.target.value || null })}
                      />
                      <span className="field__hint">{t.dateAide}</span>
                    </div>
                  </>
                ) : null}
              </div>

              {suggestions.length ? (
                <section className="drawer__suggest" aria-labelledby="suggest-title">
                  <h3 id="suggest-title" className="t-label">
                    {t.suggestions}
                  </h3>
                  <ul className="drawer__suggest-list">
                    {suggestions.map((s) => (
                      <li key={s.handle} className="suggest">
                        <Link href={`/boutique/${s.handle}`} onClick={close} className="suggest__link">
                          <Media image={s.image} ratio="portrait" sizes="5rem" decorative />
                          <span className="suggest__text">
                            <span className="t-body">{s.title}</span>
                            <span className="price">{formatPrice(s.price, locale)}</span>
                            <ProvisionalNote image={s.image} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <details className="disclosure" open={codesOpen} onToggle={(e) => setCodesOpen((e.target as HTMLDetailsElement).open)}>
                <summary>{t.codes}</summary>
                <div className="disclosure__body stack">
                  <CodeForm label={t.codeAvantage} t={t} current={cart?.discount?.code} onSubmit={(code) => dispatch({ type: "discount", code })} busy={busy} />
                  <CodeForm label={t.carteCadeau} t={t} current={cart?.giftCard?.code} onSubmit={(code) => dispatch({ type: "giftCard", code })} busy={busy} />
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
                  <dt>{t.sousTotal}</dt>
                  <dd>{formatPrice(cart!.subtotal, locale)}</dd>
                </div>
                {cart?.discount ? (
                  <div>
                    <dt>{cart.discount.label}</dt>
                    <dd>− {formatPrice(cart.discount.amount, locale)}</dd>
                  </div>
                ) : null}
                {cart?.gift.wrap ? (
                  <div>
                    <dt>{t.emballage}</dt>
                    <dd>{formatPrice(cart.giftWrapPrice, locale)}</dd>
                  </div>
                ) : null}
                {cart?.giftCard ? (
                  <div>
                    <dt>{t.carteCadeau}</dt>
                    <dd>− {formatPrice(cart.giftCard.amount, locale)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t.livraison}</dt>
                  <dd>{cart?.shippingEstimate === 0 ? t.offerte : t.calculee}</dd>
                </div>
                <div className="totals__total">
                  <dt>{t.total}</dt>
                  <dd>{formatPrice(cart!.total, locale)}</dd>
                </div>
              </dl>
              {longest ? <p className="t-note t-left">{fill(t.surDemande, { delai: delaiText(tc, longest) })}</p> : null}
              {cart?.mode === "shopify" ? (
                <form
                  className="stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // preuve d'acceptation des CGV jointe à la commande Shopify, puis paiement Shopify
                    const ok = await dispatch({ type: "checkout", source: readSource() });
                    if (ok) {
                      track({ name: "begin_checkout", value: cart.total, items: cart.totalQuantity });
                      window.location.href = cart.checkoutUrl;
                    }
                  }}
                >
                  <TermsCheckbox kind="cgv" checked={terms} onChange={setTerms} newTab />
                  <button type="submit" className="btn btn--solid btn--block" disabled={busy || !terms}>
                    {t.commander}
                  </button>
                </form>
              ) : (
                <Link href={cart?.checkoutUrl ?? "/commande"} className="btn btn--solid btn--block" onClick={close}>
                  {t.commander}
                </Link>
              )}
              <p className="t-label t-soft t-center drawer__pay">{t.moyens}</p>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

function CodeForm({ label, t, current, onSubmit, busy }: { label: string; t: CommerceTexts["panier"]; current?: string; onSubmit: (code: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");
  const id = `code-${label.replace(/[^\p{L}\d]+/gu, "-").toLowerCase()}`;
  if (current) {
    return (
      <p className="cart-code">
        <span className="t-label">{fill(t.codeApplique, { type: label, code: current })}</span>
        <button type="button" className="link link--quiet" onClick={() => onSubmit("")}>
          {t.retirer}
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
      <button type="submit" className="btn btn--outline" disabled={busy || !value.trim()}>
        {t.appliquer}
      </button>
    </form>
  );
}
