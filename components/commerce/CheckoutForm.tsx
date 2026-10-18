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
import { useTexts } from "@/components/content/Texts";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { longestLeadTime } from "@/lib/commerce/availability";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import { TermsCheckbox } from "@/components/account/TermsCheckbox";
import { readSource } from "@/components/analytics/source";
import { track } from "@/lib/analytics/track";
import { orderTaxes, ratesFor, shippingPrice as priceOf } from "@/lib/commerce/international";
import type { RelayPoint } from "@/lib/commerce/relays";
import { AddressField } from "./AddressField";
import { ProvisionalNote } from "./ProvisionalNote";

type Pay = "card" | "shop-pay" | "apple-pay" | "google-pay" | "paypal" | "installments";

/** Moyens de paiement, dans l'ordre d'affichage (libellés : document « commerce », commande.moyens). */
const PAY_OPTIONS: Pay[] = ["card", "shop-pay", "apple-pay", "google-pay", "paypal", "installments"];

/** Paiement express : un geste, l'adresse reprise du portefeuille (en production, chez Shopify). */
const EXPRESS: Pay[] = ["shop-pay", "apple-pay", "google-pay", "paypal"];

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
  const texts = useTexts<CommerceTexts>("commerce");
  const t = texts.commande;
  const p = texts.panier;
  const f = t.champs;
  const tc = useTexts<CatalogueTexts>("catalogue");
  const retrait = t.retrait.split("{lien}");
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
  // chaque pièce est créée sur demande : la commande part quand la dernière est prête
  const longest = longestLeadTime((cart?.lines ?? []).map((l) => l.leadTime));

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
                  <p className="t-label t-soft">{fill(t.ligne, { taille: l.size, n: l.quantity })}</p>
                  <p className="t-note t-left">{fill(t.delaiLigne, { delai: delaiText(tc, l.leadTime) })}</p>
                  <ProvisionalNote image={l.image} />
                </div>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div>
              <dt>{p.sousTotal}</dt>
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
                <dt>{p.emballage}</dt>
                <dd>{formatPrice(cart.giftWrapPrice)}</dd>
              </div>
            ) : null}
            {cart.giftCard ? (
              <div>
                <dt>{p.carteCadeau}</dt>
                <dd>− {formatPrice(cart.giftCard.amount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{p.livraison}</dt>
              <dd>{shippingPrice ? formatPrice(shippingPrice) : p.offerte}</dd>
            </div>
            {exp ? (
              <>
                <div>
                  <dt>{t.horsTva}</dt>
                  <dd>{formatPrice(exp.exVat)}</dd>
                </div>
                {exp.duty ? (
                  <div>
                    <dt>{fill(t.droits, { taux: Math.round(exp.dutyRate * 100) })}</dt>
                    <dd>{formatPrice(exp.duty)}</dd>
                  </div>
                ) : null}
                {exp.importVat ? (
                  <div>
                    <dt>{fill(t.tvaImport, { libelle: importLabel.charAt(0).toUpperCase() + importLabel.slice(1), taux: Math.round(exp.importVatRate * 1000) / 10 })}</dt>
                    <dd>{formatPrice(exp.importVat)}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="totals__total">
              <dt>{exp ? t.totalTaxes : t.totalTtc}</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
            {!exp ? (
              <div className="t-soft">
                <dt>{fill(t.dontTva, { taux: Math.round(taxes.vatRate * 100) })}</dt>
                <dd>{formatPrice(taxes.vat)}</dd>
              </div>
            ) : null}
          </dl>
          {exp ? <p className="t-note">{t.taxesPayees}</p> : null}
          {cart.gift.wrap && cart.gift.message ? <p className="t-note">{fill(t.messageCadeau, { message: cart.gift.message })}</p> : null}
        </div>
  ) : null;

  if (!cart) return <p className="t-note">{t.chargement}</p>;
  if (!cart.lines.length) {
    return (
      <div className="stack-m">
        <p className="t-lead">{t.vide}</p>
        <div>
          <Link href="/boutique" className="btn">
            {t.videAction}
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("loading");
    setError("");
    const body = {
      email: form.get("email"),
      newsletter: form.get("newsletter") === "on",
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      address1: form.get("address1"),
      address2: form.get("address2") || undefined,
      zip: form.get("zip"),
      city: form.get("city"),
      country,
      phone: form.get("phone") || undefined,
      shippingRateId: rate?.id,
      relayId: rate?.relay ? relayId || undefined : undefined,
      paymentMethod: pay,
      // mode test : aucune donnée de carte ne quitte le navigateur, seulement l'issue simulée
      testOutcome: pay === "card" ? testOutcome(String(form.get("cardNumber") ?? "")) : undefined,
      acceptTerms: form.get("terms") === "on",
      source: readSource(),
    };
    if (rate?.relay && !relayId) {
      setState("error");
      setError(t.relaisManquant);
      return;
    }
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setState("error");
      setError(j.error ?? t.erreur);
      return;
    }
    router.push(`/commande/confirmation?n=${encodeURIComponent(j.number)}&t=${encodeURIComponent(j.token)}`);
  }

  return (
    <div className="checkout">
      <aside className="checkout-summary scene" data-theme="pearl" aria-label={t.recapitulatif}>
        <button type="button" className="checkout-summary__toggle" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((v) => !v)}>
          <span className="t-label">{summaryOpen ? t.recapMasquer : t.recapAfficher}</span>
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
        <p className="notice t-note">{t.modeTest}</p>

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
                {t.moyens[id].label}
              </button>
            ))}
          </div>
          <p className="t-note">{t.expressNote}</p>
        </section>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">I</span>
            <span className="t-h3">{t.etapes.coordonnees}</span>
          </legend>
          <div className="stack-m">
            <div className="field">
              <label className="field__label" htmlFor="co-email">
                {f.email}
              </label>
              <input ref={emailRef} className="field__input" id="co-email" name="email" key={`email-${prefill.email ?? ""}`} defaultValue={prefill.email} type="email" required autoComplete="email" />
              <span className="field__hint">{f.emailAide}</span>
            </div>
            <label className="check t-note">
              <input type="checkbox" name="newsletter" />
              <span>{f.lettres}</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">II</span>
            <span className="t-h3">{t.etapes.livraison}</span>
          </legend>
          <div className="stack-m">
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="co-first">
                  {f.prenom}
                </label>
                <input className="field__input" id="co-first" name="firstName" key={`firstName-${prefill.firstName ?? ""}`} defaultValue={prefill.firstName} required autoComplete="given-name" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-last">
                  {f.nom}
                </label>
                <input className="field__input" id="co-last" name="lastName" key={`lastName-${prefill.lastName ?? ""}`} defaultValue={prefill.lastName} required autoComplete="family-name" />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="co-address1">
                {f.adresse}
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
                {f.complement}
              </label>
              <input className="field__input" id="co-address2" name="address2" key={`address2-${prefill.line2 ?? ""}`} defaultValue={prefill.line2} autoComplete="address-line2" />
            </div>
            <div className="form__row form__row--3">
              <div className="field">
                <label className="field__label" htmlFor="co-zip">
                  {f.codePostal}
                </label>
                <input className="field__input" id="co-zip" name="zip" value={zip} onChange={(e) => setZip(e.target.value)} required autoComplete="postal-code" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-city">
                  {f.ville}
                </label>
                <input className="field__input" id="co-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required autoComplete="address-level2" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="co-country">
                  {f.pays}
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
                {f.telephone}
              </label>
              <input className="field__input" id="co-phone" name="phone" key={`phone-${prefill.phone ?? ""}`} defaultValue={prefill.phone} type="tel" autoComplete="tel" />
            </div>
            <fieldset className="field">
              <legend className="field__label">{f.modeLivraison}</legend>
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
                      <span className="price">{r.price === 0 || free ? p.offerte : formatPrice(r.price)}</span>
                    </label>
                  );
                })}
              </div>
              {longest ? <p className="t-note t-left">{fill(t.surDemande, { delai: delaiText(tc, longest) })}</p> : null}
            </fieldset>
            {rate?.relay ? (
              <fieldset className="field">
                <legend className="field__label">{f.pointRelais}</legend>
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
                  <p className="t-note">{f.pointRelaisAide}</p>
                )}
              </fieldset>
            ) : null}
            {rate?.pickup ? (
              <p className="notice t-note">
                {retrait[0]}
                <Link href="/rendez-vous">{t.retraitLien}</Link>
                {retrait[1]}
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="checkout-step">
          <legend className="checkout-step__title">
            <span className="step__num">III</span>
            <span className="t-h3">{t.etapes.paiement}</span>
          </legend>
          <div className="stack-m">
            <div className="options">
              {PAY_OPTIONS.map((id) => (
                <label key={id} className="option">
                  <input type="radio" name="pay" value={id} checked={pay === id} onChange={() => setPay(id)} />
                  <span className="option__body">
                    <span className="option__title">{t.moyens[id].label}</span>
                    <span className="t-note">{t.moyens[id].note}</span>
                  </span>
                </label>
              ))}
            </div>
            {pay === "card" ? (
              <div className="form__row form__row--3 card-fields">
                <div className="field">
                  <label className="field__label" htmlFor="co-card">
                    {f.carte}
                  </label>
                  <input className="field__input" id="co-card" name="cardNumber" inputMode="numeric" autoComplete="off" required defaultValue="4242 4242 4242 4242" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-exp">
                    {f.expiration}
                  </label>
                  <input className="field__input" id="co-exp" name="exp" autoComplete="off" placeholder={f.expirationExemple} required defaultValue="12 / 30" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="co-cvc">
                    {f.cryptogramme}
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
                ? t.paiementEnCours
                : pay === "paypal"
                  ? fill(t.payerPaypal, { total: formatPrice(total) })
                  : pay === "installments"
                    ? fill(t.payerPlusieurs, { total: formatPrice(total) })
                    : pay === "card"
                      ? fill(t.payer, { total: formatPrice(total) })
                      : fill(t.payerAvec, { total: formatPrice(total), moyen: t.moyens[pay].label })}
            </button>
            <p className="t-note t-center">{t.securite}</p>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
