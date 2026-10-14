import type { Metadata } from "next";
import { listReturns } from "@/lib/returns";
import Link from "@/components/ui/Link";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAdmin, usingDemoPassword } from "@/lib/auth/admin";
import { getProposals } from "@/lib/agents/perform";
import { listInbox } from "@/lib/inbox";
import { commerceMode } from "@/lib/commerce";
import { aiEnabled } from "@/lib/ai/client";
import { atelierBase, atelierHref, ATELIER_INTERNAL } from "@/lib/admin/path";
import { AtelierProvider } from "@/components/admin/AtelierContext";

export const metadata: Metadata = {
  title: { absolute: "Atelier | Awrea Paris" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function GestionLayout({ children }: { children: React.ReactNode }) {
  const base = atelierBase() ?? ATELIER_INTERNAL;
  if (!(await isAdmin()))
    return (
      <AtelierProvider base={base}>
        <div className="admin-login-shell scene" data-theme="ink">
          {children}
        </div>
      </AtelierProvider>
    );
  const [proposals, inbox, returns] = await Promise.all([getProposals(), listInbox(500), listReturns()]);
  const counts = {
    "/retours": returns.filter((r) => r.status === "demande" || r.status === "recu").length,
    "/validations": proposals.filter((p) => p.status === "pending").length,
    "/messages": inbox.filter((m) => m.status === "escalated" || m.status === "drafted" || m.status === "new").length,
  };
  return (
    <AtelierProvider base={base}>
    <div className="admin">
      <aside className="admin__side scene" data-theme="ink">
        <Link href={atelierHref("/")} className="admin__logo" aria-label="Accueil de l’Atelier">
          <Logo />
        </Link>
        <p className="t-h3 admin__title">Atelier</p>
        <AdminNav counts={counts} />
        <div className="admin__modes">
          <span className="badge">{commerceMode === "shopify" ? "Shopify" : "Démonstration"}</span>
          <span className="badge">{aiEnabled ? "Claude actif" : "IA : démo"}</span>
          {usingDemoPassword() ? <span className="badge">Mot de passe démo</span> : null}
        </div>
        <Link href="/" className="link link--quiet">
          Voir le site
        </Link>
      </aside>
      <main className="admin__main scene" data-theme="ivory" id="contenu">
        {children}
      </main>
    </div>
    </AtelierProvider>
  );
}
