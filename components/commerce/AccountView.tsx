"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/commerce/types";
import { formatDate, formatPrice } from "@/lib/format";
import { useWishlist } from "./WishlistProvider";
import { ContactForm } from "@/components/ui/ContactForm";

type O = Order & { statusLabel: string; trackingUrl: string | null };
type Address = { id: string; name: string; line1: string; zip: string; city: string; country: string };

const TABS = [
  { id: "commandes", label: "Commandes" },
  { id: "retours", label: "Retours" },
  { id: "adresses", label: "Adresses" },
  { id: "envies", label: "Liste d’envies" },
] as const;

export function AccountView({ shopifyAccountUrl }: { shopifyAccountUrl?: string }) {
  const [user, setUser] = useState<{ email: string } | null | undefined>(undefined);
  const [orders, setOrders] = useState<O[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("commandes");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { handles } = useWishlist();

  const load = () =>
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setUser(j.user);
        setOrders(j.orders ?? []);
      });

  useEffect(() => {
    load();
    try {
      setAddresses(JSON.parse(localStorage.getItem("awrea_addresses") ?? "[]"));
    } catch {
      /* indisponible */
    }
  }, []);

  if (shopifyAccountUrl) {
    return (
      <div className="stack-m">
        <p className="t-body">Votre compte est hébergé de façon sécurisée par notre plateforme de paiement : commandes, retours, adresses.</p>
        <a href={shopifyAccountUrl} className="btn btn--solid">
          Accéder à mon compte
        </a>
      </div>
    );
  }

  if (user === undefined) return <p className="t-note">Chargement…</p>;

  if (!user) {
    return (
      <form
        className="account-login stack-m"
        onSubmit={async (e) => {
          e.preventDefault();
          const email = new FormData(e.currentTarget).get("email");
          await fetch("/api/account/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
          load();
        }}
      >
        <h2 className="t-h3">Se connecter</h2>
        <p className="t-body">Indiquez l’adresse e-mail utilisée lors de vos commandes : nous vous envoyons un code de connexion, sans mot de passe.</p>
        <p className="notice t-note">
          Mode démonstration : la connexion est immédiate. Essayez avec camille.demo@exemple.fr pour voir des commandes. En production, la connexion passe par le compte client Shopify.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="login-email">
            E-mail
          </label>
          <input id="login-email" name="email" type="email" required autoComplete="email" className="field__input" />
        </div>
        <div>
          <button type="submit" className="btn btn--solid">
            Recevoir mon code
          </button>
        </div>
        <p className="t-note">Pas besoin de compte pour commander : il sert seulement à retrouver vos commandes et vos envies.</p>
      </form>
    );
  }

  return (
    <div className="account stack-l">
      <div className="account__head">
        <p className="t-body">
          Bonjour, <strong>{user.email}</strong>
        </p>
        <button
          type="button"
          className="link link--quiet"
          onClick={async () => {
            await fetch("/api/account/logout", { method: "POST" });
            setUser(null);
          }}
        >
          Se déconnecter
        </button>
      </div>
      <div role="tablist" aria-label="Mon compte" className="tabs">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "envies" && handles.length ? ` (${handles.length})` : ""}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "commandes" ? (
          orders.length ? (
            <ul className="orders">
              {orders.map((o) => (
                <li key={o.id} className="order">
                  <div className="order__head">
                    <h3 className="t-h4">Commande {o.number}</h3>
                    <span className="t-label t-soft">{formatDate(o.createdAt)}</span>
                  </div>
                  <p className="badge">{o.statusLabel}</p>
                  <ul className="order__lines">
                    {o.lines.map((l, i) => (
                      <li key={i} className="t-body">
                        {l.title} — taille {l.size}
                        {l.editionLabel ? ` · ${l.editionLabel}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="price">Total {formatPrice(o.total)}</p>
                  {o.trackingUrl ? (
                    <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="link">
                      Suivre le colis ({o.shipping.carrier} {o.shipping.tracking})
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-body">
              Aucune commande pour le moment. <Link href="/boutique" className="text-link">Découvrir la boutique</Link>.
            </p>
          )
        ) : null}

        {tab === "retours" ? (
          <div className="stack-m">
            <p className="t-body">Vous disposez de 14 jours après réception pour nous retourner une pièce non portée, avec son certificat. Indiquez le numéro de commande et la pièce concernée : nous vous envoyons l’étiquette de retour.</p>
            <ContactForm kind="contact" />
          </div>
        ) : null}

        {tab === "adresses" ? (
          <div className="stack-m">
            {addresses.length ? (
              <ul className="stack">
                {addresses.map((a) => (
                  <li key={a.id} className="notice t-body">
                    {a.name}, {a.line1}, {a.zip} {a.city}, {a.country}{" "}
                    <button
                      type="button"
                      className="link link--quiet"
                      onClick={() => {
                        const next = addresses.filter((x) => x.id !== a.id);
                        setAddresses(next);
                        localStorage.setItem("awrea_addresses", JSON.stringify(next));
                      }}
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-body">Aucune adresse enregistrée.</p>
            )}
            <form
              className="form stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
                const next = [...addresses, { id: String(Date.now()), name: f.name, line1: f.line1, zip: f.zip, city: f.city, country: f.country }];
                setAddresses(next);
                localStorage.setItem("awrea_addresses", JSON.stringify(next));
                e.currentTarget.reset();
              }}
            >
              <h3 className="t-label">Ajouter une adresse</h3>
              <div className="form__row">
                <div className="field">
                  <label className="field__label" htmlFor="ad-name">Nom</label>
                  <input id="ad-name" name="name" className="field__input" required autoComplete="name" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="ad-line1">Adresse</label>
                  <input id="ad-line1" name="line1" className="field__input" required autoComplete="address-line1" />
                </div>
              </div>
              <div className="form__row form__row--3">
                <div className="field">
                  <label className="field__label" htmlFor="ad-zip">Code postal</label>
                  <input id="ad-zip" name="zip" className="field__input" required autoComplete="postal-code" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="ad-city">Ville</label>
                  <input id="ad-city" name="city" className="field__input" required autoComplete="address-level2" />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="ad-country">Pays</label>
                  <input id="ad-country" name="country" className="field__input" required defaultValue="France" autoComplete="country-name" />
                </div>
              </div>
              <div>
                <button type="submit" className="btn">Enregistrer</button>
              </div>
            </form>
          </div>
        ) : null}

        {tab === "envies" ? (
          <p className="t-body">
            {handles.length} pièce{handles.length > 1 ? "s" : ""} gardée{handles.length > 1 ? "s" : ""}. <Link href="/liste-envies" className="text-link">Voir ma liste d’envies</Link>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
