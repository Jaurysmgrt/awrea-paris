import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAdmin, usingDemoPassword } from "@/lib/auth/admin";
import { getProposals } from "@/lib/agents/perform";
import { listInbox } from "@/lib/inbox";
import { commerceMode } from "@/lib/commerce";
import { aiEnabled } from "@/lib/ai/client";

export const metadata: Metadata = { title: { absolute: "Atelier — tableau de bord | Awrea Paris" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GestionLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <div className="admin-login-shell scene" data-theme="ink">{children}</div>;
  const [proposals, inbox] = await Promise.all([getProposals(), listInbox(500)]);
  const counts = {
    "/gestion/validations": proposals.filter((p) => p.status === "pending").length,
    "/gestion/messages": inbox.filter((m) => m.status === "escalated" || m.status === "drafted" || m.status === "new").length,
  };
  return (
    <div className="admin">
      <aside className="admin__side scene" data-theme="ink">
        <Link href="/gestion" className="admin__logo" aria-label="Atelier — accueil du tableau de bord">
          <Logo />
        </Link>
        <p className="t-h3 admin__title">Atelier</p>
        <AdminNav counts={counts} />
        <div className="admin__modes">
          <span className="badge">{commerceMode === "shopify" ? "Shopify" : "Démonstration"}</span>
          <span className="badge">{aiEnabled ? "Claude actif" : "IA : démo"}</span>
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
  );
}
