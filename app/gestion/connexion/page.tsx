import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/brand/Logo";
import { usingDemoPassword } from "@/lib/auth/admin";

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <div className="admin-login">
      <Logo className="admin-login__logo" />
      <h1 className="t-h1 admin-login__title">Atelier</h1>
      <p className="t-note t-center">Tableau de bord privé de la maison.</p>
      <LoginForm next={suite?.startsWith("/gestion") ? suite : "/gestion"} />
      {usingDemoPassword() ? <p className="t-note t-center">Démonstration : mot de passe « atelier-demo ». Définissez ATELIER_PASSWORD en production.</p> : null}
    </div>
  );
}
