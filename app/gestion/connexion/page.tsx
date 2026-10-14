import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/brand/Logo";
import { usingDemoPassword } from "@/lib/auth/admin";
import { allowedEmails } from "@/lib/auth/accounts";
import { atelierHref } from "@/lib/admin/path";

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  // retour après connexion : seulement une page de l'Atelier (chemin relatif, jamais une autre adresse)
  const next = suite && /^\/[a-z0-9/_-]*$/i.test(suite) && !suite.startsWith("//") ? atelierHref(suite) : atelierHref("/");
  const demo = usingDemoPassword();
  return (
    <div className="admin-login">
      <Logo className="admin-login__logo" />
      <h1 className="t-h1 admin-login__title">Atelier</h1>
      <p className="t-note t-center">L’espace privé de la Maison.</p>
      <LoginForm next={next} />
      {demo ? (
        <p className="t-note t-center">
          Démonstration. Adresse « {allowedEmails()[0]}  », mot de passe d’installation « atelier-demo ». En production, réglez ATELIER_ACCOUNTS et ATELIER_PASSWORD.
        </p>
      ) : null}
    </div>
  );
}
