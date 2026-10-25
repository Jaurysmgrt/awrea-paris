"use client";
/**
 * Rubriques de l'espace « Mon compte ». Les commandes montrent la frise de leur confection
 * (OrderStages, document « suivi-commande ») ; les certificats leur numéro de création (document
 * « certificat »). Ces deux documents sont transmis par le TextsRoot de la page /compte.
 */
import { useState } from "react";
import Link from "@/components/ui/Link";
import { formatDate, formatPrice } from "@/lib/format";
import { useWishlist } from "@/components/commerce/WishlistProvider";
import { useConsent } from "@/components/consent/ConsentProvider";
import { useTexts } from "@/components/content/Texts";
import { OrderStages, type SuiviTexts } from "@/components/commerce/OrderStages";
import { accountCopy as t } from "@/content/fr/account";
import { shop } from "@/content/settings";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import type { Order } from "@/lib/commerce/types";
import type { OrderTimeline } from "@/lib/customers/order-timeline";
import type { Address, CustomerProfile, Sizes } from "@/lib/customers/types";
import type { PublicCertificate } from "@/lib/certificates";

type CertificatTexts = typeof import("@/content/site/fr/certificat.json");

export type AccountOrder = Order & { statusLabel: string; trackingUrl: string | null; followUrl?: string; timeline: OrderTimeline };

const SIZES = ["XS", "S", "M", "L", "XL"] as const;
const COUNTRIES = shop.countries;

async function send<T>(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  return { ok: Boolean(res?.ok), data };
}

function Saved({ message }: { message: string | null }) {
  return message ? (
    <p className="t-note account__saved" role="status">
      {message}
    </p>
  ) : null;
}

