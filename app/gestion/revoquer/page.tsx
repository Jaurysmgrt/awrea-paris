import { Logo } from "@/components/brand/Logo";
import { RevokeForm } from "@/components/admin/RevokeForm";

/** Lien « ce n'était pas moi » reçu après une connexion à l'Atelier. */
export default async function RevoquerPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="admin-login">
      <Logo className="admin-login__logo" />
      <h1 className="t-h1 admin-login__title">Ce n’était pas vous</h1>
      <p className="t-body t-center">
        Fermez toutes les sessions de l’Atelier. Votre compte sera remis à zéro : il faudra le recréer avec le mot de passe d’installation, puis changer ce mot de passe dans Vercel.
      </p>
      <RevokeForm token={t ?? ""} />
    </div>
  );
}
