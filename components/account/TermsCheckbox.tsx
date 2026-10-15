import Link from "@/components/ui/Link";

/** Case d'acceptation des conditions (création de compte : CGU ; commande : CGV). */
export function TermsCheckbox({ kind, checked, onChange, name = "terms", newTab = false }: { kind: "cgu" | "cgv"; checked: boolean; onChange: (v: boolean) => void; name?: string; newTab?: boolean }) {
  const tab = newTab ? { target: "_blank", rel: "noopener" } : {};
  return (
    <label className="check t-note">
      <input type="checkbox" name={name} required checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {kind === "cgu" ? (
        <span>
          J’accepte les{" "}
          <Link href="/cgu" className="text-link" {...tab}>
            conditions générales d’utilisation
          </Link>{" "}
          et j’ai pris connaissance de la{" "}
          <Link href="/confidentialite" className="text-link" {...tab}>
            politique de confidentialité
          </Link>
          .
        </span>
      ) : (
        <span>
          J’ai lu et j’accepte les{" "}
          <Link href="/cgv" className="text-link" {...tab}>
            conditions générales de vente
          </Link>
          , y compris les conditions de rétractation (les pièces réalisées sur mesure en sont exclues), et j’ai pris connaissance de la{" "}
          <Link href="/confidentialite" className="text-link" {...tab}>
            politique de confidentialité
          </Link>
          .
        </span>
      )}
    </label>
  );
}