// ------------------------------------------------------------------ commandes
export function OrdersPanel({ orders }: { orders: AccountOrder[] }) {
  const stages = useTexts<SuiviTexts>("suivi-commande").frise;
  const catalogue = useTexts<CatalogueTexts>("catalogue");
  if (!orders.length) {
    return (
      <p className="t-body">
        {t.orders.empty}{" "}
        <Link href="/boutique" className="text-link">
          {t.orders.shop}
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="stack-l">
      <ul className="orders">
        {orders.map((o) => (
          <li key={o.id} className="order">
            <div className="order__head">
              <h3 className="t-h4">{t.orders.title(o.number)}</h3>
              <span className="t-label t-soft">{formatDate(o.createdAt)}</span>
            </div>
            <OrderStages
              timeline={o.timeline}
              t={stages}
              delai={o.timeline.leadTime ? delaiText(catalogue, o.timeline.leadTime) : null}
              label={t.orders.stages(o.number)}
            />
            <ul className="order__lines">
              {o.lines.map((l, i) => (
                <li key={i} className="t-body">
                  <Link href={`/boutique/${l.handle}`} className="link-plain">
                    {l.title}
                  </Link>{" "}
                  · {t.orders.size(l.size)}
                </li>
              ))}
            </ul>
            <p className="price">
              {t.orders.total} {formatPrice(o.total)}
            </p>
            {o.trackingUrl ? (
              <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="link">
                {t.orders.track} ({o.shipping.carrier} {o.shipping.tracking})
              </a>
            ) : null}
            {o.followUrl ? (
              <Link href={o.followUrl} className="link">
                {t.orders.follow}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="stack">
        <h3 className="t-label">{t.orders.returns}</h3>
        <p className="t-body">{t.orders.returnsNote}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ certificats
export function CertificatesPanel({ certificates }: { certificates: PublicCertificate[] }) {
  const tc = useTexts<CertificatTexts>("certificat");
  return (
    <div className="stack-l">
      <p className="t-body">{certificates.length ? t.certificates.intro : t.certificates.empty}</p>
      {certificates.length ? (
        <ul className="certificates">
          {certificates.map((c) => (
            <li key={c.serial} className="certificates__item">
              <div className="stack-s">
                <h3 className="t-h4">{c.productTitle}</h3>
                <p className="t-label t-soft">
                  {[c.creation ? fill(tc.creation, { numero: c.creation }) : null, c.size ? t.orders.size(c.size) : null, formatDate(c.madeOn)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="t-label certificates__serial">{c.serial}</p>
              <Link href={`/certificat/${c.serial}`} className="link">
                {t.certificates.open}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="t-note">{t.certificates.gift}</p>
    </div>
  );
}

// ------------------------------------------------------------------ tailles
export function SizesPanel({ profile, onSaved }: { profile: CustomerProfile; onSaved: (p: CustomerProfile) => void }) {
  const [sizes, setSizes] = useState<Sizes>(profile.sizes ?? {});
  const [msg, setMsg] = useState<string | null>(null);
  const setMeasure = (k: keyof NonNullable<Sizes["mesures"]>, v: string) =>
    setSizes((s) => ({ ...s, mesures: { ...s.mesures, [k]: v ? Math.round(Number(v)) : undefined } }));
  return (
    <form
      className="form stack-m"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await send<{ profile: CustomerProfile }>("/api/account/profile", "PATCH", { sizes });
        setMsg(r.ok ? t.sizes.saved : (r.data.error ?? "Enregistrement impossible."));
        if (r.ok) onSaved(r.data.profile);
      }}
    >
      <p className="t-body">{t.sizes.intro}</p>
      <div className="form__row form__row--3">
        {(["haut", "bas", "robe"] as const).map((k) => (
          <div key={k} className="field">
            <label className="field__label" htmlFor={`size-${k}`}>
              {t.sizes[k]}
            </label>
            <select id={`size-${k}`} className="field__input" value={sizes[k] ?? ""} onChange={(e) => setSizes((s) => ({ ...s, [k]: e.target.value || undefined }))}>
              <option value="">À choisir</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <fieldset className="field">
        <legend className="field__label">{t.sizes.mesures}</legend>
        <div className="form__row form__row--4">
          {(["poitrine", "taille", "hanches", "stature"] as const).map((k) => (
            <div key={k} className="field">
              <label className="field__label" htmlFor={`m-${k}`}>
                {t.sizes[k]}
              </label>
              <input
                id={`m-${k}`}
                className="field__input"
                inputMode="numeric"
                type="number"
                min={40}
                max={220}
                value={sizes.mesures?.[k] ?? ""}
                onChange={(e) => setMeasure(k, e.target.value)}
              />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="account__actions">
        <button type="submit" className="btn btn--solid">
          {t.sizes.save}
        </button>
        <Link href="/trouver-ma-taille" className="link">
          {t.sizes.finder}
        </Link>
      </div>
      <Saved message={msg} />
    </form>
  );
}

// ------------------------------------------------------------------ adresses
const emptyAddress = (): Omit<Address, "id"> & { id?: string } => ({
  label: null,
  firstName: "",
  lastName: "",
  line1: "",
  line2: null,
  postalCode: "",
  city: "",
  country: "FR",
  phone: null,
  isDefault: false,
});

export function AddressesPanel({ addresses: initial }: { addresses: Address[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [draft, setDraft] = useState<(Omit<Address, "id"> & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const field = (k: keyof Omit<Address, "id" | "isDefault">, auto?: string, required = true) => (
    <div className="field">
      <label className="field__label" htmlFor={`ad-${k}`}>
        {t.addresses.fields[k]}
      </label>
      <input
        id={`ad-${k}`}
        className="field__input"
        required={required}
        autoComplete={auto}
        value={(draft?.[k] as string | null) ?? ""}
        onChange={(e) => setDraft((d) => (d ? { ...d, [k]: e.target.value || (required ? "" : null) } : d))}
      />
    </div>
  );
  return (
    <div className="stack-m">
      {addresses.length ? (
        <ul className="addresses">
          {addresses.map((a) => (
            <li key={a.id} className="address">
              <address className="t-body">
                {a.label ? <span className="t-label">{a.label}</span> : null}
                {a.firstName} {a.lastName}
                <br />
                {a.line1}
                {a.line2 ? (
                  <>
                    <br />
                    {a.line2}
                  </>
                ) : null}
                <br />
                {a.postalCode} {a.city}, {COUNTRIES.find((c) => c.code === a.country)?.name ?? a.country}
              </address>
              {a.isDefault ? <span className="badge">{t.addresses.default}</span> : null}
              <div className="address__actions">
                <button type="button" className="link link--quiet" onClick={() => setDraft(a)}>
                  {t.addresses.edit}
                </button>
                <button
                  type="button"
                  className="link link--quiet"
                  onClick={async () => {
                    const r = await send<{ addresses: Address[] }>(`/api/account/addresses?id=${encodeURIComponent(a.id)}`, "DELETE");
                    if (r.ok) setAddresses(r.data.addresses);
                  }}
                >
                  {t.addresses.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body">{t.addresses.empty}</p>
      )}
      {draft ? (
        <form
          className="form stack-m"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const r = await send<{ addresses: Address[] }>("/api/account/addresses", "PUT", draft);
            if (!r.ok) return setError(r.data.error ?? "Enregistrement impossible.");
            setAddresses(r.data.addresses);
            setDraft(null);
          }}
        >
          <h3 className="t-label">{draft.id ? t.addresses.edit : t.addresses.add}</h3>
          {field("label", undefined, false)}
          <div className="form__row">
            {field("firstName", "given-name")}
            {field("lastName", "family-name")}
          </div>
          {field("line1", "address-line1")}
          {field("line2", "address-line2", false)}
          <div className="form__row form__row--3">
            {field("postalCode", "postal-code")}
            {field("city", "address-level2")}
            <div className="field">
              <label className="field__label" htmlFor="ad-country">
                {t.addresses.fields.country}
              </label>
              <select id="ad-country" className="field__input" autoComplete="country" value={draft.country} onChange={(e) => setDraft((d) => (d ? { ...d, country: e.target.value } : d))}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {field("phone", "tel", false)}
          <label className="check t-note">
            <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft((d) => (d ? { ...d, isDefault: e.target.checked } : d))} />
            <span>{t.addresses.default}</span>
          </label>
          {error ? (
            <p className="field__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="account__actions">
            <button type="submit" className="btn btn--solid">
              {t.addresses.save}
            </button>
            <button type="button" className="link link--quiet" onClick={() => setDraft(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button type="button" className="btn" onClick={() => setDraft(emptyAddress())}>
            {t.addresses.add}
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ envies
export function WishPanel() {
  const { handles } = useWishlist();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="stack-l">
      <div className="stack">
        <p className="t-body">
          {t.wish.count(handles.length)}{" "}
          <Link href="/liste-envies" className="text-link">
            {t.wish.see}
          </Link>
        </p>
        <p className="t-note">{t.wish.shareHint}</p>
        {shareUrl ? (
          <div className="share-link">
            <input className="field__input" readOnly value={shareUrl} aria-label="Lien de partage" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn btn--outline"
              onClick={async () => {
                await navigator.clipboard?.writeText(shareUrl).catch(() => {});
                setMsg(t.wish.copied);
              }}
            >
              {t.wish.copy}
            </button>
            <button
              type="button"
              className="link link--quiet"
              onClick={async () => {
                await send("/api/account/wishlist/share", "DELETE");
                setShareUrl(null);
                setMsg(null);
              }}
            >
              {t.wish.unshare}
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const r = await send<{ url: string }>("/api/account/wishlist/share", "POST");
                if (r.ok) setShareUrl(r.data.url);
              }}
            >
              {t.wish.share}
            </button>
          </div>
        )}
        <Saved message={msg} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ profil et préférences
export function ProfilePanel({ profile, onSaved }: { profile: CustomerProfile; onSaved: (p: CustomerProfile) => void }) {
  const [p, setP] = useState(profile);
  const [msg, setMsg] = useState<string | null>(null);
  const { has, openSettings } = useConsent();
  const toggle = async (key: "marketingEmail" | "personalization" | "cercleMember", value: boolean) => {
    setP((x) => ({ ...x, [key]: value }));
    const r = await send<{ profile: CustomerProfile }>("/api/account/profile", "PATCH", { [key]: value });
    if (r.ok) {
      onSaved(r.data.profile);
      setMsg(t.profile.saved);
    }
  };
  return (
    <div className="stack-l">
      <form
        className="form stack-m"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await send<{ profile: CustomerProfile }>("/api/account/profile", "PATCH", {
            firstName: p.firstName || null,
            lastName: p.lastName || null,
            phone: p.phone || null,
            birthday: p.birthday || null,
            locale: p.locale,
            currency: p.currency,
          });
          setMsg(r.ok ? t.profile.saved : (r.data.error ?? "Enregistrement impossible."));
          if (r.ok) onSaved(r.data.profile);
        }}
      >
        <h3 className="t-label">{t.profile.identity}</h3>
        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="pf-first">
              {t.profile.firstName}
            </label>
            <input id="pf-first" className="field__input" autoComplete="given-name" value={p.firstName ?? ""} onChange={(e) => setP({ ...p, firstName: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="pf-last">
              {t.profile.lastName}
            </label>
            <input id="pf-last" className="field__input" autoComplete="family-name" value={p.lastName ?? ""} onChange={(e) => setP({ ...p, lastName: e.target.value })} />
          </div>
        </div>
        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="pf-phone">
              {t.profile.phone}
            </label>
            <input id="pf-phone" className="field__input" type="tel" autoComplete="tel" value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="pf-birthday">
              {t.profile.birthday}
            </label>
            <input id="pf-birthday" className="field__input" type="date" aria-describedby="pf-birthday-hint" value={p.birthday ?? ""} onChange={(e) => setP({ ...p, birthday: e.target.value })} />
            <p id="pf-birthday-hint" className="field__hint">
              {t.profile.birthdayHint}
            </p>
          </div>
        </div>
        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="pf-locale">
              {t.profile.locale}
            </label>
            <select id="pf-locale" className="field__input" value={p.locale} onChange={(e) => setP({ ...p, locale: e.target.value as CustomerProfile["locale"] })}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="pf-currency">
              {t.profile.currency}
            </label>
            <select id="pf-currency" className="field__input" value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value as CustomerProfile["currency"] })}>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">Livre sterling (£)</option>
              <option value="USD">Dollar américain ($)</option>
              <option value="CHF">Franc suisse (CHF)</option>
            </select>
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn--solid">
            {t.profile.save}
          </button>
        </div>
      </form>

      <div className="stack-m">
        <h3 className="t-label">{t.profile.preferences}</h3>
        {(
          [
            ["marketingEmail", t.profile.marketing, t.profile.marketingHint],
            ["personalization", t.profile.personalization, t.profile.personalizationHint],
            ["cercleMember", t.profile.cercle, t.profile.cercleHint],
          ] as const
        ).map(([key, label, hint]) => (
          <div key={key} className="pref">
            <label className="switch">
              <input type="checkbox" role="switch" checked={Boolean(p[key])} onChange={(e) => toggle(key, e.target.checked)} aria-describedby={`pref-${key}`} />
              <span className="switch__track" aria-hidden="true" />
              <span className="t-label">{label}</span>
            </label>
            <p id={`pref-${key}`} className="t-note">
              {hint}
              {key === "personalization" && p.personalization && !has("personalization") ? (
                <>
                  {" "}
                  Sur cet appareil, la personnalisation est désactivée dans vos choix de cookies :{" "}
                  <button type="button" className="text-link" onClick={openSettings}>
                    les modifier
                  </button>
                  .
                </>
              ) : null}
            </p>
          </div>
        ))}
        <Saved message={msg} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ données personnelles
export function DataPanel({ onDeleted }: { onDeleted: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { openSettings } = useConsent();
  return (
    <div className="stack-l">
      <p className="t-body">{t.data.intro}</p>
      <div className="stack">
        <a href="/api/account/export" className="btn" download>
          {t.data.export}
        </a>
        <p className="t-note">{t.data.exportHint}</p>
      </div>
      <div className="account__actions">
        <button type="button" className="link" onClick={openSettings}>
          {t.data.cookies}
        </button>
        <Link href="/confidentialite" className="link">
          {t.data.privacy}
        </Link>
      </div>
      <form
        className="form stack-m danger-zone"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const r = await send("/api/account/delete", "POST", { confirm });
          if (!r.ok) return setError(r.data.error ?? "Suppression impossible.");
          onDeleted();
        }}
      >
        <h3 className="t-label">{t.data.delete}</h3>
        <p className="t-body">{t.data.deleteHint}</p>
        <div className="field">
          <label className="field__label" htmlFor="delete-confirm">
            {t.data.deleteConfirm}
          </label>
          <input id="delete-confirm" className="field__input" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn--outline" disabled={confirm !== "SUPPRIMER"}>
            {t.data.deleteButton}
          </button>
        </div>
      </form>
    </div>
  );
}
