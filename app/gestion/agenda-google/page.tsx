import { Logo } from "@/components/brand/Logo";
import { RetourGoogleAgenda } from "@/components/admin/GoogleAgenda";
import { isAdmin } from "@/lib/auth/admin";

type Params = Record<string, string | string[] | undefined>;
const un = (v: Params[string]) => (typeof v === "string" ? v.slice(0, 2048) : "");

/**
 * Adresse de retour de Google Agenda (à déclarer chez Google : ACTIVATION.md). Ouverte sans session
 * dans proxy.ts, car le cookie de l'Atelier ne suit pas une arrivée depuis Google ; elle ne fait
 * rien d'elle-même : la connexion se termine par la route de l'Atelier, session ouverte, après
 * vérification du `state` signé et de la connexion commencée dans ce navigateur.
 */
export default async function RetourGoogle({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const session = await isAdmin();
  const retour = <RetourGoogleAgenda code={un(p.code)} state={un(p.state)} erreur={un(p.error)} session={session} relance={p.relance === "1"} />;
  if (session)
    return (
      <div className="admin-page stack-l">
        <header className="admin-page__head">
          <h1 className="t-h1">Google Agenda</h1>
        </header>
        <section className="panel stack">{retour}</section>
      </div>
    );
  return (
    <div className="admin-login">
      <Logo className="admin-login__logo" />
      <h1 className="t-h1 admin-login__title">Google Agenda</h1>
      {retour}
    </div>
  );
}
