"use client";
/**
 * Espace « Mon compte » : connexion sans mot de passe (e-mail, Google, Apple), puis
 * commandes, tailles, adresses, envies et alertes, profil et préférences, données personnelles.
 */
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { useWishlist } from "@/components/commerce/WishlistProvider";
import { accountCopy as t } from "@/content/fr/account";
import type { Address, CustomerProfile, WaitlistItem } from "@/lib/customers/types";
import { LoginPanel } from "./LoginPanel";
import { TermsCheckbox } from "./TermsCheckbox";
import { AddressesPanel, DataPanel, OrdersPanel, ProfilePanel, SizesPanel, WishPanel, type AccountOrder } from "./panels";

type AccountData = {
  mode: "supabase" | "demo";
  user: { id: string; email: string } | null;
  profile?: CustomerProfile | null;
  needsTerms?: boolean;
  orders?: AccountOrder[];
  addresses?: Address[];
  waitlist?: WaitlistItem[];
  wishlist?: string[];
};

type TabId = keyof typeof t.tabs;

const notices: Record<string, string> = {
  echec: "La connexion n’a pas abouti. Merci de réessayer.",
  "google-indisponible": t.login.oauthUnavailable,
  "apple-indisponible": t.login.oauthUnavailable,
};

export function AccountApp() {
  const [data, setData] = useState<AccountData | null>(null);
  const [tab, setTab] = useState<TabId>("commandes");
  const [deleted, setDeleted] = useState(false);
  const [terms, setTerms] = useState(false);
  const { handles, sync } = useWishlist();
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const j = (await fetch("/api/account", { cache: "no-store" }).then((r) => r.json())) as AccountData;
    setData(j);
    if (j.user) await sync();
  }, [sync]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("connexion");
    if (q && notices[q]) setNotice(notices[q]);
    const hash = window.location.hash.replace("#", "") as TabId;
    if (hash in t.tabs) setTab(hash);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (deleted) return <p className="t-lead">{t.data.deleted}</p>;
  if (!data) return <p className="t-note">Chargement…</p>;
  if (!data.user) return <LoginPanel demo={data.mode === "demo"} notice={notice} onSignedIn={load} />;

  if (data.needsTerms) {
    return (
      <form
        className="stack-m"
        onSubmit={async (e) => {
          e.preventDefault();
          await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptTerms: true }) });
          load();
        }}
      >
        <h2 className="t-h3">{t.terms.title}</h2>
        <p className="t-body">{t.terms.text}</p>
        <TermsCheckbox kind="cgu" checked={terms} onChange={setTerms} />
        <div>
          <button type="submit" className="btn btn--solid" disabled={!terms}>
            {t.terms.accept}
          </button>
        </div>
      </form>
    );
  }

  const profile = data.profile!;
  const updateProfile = (p: CustomerProfile) => setData((d) => (d ? { ...d, profile: p } : d));
  const tabs = (Object.keys(t.tabs) as TabId[]).map((id) => ({
    id,
    label: t.tabs[id],
    count: id === "commandes" ? data.orders?.length : id === "envies" ? handles.length + (data.waitlist?.length ?? 0) : undefined,
  }));

  return (
    <div className="account stack-l">
      <div className="account__head">
        <h2 className="t-h3">{t.hello(profile.firstName)}</h2>
        <p className="t-note t-soft">{data.user.email}</p>
        <button
          type="button"
          className="link link--quiet"
          onClick={async () => {
            await fetch("/api/account/logout", { method: "POST" });
            setData({ mode: data.mode, user: null });
          }}
        >
          {t.logout}
        </button>
      </div>
      <Tabs
        label="Mon compte"
        items={tabs}
        value={tab}
        onChange={(id) => {
          setTab(id);
          history.replaceState(null, "", `#${id}`);
        }}
      >
        {tab === "commandes" ? <OrdersPanel orders={data.orders ?? []} /> : null}
        {tab === "tailles" ? <SizesPanel profile={profile} onSaved={updateProfile} /> : null}
        {tab === "adresses" ? <AddressesPanel addresses={data.addresses ?? []} /> : null}
        {tab === "envies" ? <WishPanel waitlist={data.waitlist ?? []} /> : null}
        {tab === "profil" ? <ProfilePanel profile={profile} onSaved={updateProfile} /> : null}
        {tab === "donnees" ? <DataPanel onDeleted={() => setDeleted(true)} /> : null}
      </Tabs>
    </div>
  );
}
