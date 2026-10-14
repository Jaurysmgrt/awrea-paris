"use client";
/**
 * Tunnel de commande court, sans compte obligatoire — MODE TEST.
 * Paiement express en tête, puis trois étapes sur une seule page : coordonnées, livraison, paiement.
 * Suggestions d'adresses, points relais, retrait à l'atelier, droits et taxes calculés à l'avance
 * hors Union européenne. En production (Shopify), le bouton « Commander » du panier mène au
 * paiement Shopify, qui fait tout cela lui-même.
 */
import Link from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { Media } from "@/components/ui/Media";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { TermsCheckbox } from "@/components/account/TermsCheckbox";
import { readSource } from "@/components/analytics/source";
import { track } from "@/lib/analytics/track";
import { orderTaxes, ratesFor, shippingPrice as priceOf } from "@/lib/commerce/international";
import type { RelayPoint } from "@/lib/commerce/relays";
import { AddressField } from "./AddressField";

type Pay = "card" | "shop-pay" | "apple-pay" | "google-pay" | "paypal" | "installments";

const PAY_OPTIONS: { id: Pay; label: string; note: string }[] = [
  { id: "card", label: "Carte bancaire", note: "Visa, Mastercard, American Express, Carte Bancaire" },
  { id: "shop-pay", label: "Shop Pay", note: "Paiement accéléré, coordonnées enregistrées chez Shopify" },
  { id: "apple-pay", label: "Apple Pay", note: "Validation sur votre appareil Apple" },
  { id: "google-pay", label: "Google Pay", note: "Validation avec votre compte Google" },
  { id: "paypal", label: "PayPal", note: "Vous serez redirigée vers PayPal" },
  { id: "installments", label: "Paiement en 3 ou 4 fois", note: "Sans frais à partir de 100 €, sous réserve d’acceptation" },
];

/** Paiement express : un geste, l'adresse reprise du portefeuille (en production, chez Shopify). */
const EXPRESS: Pay[] = ["shop-pay", "apple-pay", "google-pay", "paypal"];
const PAY_LABEL = Object.fromEntries(PAY_OPTIONS.map((o) => [o.id, o.label])) as Record<Pay, string>;

/**
 * Mode test uniquement : la carte « refusée » de test (4000 0000 0000 0002) simule un refus.
 * Le numéro reste dans le navigateur ; en production, le paiement se fait chez Shopify.
 */
function testOutcome(cardNumber: string): "accepted" | "declined" | "incomplete" {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits === "4000000000000002") return "declined";
  return digits.length < 15 ? "incomplete" : "accepted";
}

