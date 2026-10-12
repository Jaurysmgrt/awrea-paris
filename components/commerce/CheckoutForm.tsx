"use client";
/**
 * Tunnel de commande court, sans compte obligatoire — MODE TEST.
 * Trois étapes sur une seule page : coordonnées, livraison, paiement.
 * En production (Shopify), le bouton « Commander » du panier mène directement au checkout Shopify.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import { Media } from "@/components/ui/Media";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";

type Pay = "card" | "apple-pay" | "google-pay" | "paypal" | "installments";

const PAY_OPTIONS: { id: Pay; label: string; note: string }[] = [
  { id: "card", label: "Carte bancaire", note: "Visa, Mastercard, American Express, Carte Bancaire" },
  { id: "apple-pay", label: "Apple Pay", note: "Validation sur votre appareil Apple" },
  { id: "google-pay", label: "Google Pay", note: "Validation avec votre compte Google" },
  { id: "paypal", label: "PayPal", note: "Vous serez redirigée vers PayPal" },
  { id: "installments", label: "Paiement en 3 ou 4 fois", note: "Sans frais à partir de 100 €, sous réserve d’acceptation" },
];

export function CheckoutForm() {
  const { cart } = useCart();
  const router = useRouter();
  const [country, setCountry] = useState("FR");
  const [rateId, setRateId] = useState("fr-colissimo");
  const [pay, setPay] = useState<Pay>("card");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const zone = shop.countries.find((c) => c.code === country)?.zone ?? "FR";
  const rates = shop.shippingRates.filter((r) => r.zone === zone);
  const rate = rates.find((r) => r.id === rateId) ?? rates[0];
  const merchandise = cart ? cart.subtotal - (cart.discount?.amount ?? 0) : 0;
  const shippingPrice = rate ? (rate.freeAboveThreshold && merchandise >= shop.freeShippingThreshold ? 0 : rate.price) : 0;
  const total = (cart?.total ?? 0) + shippingPrice;
  const preorder = cart?.lines.some((l) => l.preorder);

  const summary = useMemo(
    () =>
      cart ? (
        <div className="checkout-summary__inner stack-m">
          <ul className="stack-m">
            {cart.lines.map((l) => (
              <li key={l.id} className="cart-line">
                <Media image={l.image} ratio="portrait" sizes="6rem" />
                <div className="cart-line__info">
                  <div className="cart-line__top">
                    <span className="t-h4">{l.title}</span>
                    <span className="price">{formatPrice(l.unitPrice * l.quantity)}</span>
                  </div>
                  <p className="t-label t-soft">
                    Taille {l.size} · Qté {l.quantity}
                    {l.editionLabel ? ` · ${l.editionLabel}` : ""}
                  </p>
                  {l.preorder ? <p className="t-note">Sur commande — {l.leadTimeWeeks ?? 4} semaines de fabrication</p> : null}
                </div>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div>
              <dt>Sous-total</dt>
              <dd>{formatPrice(cart.subtotal)}</dd>
            </div>
            {cart.discount ? (
              <div>
                <dt>{cart.discount.label}</dt>
                <dd>− {formatPrice(cart.discount.amount)}</dd>
              </div>
            ) : null}
            {cart.gift.wrap ? (
              <div>
                <dt>Emballage cadeau</dt>
                <dd>{formatPrice(cart.giftWrapPrice)}</dd>
              </div>
            ) : null}
            {cart.giftCard ? (
              <div>
                <dt>Carte cadeau</dt>
                <dd>− {formatPrice(cart.giftCard.amount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Livraison</dt>
              <dd>{shippingPrice ? formatPrice(shippingPrice) : "Offerte"}</dd>
            </div>
            <div className="totals__total">
              <dt>Total TTC</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>
          {cart.gift.wrap && cart.gift.message ? <p className="t-note">Message cadeau : « {cart.gift.message} »</p> : null}
        </div>
      ) : null,
    [cart, shippingPrice, total],
  );

  if (!cart) return <p className="t-note">Chargement…</p>;
  if (!cart.lines.length) {
    return (
      <div className="stack-m">
        <p className="t-lead">Votre panier est vide.</p>
        <div>
          <Link href="/boutique" className="btn">
            Découvrir la boutique
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("loading");
    setError("");
    const body = {
      email: f.get("email"),
      newsletter: f.get("newsletter") === "on",
      firstName: f.get("firstName"),
      lastName: f.get("lastName"),
      address1: f.get("address1"),
      address2: f.get("address2") || undefined,
      zip: f.get("zip"),
      city: f.get("city"),
      country,
      phone: f.get("phone") || undefined,
      shippingRateId: rate?.id,
      paymentMethod: pay,
      cardNumber: pay === "card" ? f.get("cardNumber") : undefined,
      acceptTerms: f.get("terms") === "on",
    };
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setState("error");
      setError(j.error ?? "Le paiement n’a pas abouti. Merci de réessayer.");
      return;
    }
    router.push(`/commande/confirmation?n=${encodeURIComponent(j.number)}&t=${encodeURIComponent(j.token)}`);
  }

  return (
    <div className="checkout">
      <aside className="checkout-summary scene" data-theme="pearl" aria-label="Récapitulatif de la commande">
        <button type="button" className="checkout-summary__toggle" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((v) => !v)}>
          <span className="t-label">{summaryOpen ? "Masquer" : "Afficher"} le récapitulatif</span>
          <span className="price">{formatPrice(total)}</span>
        </button>
        <div className="checkout-summary__body" data-open={summaryOpen}>
          {summary}
        </div>
      </aside>

      <form className="checkout-form stack-l" onSubmit={onSubmit}>
        <p className="notice t-note">
          Mode test : aucun paiement réel n’est effectué. Carte de test acceptée : 4242 4242 4242 4242 — carte refusée : 4000 0000 0000 0002.
        </p>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">I</span>
            <span className="t-h3">Coordonnées</span>
          </legend>
          <div className="stack-m">
            <div className="field">
              <label className="field__label" htmlFor="co-email">
                E-mail
              </label>
              <input className="field__input" id="co-email" name="email" type="email" required autoComplete="email" />
              <span className="field__hint">Pour la confirmation et le suivi. Aucun compte n’est nécessaire.</span>
            </div>
            <label className="check t-note">
              <input type="checkbox" name="newsletter" />
              <span>Recevoir les lettres de l’atelier (une par saison).</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">II</span>
            <span className="t-h3">Livraison</span>
          </legend>
          <div className="stack-m">
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="co-first">
                  Prénom
                </label>
                <input className="field__input" id="co-first" name="firstName" required autoComplete="given-name" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-last">
                  Nom
                </label>
                <input className="field__input" id="co-last" name="lastName" required autoComplete="family-name" />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-address1">
                Adresse
              </label>
              <input className="field__input" id="co-address1" name="address1" required autoComplete="address-line1" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-address2">
                Complément (facultatif)
              </label>
              <input className="field__input" id="co-address2" name="address2" autoComplete="address-line2" />
            </div>
            <div className="form__row form__row--3">
              <div className="field">
                <label className="field__label" htmlFor="co-zip">
                  Code postal
                </label>
                <input className="field__input" id="co-zip" name="zip" required autoComplete="postal-code" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-city">
                  Ville
                </label>
                <input className="field__input" id="co-city" name="city" required autoComplete="address-level2" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-country">
                  Pays
                </label>
                <select
                  className="field__input"
                  id="co-country"
                  value={country}
                  autoComplete="country"
                  onChange={(e) => {
                    setCountry(e.target.value);
                    const z = shop.countries.find((c) => c.code === e.target.value)?.zone;
                    setRateId(shop.shippingRates.find((r) => r.zone === z)?.id ?? "");
                  }}
                >
                  {shop.countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-phone">
                Téléphone (pour le transporteur, facultatif)
              </label>
              <input className="field__input" id="co-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <fieldset className="field">
              <legend className="field__label">Mode de livraison</legend>
              <div className="options">
                {rates.map((r) => {
                  const free = r.freeAboveThreshold && merchandise >= shop.freeShippingThreshold;
                  return (
                    <label key={r.id} className="option">
                      <input type="radio" name="rate" value={r.id} checked={rate?.id === r.id} onChange={() => setRateId(r.id)} />
                      <span className="option__body">
                        <span className="option__title">{r.label}</span>
                        <span className="t-note">{r.delay}</span>
                      </span>
                      <span className="price">{r.price === 0 || free ? "Offerte" : formatPrice(r.price)}</span>
                    </label>
                  );
                })}
              </div>
              {preorder ? <p className="t-note">Votre commande contient une pièce sur commande : l’ensemble sera expédié à la fin de sa fabrication.</p> : null}
            </fieldset>
          </div>
        </fieldset>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">III</span>
            <span className="t-h3">Paiement</span>
          </legend>
          <div className="stack-m">
            <div className="options">
              {PAY_OPTIONS.map((o) => (
                <label key={o.id} className="option">
                  <input type="radio" name="pay" value={o.id} checked={pay === o.id} onChange={() => setPay(o.id)} />
                  <span className="option__body">
                    <span className="option__title">{o.label}</span>
                    <span className="t-note">{o.note}</span>
                  </span>
                </label>
              ))}
            </div>
            {pay === "card" ? (
              <div className="form__row form__row--3 card-fields">
                <div className="field">
                  <label className="field__label" htmlFor="co-card">
                    Numéro de carte
                  </label>
                  <input className="field__input" id="co-card" name="cardNumber" inputMode="numeric" autoComplete="cc-number" required defaultValue="4242 4242 4242 4242" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-exp">
                    Expiration
                  </label>
                  <input className="field__input" id="co-exp" name="exp" autoComplete="cc-exp" placeholder="MM / AA" required defaultValue="12 / 30" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-cvc">
                    Cryptogramme
                  </label>
                  <input className="field__input" id="co-cvc" name="cvc" inputMode="numeric" autoComplete="cc-csc" required defaultValue="123" />
                </div>
              </div>
            ) : null}
            <label className="check t-note">
              <input type="checkbox" name="terms" required />
              <span>
                J’accepte les <Link href="/cgv" className="text-link" target="_blank">conditions générales de vente</Link> et j’ai pris connaissance de la{" "}
                <Link href="/confidentialite" className="text-link" target="_blank">
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>
            {state === "error" ? (
              <p className="field__error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn--solid btn--block" disabled={state === "loading"}>
              {state === "loading"
                ? "Paiement en cours…"
                : pay === "apple-pay"
                  ? `Payer avec Apple Pay — ${formatPrice(total)}`
                  : pay === "google-pay"
                    ? `Payer avec Google Pay — ${formatPrice(total)}`
                    : pay === "paypal"
                      ? `Continuer avec PayPal — ${formatPrice(total)}`
                      : pay === "installments"
                        ? `Payer en plusieurs fois — ${formatPrice(total)}`
                        : `Payer ${formatPrice(total)}`}
            </button>
            <p className="t-note t-center">Paiement sécurisé. Vos données bancaires ne transitent jamais par nos serveurs.</p>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