export function CheckoutForm() {
  const { cart } = useCart();
  const router = useRouter();
  const [country, setCountry] = useState("FR");
  const [rateId, setRateId] = useState("fr-colissimo");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [relays, setRelays] = useState<RelayPoint[]>([]);
  const [relayId, setRelayId] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const [pay, setPay] = useState<Pay>("card");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [terms, setTerms] = useState(false);
  const startedRef = useRef(false);
  const [prefill, setPrefill] = useState<{ email?: string; firstName?: string; lastName?: string; line1?: string; line2?: string; postalCode?: string; city?: string; phone?: string }>({});

  // cliente connectée : coordonnées et adresse par défaut préremplies
  useEffect(() => {
    if (!/(?:^|; )awrea_signed_in=1/.test(document.cookie)) return;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.user) return;
        const a = j.addresses?.find((x: { isDefault: boolean }) => x.isDefault) ?? j.addresses?.[0];
        setPrefill({
          email: j.user.email,
          firstName: a?.firstName ?? j.profile?.firstName ?? undefined,
          lastName: a?.lastName ?? j.profile?.lastName ?? undefined,
          line1: a?.line1,
          line2: a?.line2 ?? undefined,
          postalCode: a?.postalCode,
          city: a?.city,
          phone: a?.phone ?? j.profile?.phone ?? undefined,
        });
        if (a?.postalCode) setZip(a.postalCode);
        if (a?.city) setCity(a.city);
        if (a?.country && shop.countries.some((c) => c.code === a.country)) {
          setCountry(a.country);
          setRateId(ratesFor(a.country)[0]?.id ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const rates = ratesFor(country);
  const rate = rates.find((r) => r.id === rateId) ?? rates[0];
  const merchandise = cart ? cart.subtotal - (cart.discount?.amount ?? 0) : 0;
  const shippingPrice = rate ? priceOf(rate, merchandise) : 0;
  // pièces et emballage (remises déduites), puis taxes du pays ; la carte cadeau paie le reste
  const taxable = merchandise + (cart?.gift.wrap ? cart.giftWrapPrice : 0);
  const { taxes, total: gross } = orderTaxes(country, taxable, shippingPrice);
  const total = Math.max(0, gross - (cart?.giftCard?.amount ?? 0));
  const exp = taxes.export;
  const importLabel = shop.importRates[country]?.vatLabel ?? "TVA à l’importation";
  const preorder = cart?.lines.some((l) => l.preorder);

  // points relais proches du code postal saisi
  useEffect(() => {
    if (!rate?.relay || zip.replace(/\s/g, "").length < 4) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/livraison/relais?zip=${encodeURIComponent(zip)}&country=${country}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setRelays(j.points ?? []))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [rate?.relay, zip, country]);
  const relayList = rate?.relay && zip.replace(/\s/g, "").length >= 4 ? relays : [];

  const summary = cart ? (
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
            {exp ? (
              <>
                <div>
                  <dt>Pièces et livraison hors TVA française</dt>
                  <dd>{formatPrice(exp.exVat)}</dd>
                </div>
                {exp.duty ? (
                  <div>
                    <dt>Droits de douane ({Math.round(exp.dutyRate * 100)} %)</dt>
                    <dd>{formatPrice(exp.duty)}</dd>
                  </div>
                ) : null}
                {exp.importVat ? (
                  <div>
                    <dt>
                      {importLabel.charAt(0).toUpperCase() + importLabel.slice(1)} ({Math.round(exp.importVatRate * 1000) / 10} %)
                    </dt>
                    <dd>{formatPrice(exp.importVat)}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="totals__total">
              <dt>{exp ? "Total, droits et taxes compris" : "Total TTC"}</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
            {!exp ? (
              <div className="t-soft">
                <dt>dont TVA ({Math.round(taxes.vatRate * 100)} %)</dt>
                <dd>{formatPrice(taxes.vat)}</dd>
              </div>
            ) : null}
          </dl>
          {exp ? <p className="t-note">Droits et taxes payés dès maintenant : rien à régler à la livraison. Estimation indicative en mode test.</p> : null}
          {cart.gift.wrap && cart.gift.message ? <p className="t-note">Message cadeau : « {cart.gift.message} »</p> : null}
        </div>
  ) : null;

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
      relayId: rate?.relay ? relayId || undefined : undefined,
      paymentMethod: pay,
      // mode test : aucune donnée de carte ne quitte le navigateur, seulement l'issue simulée
      testOutcome: pay === "card" ? testOutcome(String(f.get("cardNumber") ?? "")) : undefined,
      acceptTerms: f.get("terms") === "on",
      source: readSource(),
    };
    if (rate?.relay && !relayId) {
      setState("error");
      setError("Merci de choisir un point relais.");
      return;
    }
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

      <form
        className="checkout-form stack-l"
        onSubmit={onSubmit}
        onFocusCapture={() => {
          if (!startedRef.current && cart) {
            startedRef.current = true;
            track({ name: "begin_checkout", value: cart.total, items: cart.totalQuantity });
          }
        }}
      >
        <p className="notice t-note">
          Mode test : aucun paiement réel n’est effectué. Carte de test acceptée : 4242 4242 4242 4242 — carte refusée : 4000 0000 0000 0002.
        </p>

        <section className="express" aria-labelledby="express-title">
          <h2 id="express-title" className="t-label">
            Paiement express
          </h2>
          <div className="express__buttons">
            {EXPRESS.map((id) => (
              <button
                key={id}
                type="button"
                className="btn express__btn"
                aria-pressed={pay === id}
                onClick={() => {
                  setPay(id);
                  emailRef.current?.focus();
                }}
              >
                {PAY_LABEL[id]}
              </button>
            ))}
          </div>
          <p className="t-note">En production, l’adresse est reprise de votre portefeuille ; en mode test, complétez-la ci-dessous.</p>
        </section>

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
              <input ref={emailRef} className="field__input" id="co-email" name="email" key={`email-${prefill.email ?? ""}`} defaultValue={prefill.email} type="email" required autoComplete="email" />
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
                <input className="field__input" id="co-first" name="firstName" key={`firstName-${prefill.firstName ?? ""}`} defaultValue={prefill.firstName} required autoComplete="given-name" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-last">
                  Nom
                </label>
                <input className="field__input" id="co-last" name="lastName" key={`lastName-${prefill.lastName ?? ""}`} defaultValue={prefill.lastName} required autoComplete="family-name" />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-address1">
                Adresse
              </label>
              <AddressField
                key={`address1-${prefill.line1 ?? ""}`}
                id="co-address1"
                name="address1"
                defaultValue={prefill.line1}
                country={country}
                onPick={(a) => {
                  setZip(a.postalCode);
                  setCity(a.city);
                }}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-address2">
                Complément (facultatif)
              </label>
              <input className="field__input" id="co-address2" name="address2" key={`address2-${prefill.line2 ?? ""}`} defaultValue={prefill.line2} autoComplete="address-line2" />
            </div>
            <div className="form__row form__row--3">
              <div className="field">
                <label className="field__label" htmlFor="co-zip">
                  Code postal
                </label>
                <input className="field__input" id="co-zip" name="zip" value={zip} onChange={(e) => setZip(e.target.value)} required autoComplete="postal-code" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-city">
                  Ville
                </label>
                <input className="field__input" id="co-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required autoComplete="address-level2" />
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
                    setRateId(ratesFor(e.target.value)[0]?.id ?? "");
                    setRelayId("");
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
              <input className="field__input" id="co-phone" name="phone" key={`phone-${prefill.phone ?? ""}`} defaultValue={prefill.phone} type="tel" autoComplete="tel" />
            </div>
            <fieldset className="field">
              <legend className="field__label">Mode de livraison</legend>
              <div className="options">
                {rates.map((r) => {
                  const free = r.freeAboveThreshold && merchandise >= shop.freeShippingThreshold;
                  return (
                    <label key={r.id} className="option">
                      <input
                        type="radio"
                        name="rate"
                        value={r.id}
                        checked={rate?.id === r.id}
                        onChange={() => {
                          setRateId(r.id);
                          setRelayId("");
                        }}
                      />
                      <span className="option__body">
                        <span className="option__title">{r.label}</span>
                        <span className="t-note">{r.delay}</span>
                      </span>
                      <span className="price">{r.price === 0 || free ? "Offerte" : formatPrice(r.price)}</span>
                    </label>
                  );
                })}
              </div>
              {preorder ? <p className="t-note">Votre commande contient une pièce sur commande : l’ensemble sera expédié à la fin de sa fabrication.</p> : null}
            </fieldset>
            {rate?.relay ? (
              <fieldset className="field">
                <legend className="field__label">Point relais</legend>
                {relayList.length ? (
                  <div className="options">
                    {relayList.map((p) => (
                      <label key={p.id} className="option">
                        <input type="radio" name="relay" value={p.id} checked={relayId === p.id} onChange={() => setRelayId(p.id)} />
                        <span className="option__body">
                          <span className="option__title">{p.name}</span>
                          <span className="t-note">
                            {p.address} · {p.hours}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="t-note">Indiquez votre code postal : les points relais les plus proches apparaîtront ici.</p>
                )}
              </fieldset>
            ) : null}
            {rate?.pickup ? (
              <p className="notice t-note">
                Retrait à l’atelier : dès que votre pièce est prête, nous vous écrivons pour convenir d’un rendez-vous. Vous pouvez aussi{" "}
                <Link href="/rendez-vous">choisir un créneau</Link> dès maintenant.
              </p>
            ) : null}
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
                  <input className="field__input" id="co-card" name="cardNumber" inputMode="numeric" autoComplete="off" required defaultValue="4242 4242 4242 4242" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-exp">
                    Expiration
                  </label>
                  <input className="field__input" id="co-exp" name="exp" autoComplete="off" placeholder="MM / AA" required defaultValue="12 / 30" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-cvc">
                    Cryptogramme
                  </label>
                  <input className="field__input" id="co-cvc" name="cvc" inputMode="numeric" autoComplete="off" required defaultValue="123" />
                </div>
              </div>
            ) : null}
            <TermsCheckbox kind="cgv" checked={terms} onChange={setTerms} newTab />
            {state === "error" ? (
              <p className="field__error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn--solid btn--block" disabled={state === "loading"}>
              {state === "loading"
                ? "Paiement en cours…"
                : pay === "shop-pay"
                  ? `Payer avec Shop Pay — ${formatPrice(total)}`
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
